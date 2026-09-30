import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const list = await import("../src/components/store-orders-admin/orders-list-logic.ts");
const ab = await import("../src/components/store-orders-admin/abandoned-logic.ts");

const line = (id, name, quantity, extra = {}) => ({ id, productId: id, variantId: `${id}-v`, name, unitPrice: 1000, quantity, ...extra });
const order = (number, status, payment, customer, lines, extra = {}) => ({
  id: `o${number}`,
  number: `#${number}`,
  placedAt: `2026-09-0${number % 9}T10:00:00Z`,
  status,
  payment,
  customer,
  lines,
  totals: { subtotal: 2000, discount: 0, shipping: 0, tax: 0, total: 2000, itemCount: 2, savings: 0 },
  ...extra,
});
const orders = [
  order(1, "paid", "paid", { name: "Sara Ahmed", email: "sara@example.com" }, [line("tee", "Cotton tee", 2)]),
  order(2, "partially-fulfilled", "paid", { name: "أحمد علي" }, [line("mug", "Mug", 2, { fulfilled: 1 })]),
  order(3, "cancelled", "refunded", { name: "Omar" }, [line("bag", "Bag", 1)]),
  order(4, "delivered", "paid", { name: "Mona" }, [line("cap", "Cap", 1, { fulfilled: 1 })], { tracking: { carrier: "Bosta", number: "BST880124" } }),
  order(5, "pending", "pending", { name: "Laila" }, [line("tee", "Cotton tee", 1)]),
];

test("fulfilment column: cancelled and refunded orders never read as to-ship", () => {
  assert.deepEqual(orders.map(list.orderFulfilment), ["unfulfilled", "partial", "none", "fulfilled", "unfulfilled"]);
});

test("search matches number, customer, product and tracking, folding Arabic letters", () => {
  const find = (query) => list.filterOrders(orders, { query }).map((o) => o.number);
  assert.deepEqual(find("#1"), ["#1"]);
  assert.deepEqual(find("sara"), ["#1"]);
  assert.deepEqual(find("cotton"), ["#1", "#5"]);
  assert.deepEqual(find("BST880124"), ["#4"]);
  assert.deepEqual(find("cotton tee sara"), ["#1"]);
  assert.deepEqual(find("احمد"), ["#2"]);
  assert.deepEqual(find(""), orders.map((o) => o.number));
  assert.deepEqual(find("nobody"), []);
});

test("filters combine across columns and OR within one", () => {
  const f = (filters) => list.filterOrders(orders, { filters }).map((o) => o.number);
  assert.deepEqual(f({ status: ["paid", "delivered"] }), ["#1", "#4"]);
  assert.deepEqual(f({ payment: ["paid"], fulfilment: ["unfulfilled", "partial"] }), ["#1", "#2"]);
  assert.deepEqual(f({ status: [] }), orders.map((o) => o.number));
  assert.deepEqual(f({ status: ["paid"], payment: ["refunded"] }), []);
});

test("saved views: match, counts, upsert and remove", () => {
  const views = [
    { id: "all", name: "All", filters: {} },
    { id: "toship", name: "To ship", filters: { fulfilment: ["unfulfilled", "partial"], payment: ["paid"] } },
  ];
  assert.deepEqual(list.viewCounts(orders, views), { all: 5, toship: 2 });
  assert.equal(list.activeView(views, { filters: { payment: ["paid"], fulfilment: ["partial", "unfulfilled"] } })?.id, "toship");
  assert.equal(list.activeView(views, { filters: {} })?.id, "all");
  assert.equal(list.activeView(views, { filters: { status: ["paid"] } }), undefined);
  assert.equal(list.sameFilters({ a: [] }, {}), true);

  const added = list.upsertView(views, { id: "v3", name: "  Refunds  ", filters: { payment: ["refunded"], status: [] } });
  assert.equal(added.length, 3);
  assert.equal(added[2].name, "Refunds");
  assert.deepEqual(added[2].filters, { payment: ["refunded"] });
  const renamed = list.upsertView(added, { id: "v3", name: "Money back", filters: { payment: ["refunded"] } });
  assert.equal(renamed.length, 3);
  assert.equal(renamed[2].name, "Money back");
  assert.equal(list.upsertView(views, { id: "x", name: "   ", filters: {} }).length, 2);
  assert.deepEqual(list.removeView(renamed, "v3").map((v) => v.id), ["all", "toship"]);
});

test("money formats in whole minor units without float drift", () => {
  assert.equal(list.storeFormatMinor(12345), "123.45");
  assert.equal(list.storeFormatMinor(5), "0.05");
  assert.equal(list.storeFormatMinor(-250), "-2.50");
  assert.equal(list.storeFormatMinor(1999, 0), "1999");
  assert.equal(list.storeFormatMinor(1234, 3), "1.234");
});

test("csv cells are quoted when needed and formulas are defused", () => {
  assert.equal(list.csvCell("plain"), "plain");
  assert.equal(list.csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(list.csvCell("=HYPERLINK(1)"), "'=HYPERLINK(1)");
  assert.equal(list.csvCell("+1 555"), "'+1 555");
  assert.equal(list.csvCell(42), "42");
  assert.equal(list.csvCell(-5), "-5");
  assert.equal(list.csvCell(undefined), "");
  assert.equal(list.csvCell("two\nlines"), '"two\nlines"');
});

test("orders export to csv with a header and one row each", () => {
  const csv = list.ordersToCsv([orders[3], orders[0]], { currency: "EGP" });
  const rows = csv.split("\r\n");
  assert.equal(rows.length, 3);
  assert.equal(rows[0], list.ORDER_CSV_COLUMNS.join(","));
  assert.equal(rows[1], "#4,2026-09-04,Mona,,delivered,paid,fulfilled,2,20.00,0.00,0.00,0.00,20.00,EGP,BST880124");
  assert.ok(rows[2].startsWith("#1,2026-09-01,Sara Ahmed,sara@example.com,paid,paid,unfulfilled"));
  const risky = list.ordersToCsv([order(6, "paid", "paid", { name: "=cmd|calc" }, [line("x", "X", 1)])]);
  assert.ok(risky.includes("'=cmd|calc"));
});

/* ------------------------------------------------------------------ abandoned carts */

const NOW = Date.parse("2026-09-30T12:00:00Z");
const ago = (minutes) => new Date(NOW - minutes * 60_000).toISOString();
const cart = (over = {}) => ({
  id: "c1",
  customer: { name: "Sara", email: "sara@example.com" },
  lines: [line("tee", "Tee", 2), line("mug", "Mug", 1, { savedForLater: true })],
  lastActivityAt: ago(180),
  stage: "checkout",
  emailsSent: 0,
  ...over,
});

test("cart value ignores saved-for-later lines", () => {
  assert.equal(ab.cartValue(cart()), 2000);
  assert.equal(ab.cartItemCount(cart()), 2);
});

test("idle time is whole minutes and never negative", () => {
  assert.equal(ab.cartIdleMinutes(cart({ lastActivityAt: ago(90) }), NOW), 90);
  assert.equal(ab.cartIdleMinutes(cart({ lastActivityAt: new Date(NOW + 5000).toISOString() }), NOW), 0);
});

test("recovery status", () => {
  assert.equal(ab.recoveryStatus(cart(), NOW), "new");
  assert.equal(ab.recoveryStatus(cart({ emailsSent: 1 }), NOW), "emailed");
  assert.equal(ab.recoveryStatus(cart({ customer: null }), NOW), "no-email");
  assert.equal(ab.recoveryStatus(cart({ customer: { name: "Guest" } }), NOW), "no-email");
  assert.equal(ab.recoveryStatus(cart({ recoveredOrderId: "o9" }), NOW), "recovered");
  assert.equal(ab.recoveryStatus(cart({ lastActivityAt: ago(15 * 24 * 60) }), NOW), "lost");
  // recovered beats lost
  assert.equal(ab.recoveryStatus(cart({ lastActivityAt: ago(20 * 24 * 60), recoveredOrderId: "o9" }), NOW), "recovered");
});

test("a recovery email waits for the idle time, the cooldown and the limit", () => {
  assert.deepEqual(ab.canSendRecovery(cart(), NOW), { ok: true });
  assert.deepEqual(ab.canSendRecovery(cart({ lastActivityAt: ago(20) }), NOW), { ok: false, reason: "too-soon", waitMinutes: 40 });
  assert.deepEqual(ab.canSendRecovery(cart({ emailsSent: 1, lastEmailAt: ago(600) }), NOW), { ok: false, reason: "cooldown", waitMinutes: 840 });
  assert.deepEqual(ab.canSendRecovery(cart({ emailsSent: 1, lastEmailAt: ago(24 * 60) }), NOW), { ok: true });
  assert.deepEqual(ab.canSendRecovery(cart({ emailsSent: 3, lastEmailAt: ago(5000) }), NOW), { ok: false, reason: "limit" });
  assert.deepEqual(ab.canSendRecovery(cart({ customer: null }), NOW), { ok: false, reason: "no-email" });
  assert.deepEqual(ab.canSendRecovery(cart({ recoveredOrderId: "o" }), NOW), { ok: false, reason: "recovered" });
  assert.deepEqual(ab.canSendRecovery(cart({ emailsSent: 1, lastEmailAt: ago(600) }), NOW, { cooldownHours: 6 }), { ok: true });
});

test("recovery stats: value at risk, recovered value and the rate in basis points", () => {
  const carts = [
    cart({ id: "a" }),
    cart({ id: "b", emailsSent: 1 }),
    cart({ id: "c", emailsSent: 2, recoveredOrderId: "o1" }),
    cart({ id: "d", lastActivityAt: ago(30 * 24 * 60) }),
    cart({ id: "e", customer: null }),
  ];
  const s = ab.recoveryStats(carts, NOW);
  assert.equal(s.carts, 5);
  assert.equal(s.atRisk, 6000);
  assert.equal(s.recovered, 1);
  assert.equal(s.recoveredValue, 2000);
  assert.equal(s.lost, 1);
  // 1 recovered of 2 that were emailed or recovered
  assert.equal(s.rateBps, 5000);
  assert.equal(ab.recoveryStats([], NOW).rateBps, 0);
});

test("recovery discount rounds down and can be capped", () => {
  assert.equal(ab.recoveryDiscount(19999, 10), 1999);
  assert.equal(ab.recoveryDiscount(19999, 10, 1500), 1500);
  assert.equal(ab.recoveryDiscount(1000, 150), 1000);
  assert.equal(ab.recoveryDiscount(-5, 10), 0);
});
