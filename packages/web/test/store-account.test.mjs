import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const acc = await import("../src/components/store-account/account-logic.ts");
const ret = await import("../src/components/store-account/return-math.ts");
const tl = await import("../src/components/store-order-timeline/timeline-model.ts");

const line = (id, name, unitPrice, quantity, extra = {}) => ({ id, productId: `p-${id}`, variantId: `v-${id}`, name, unitPrice, quantity, ...extra });
const order = (over = {}) => ({
  id: "o1",
  number: "#1040",
  placedAt: "2026-09-20T10:00:00Z",
  status: "delivered",
  payment: "paid",
  customer: { name: "Sara" },
  lines: [line("a", "Tee", 10000, 2, { fulfilled: 2 }), line("b", "Mug", 5000, 1, { fulfilled: 1 })],
  totals: { subtotal: 25000, discount: 0, shipping: 3000, tax: 0, total: 28000, itemCount: 3, savings: 0 },
  events: [{ at: "2026-09-25T10:00:00Z", kind: "delivered", label: "Delivered" }],
  ...over,
});

/* ------------------------------------------------------------------ order history */

test("order groups", () => {
  const g = acc.orderGroup;
  assert.equal(g("pending"), "active");
  assert.equal(g("shipped"), "active");
  assert.equal(g("partially-fulfilled"), "active");
  assert.equal(g("delivered"), "delivered");
  assert.equal(g("cancelled"), "cancelled");
  for (const s of ["refunded", "partially-refunded", "returned"]) assert.equal(g(s), "returns");
});

test("history filter by group and search, with counts", () => {
  const orders = [
    order({ id: "1", number: "#1", status: "delivered" }),
    order({ id: "2", number: "#2", status: "shipped", tracking: { carrier: "Bosta", number: "BST1" }, lines: [line("m", "Stoneware mug", 100, 1)] }),
    order({ id: "3", number: "#3", status: "cancelled" }),
    order({ id: "4", number: "#4", status: "refunded" }),
  ];
  assert.deepEqual(acc.filterCustomerOrders(orders, { group: "active" }).map((o) => o.id), ["2"]);
  assert.deepEqual(acc.filterCustomerOrders(orders, { group: "all" }).length, 4);
  assert.deepEqual(acc.filterCustomerOrders(orders, { query: "stoneware" }).map((o) => o.id), ["2"]);
  assert.deepEqual(acc.filterCustomerOrders(orders, { query: "bst1", group: "active" }).map((o) => o.id), ["2"]);
  assert.deepEqual(acc.filterCustomerOrders(orders, { query: "stoneware", group: "delivered" }), []);
  assert.deepEqual(acc.orderGroupCounts(orders), { all: 4, active: 1, delivered: 1, returns: 1, cancelled: 1 });
  assert.deepEqual(acc.newestOrdersFirst([order({ id: "old", placedAt: "2026-01-01" }), order({ id: "new", placedAt: "2026-09-01" })]).map((o) => o.id), ["new", "old"]);
});

/* ------------------------------------------------------------------ reorder */

const products = [
  { id: "p-a", name: "Tee", images: [], options: [], variants: [{ id: "v-a", options: {}, price: 11000, stock: 1 }] },
  { id: "p-b", name: "Mug", images: [], options: [], variants: [{ id: "v-b", options: {}, price: 5000, stock: 0 }] },
  { id: "p-c", name: "Cap", images: [], options: [], variants: [{ id: "v-c", options: {}, price: 2000 }], status: "archived" },
  { id: "p-d", name: "Bag", images: [], options: [], variants: [{ id: "v-d", options: {}, price: 900, stock: 0, allowBackorder: true }] },
];

test("reorder adds what is available, reduces to stock and skips the rest", () => {
  const o = order({ lines: [line("a", "Tee", 10000, 2), line("b", "Mug", 5000, 1), line("c", "Cap", 2000, 1), line("x", "Gone", 100, 1, { productId: "zz", variantId: "zz" }), line("d", "Bag", 900, 3)] });
  const plan = acc.reorderPlan(o, products);
  assert.deepEqual(plan.add.map((l) => [l.lineId, l.quantity, l.unitPrice, l.priceChanged]), [["a", 1, 11000, true], ["d", 3, 900, false]]);
  assert.deepEqual(plan.reduced, [{ lineId: "a", wanted: 2, got: 1 }]);
  assert.deepEqual(plan.skipped, [
    { lineId: "b", reason: "out" },
    { lineId: "c", reason: "missing" },
    { lineId: "x", reason: "missing" },
  ]);
});

/* ------------------------------------------------------------------ wishlist */

test("wishlist entries: availability, price drop, move to cart and notify", () => {
  const items = [
    { id: "1", productId: "p-a", variantId: "v-a", addedAt: "2026-09-01", priceWhenSaved: 12000 },
    { id: "2", productId: "p-b", variantId: "v-b", addedAt: "2026-09-02", notify: true },
    { id: "3", productId: "zz", variantId: "zz", addedAt: "2026-09-03" },
    { id: "4", productId: "p-d", variantId: "v-d", addedAt: "2026-09-04" },
  ];
  const [tee, mug, gone, bag] = acc.wishlistEntries(items, products);
  assert.deepEqual([tee.availability, tee.priceDrop, tee.canMoveToCart, tee.canNotify, tee.stock], ["low", 1000, true, false, 1]);
  assert.deepEqual([mug.availability, mug.canMoveToCart, mug.canNotify], ["out", false, true]);
  assert.deepEqual([gone.availability, gone.canMoveToCart, gone.canNotify], ["unavailable", false, false]);
  assert.deepEqual([bag.availability, bag.canMoveToCart], ["in-stock", true]);
  assert.equal(bag.stock, undefined);
});

test("wishlist: toggle notify, remove, and who to email when stock returns", () => {
  const items = [{ id: "1", productId: "p-b", variantId: "v-b", addedAt: "x" }, { id: "2", productId: "p-a", variantId: "v-a", addedAt: "x", notify: true }];
  assert.equal(acc.toggleNotify(items, "1")[0].notify, true);
  assert.equal(acc.toggleNotify(acc.toggleNotify(items, "1"), "1")[0].notify, false);
  assert.deepEqual(acc.removeWishlistItem(items, "1").map((i) => i.id), ["2"]);
  const restocked = products.map((p) => (p.id === "p-b" ? { ...p, variants: [{ ...p.variants[0], stock: 9 }] } : p));
  assert.deepEqual(acc.backInStock(acc.toggleNotify(items, "1"), restocked).map((i) => i.id), ["1", "2"]);
  assert.deepEqual(acc.backInStock(items, restocked).map((i) => i.id), ["2"]);
  assert.deepEqual(acc.backInStock(items, products.map((p) => ({ ...p, variants: p.variants.map((v) => ({ ...v, stock: 0 })) }))), []);
});

/* ------------------------------------------------------------------ recently viewed */

test("recently viewed keeps the newest first, no duplicates, capped", () => {
  assert.deepEqual(acc.pushRecentlyViewed(["a", "b", "c"], "b"), ["b", "a", "c"]);
  assert.deepEqual(acc.pushRecentlyViewed(["a", "b", "c"], "z", 3), ["z", "a", "b"]);
  assert.deepEqual(acc.pushRecentlyViewed([], "a", 0), []);
  assert.deepEqual(acc.removeRecent(["a", "b"], "a"), ["b"]);
});

/* ------------------------------------------------------------------ address book */

const home = { id: "home", name: "Sara", phone: "+20 100 123 4567", line1: "12 Palm St", city: "Cairo", country: "EG", isDefault: true };
const work = { id: "work", name: "Sara", phone: "+20 100 123 4567", line1: "45 Tahrir", city: "Giza", country: "EG" };

test("address validation reports required and malformed fields", () => {
  assert.deepEqual(acc.validateAddress(home), {});
  assert.deepEqual(acc.validateAddress({}), { name: "required", line1: "required", city: "required", country: "required", phone: "required" });
  assert.equal(acc.validateAddress({ ...home, phone: "12" }).phone, "invalid");
  assert.equal(acc.validateAddress({ ...home, postalCode: "1176" }).postalCode, "invalid");
  assert.equal(acc.validateAddress({ ...home, postalCode: "11765" }).postalCode, undefined);
  assert.equal(acc.validateAddress({ ...home, country: "AE", postalCode: "x" }).postalCode, undefined);
});

test("the address book keeps exactly one default", () => {
  const first = acc.upsertAddress([], { name: "A", line1: "1", city: "c", country: "EG", phone: "0100000000" }, () => "a1");
  assert.deepEqual(first.map((a) => [a.id, a.isDefault]), [["a1", true]]);
  const two = acc.upsertAddress([home], work);
  assert.deepEqual(two.map((a) => [a.id, a.isDefault]), [["home", true], ["work", false]]);
  const swapped = acc.upsertAddress(two, { ...work, isDefault: true });
  assert.deepEqual(swapped.map((a) => [a.id, a.isDefault]), [["home", false], ["work", true]]);
  const edited = acc.upsertAddress(swapped, { ...work, city: "Dokki", isDefault: true });
  assert.equal(edited.length, 2);
  assert.equal(edited[1].city, "Dokki");
  assert.deepEqual(acc.setDefaultAddress(two, "work").map((a) => a.isDefault), [false, true]);
});

test("deleting the default hands the default to the first address left", () => {
  const book = [home, work, { ...work, id: "third" }];
  assert.deepEqual(acc.removeAddress(book, "home").map((a) => [a.id, a.isDefault]), [["work", true], ["third", false]]);
  assert.deepEqual(acc.removeAddress(book, "work").map((a) => a.id), ["home", "third"]);
  assert.deepEqual(acc.removeAddress([home], "home"), []);
  assert.deepEqual(acc.addressLines({ ...home, line2: "Floor 3", region: "Nasr City", postalCode: "11765" }), ["12 Palm St", "Floor 3", "Nasr City, Cairo", "11765"]);
});

/* ------------------------------------------------------------------ returns */

test("returnable lines subtract open requests but not closed ones", () => {
  const requests = [
    { id: "r1", orderId: "o1", status: "requested", lines: [{ lineId: "a", quantity: 1 }] },
    { id: "r2", orderId: "o1", status: "rejected", lines: [{ lineId: "a", quantity: 2 }] },
    { id: "r3", orderId: "other", status: "approved", lines: [{ lineId: "a", quantity: 2 }] },
  ];
  assert.deepEqual(ret.inRequestQuantities(requests, "o1"), { a: 1 });
  assert.deepEqual(ret.returnableLines(order(), requests).map((r) => [r.line.id, r.returnable, r.inRequest]), [["a", 1, 1], ["b", 1, 0]]);
});

test("a return that is refused never gets a price in", () => {
  const o = order();
  const ok = ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "changed-mind", refundMethod: "original" });
  assert.equal(ok.ok, true);
  assert.equal(ok.refundAmount, 10000);
  assert.equal(ok.units, 1);
  assert.deepEqual(ret.planReturn(o, [], { picks: [], reason: "changed-mind", refundMethod: "original" }).issues, [{ code: "empty" }]);
  assert.deepEqual(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 3 }], reason: "changed-mind", refundMethod: "original" }).issues, [{ code: "line-over", lineId: "a", max: 2 }]);
  assert.deepEqual(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], refundMethod: "original" }).issues, [{ code: "reason" }]);
  assert.deepEqual(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "other", refundMethod: "original" }).issues, [{ code: "note" }]);
  assert.deepEqual(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "defective", refundMethod: "original" }).issues, [{ code: "photos" }]);
  assert.equal(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "defective", photos: 1, refundMethod: "original" }).ok, true);
  assert.deepEqual(ret.planReturn(o, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "changed-mind", windowOpen: false, refundMethod: "original" }).issues, [{ code: "window" }]);
});

test("refund methods depend on how it was paid", () => {
  assert.deepEqual(ret.refundMethodsFor({ payment: "paid" }), ["original", "store-credit"]);
  assert.deepEqual(ret.refundMethodsFor({ payment: "cod" }), ["store-credit", "bank"]);
  const cod = order({ payment: "cod" });
  assert.deepEqual(ret.planReturn(cod, [], { picks: [{ lineId: "a", quantity: 1 }], reason: "changed-mind", refundMethod: "original" }).issues, [{ code: "method" }]);
});

test("return estimate shares the discount and never refunds shipping", () => {
  const o = order({ totals: { subtotal: 25000, discount: 1500, shipping: 3000, tax: 0, total: 26500, itemCount: 3, savings: 0 } });
  assert.equal(ret.refundEstimate(o, [{ lineId: "a", quantity: 2 }]), 18800);
  assert.equal(ret.refundEstimate(o, [{ lineId: "a", quantity: 1 }, { lineId: "b", quantity: 1 }]), 9400 + 4700);
  assert.equal(ret.refundEstimate(o, [{ lineId: "nope", quantity: 1 }]), 0);
});

test("the return window opens at delivery and closes after the allowed days", () => {
  const now = Date.parse("2026-09-30T12:00:00Z");
  assert.equal(ret.deliveredAt(order()), "2026-09-25T10:00:00Z");
  assert.equal(ret.deliveredAt(order({ events: [] })), undefined);
  const w = ret.returnWindow("2026-09-25T10:00:00Z", 14, now);
  assert.equal(w.open, true);
  assert.equal(w.daysLeft, 9);
  assert.equal(ret.returnWindow("2026-09-01T10:00:00Z", 14, now).open, false);
  assert.equal(ret.returnWindow("2026-09-01T10:00:00Z", 14, now).daysLeft, 0);
  assert.equal(ret.returnWindow(undefined, 14, now).open, false);
});

test("return status flow", () => {
  assert.deepEqual(ret.rmaSteps("approved").map((s) => s.state), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(ret.rmaSteps("refunded").map((s) => s.state), ["done", "done", "done", "done", "done"]);
  assert.deepEqual(ret.rmaSteps("rejected", "requested").map((s) => s.state), ["done", "skipped", "skipped", "skipped", "skipped"]);
  assert.deepEqual(ret.rmaSteps("cancelled", "approved").map((s) => s.state), ["done", "done", "skipped", "skipped", "skipped"]);
  assert.deepEqual(ret.nextRmaStatuses("requested"), ["approved", "rejected"]);
  assert.deepEqual(ret.nextRmaStatuses("refunded"), []);
  assert.equal(ret.rmaIsOpen("received"), true);
  assert.equal(ret.rmaIsOpen("rejected"), false);
  assert.equal(ret.reasonNeedsPhotos("defective"), true);
  assert.equal(ret.reasonNeedsPhotos("changed-mind"), false);
});

/* ------------------------------------------------------------------ order status timeline */

test("tracking steps follow the status", () => {
  const states = (status, extra = {}) => tl.trackingModel({ status, ...extra }).steps.map((s) => s.state);
  assert.deepEqual(states("pending"), ["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states("paid"), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states("processing"), ["done", "current", "upcoming", "upcoming", "upcoming"]);
  assert.deepEqual(states("shipped"), ["done", "done", "current", "upcoming", "upcoming"]);
  assert.deepEqual(states("out-for-delivery"), ["done", "done", "done", "current", "upcoming"]);
  assert.deepEqual(states("delivered"), ["done", "done", "done", "done", "done"]);
  assert.equal(tl.trackingModel({ status: "partially-fulfilled" }).partial, true);
  assert.equal(tl.trackingModel({ status: "shipped" }).partial, false);
});

test("cash on delivery is confirmed without a payment step", () => {
  assert.deepEqual(tl.trackingModel({ status: "processing", payment: "cod" }).steps.map((s) => s.state), ["done", "current", "upcoming", "upcoming", "upcoming"]);
});

test("cancelled orders skip what never happened; refunded ones keep how far they got", () => {
  const cancelled = tl.trackingModel({ status: "cancelled", events: [{ at: "t", kind: "placed", label: "" }, { at: "t2", kind: "cancelled", label: "" }] });
  assert.deepEqual(cancelled.steps.map((s) => s.state), ["done", "skipped", "skipped", "skipped", "skipped"]);
  assert.equal(cancelled.terminal.kind, "cancelled");
  assert.equal(cancelled.terminal.at, "t2");
  const paidThenCancelled = tl.trackingModel({ status: "cancelled", events: [{ at: "t", kind: "paid", label: "" }] });
  assert.deepEqual(paidThenCancelled.steps.map((s) => s.state), ["done", "done", "skipped", "skipped", "skipped"]);
  const refunded = tl.trackingModel({ status: "refunded", events: [{ at: "t", kind: "delivered", label: "" }, { at: "t2", kind: "refund", label: "" }] });
  assert.deepEqual(refunded.steps.map((s) => s.state), ["done", "done", "done", "done", "done"]);
  assert.equal(refunded.terminal.kind, "refunded");
  const shippedRefund = tl.trackingModel({ status: "returned", hasTracking: true });
  assert.equal(shippedRefund.reached, 2);
});

test("steps carry the time of their event, the earliest one, and the order's own time for placed", () => {
  const model = tl.trackingModel({
    status: "shipped",
    placedAt: "2026-09-01T10:00:00Z",
    events: [
      { at: "2026-09-02T10:00:00Z", kind: "fulfilled", label: "Part" },
      { at: "2026-09-03T10:00:00Z", kind: "shipped", label: "Rest" },
      { at: "2026-09-01T10:01:00Z", kind: "paid", label: "" },
    ],
  });
  assert.equal(model.steps[0].at, "2026-09-01T10:00:00Z");
  assert.equal(model.steps[1].at, "2026-09-01T10:01:00Z");
  assert.equal(model.steps[2].at, "2026-09-02T10:00:00Z");
  assert.equal(model.steps[3].at, undefined);
});

test("progress percent", () => {
  assert.equal(tl.trackingModel({ status: "pending" }).percent, 10);
  assert.equal(tl.trackingModel({ status: "shipped" }).percent, 50);
  assert.equal(tl.trackingModel({ status: "delivered" }).percent, 100);
});

test("events sort newest first and tracking links come from the url or a template", () => {
  const events = [{ at: "2026-09-01", kind: "a" }, { at: "2026-09-03", kind: "b" }, { at: "2026-09-03", kind: "c" }, { at: "2026-09-02", kind: "d" }];
  assert.deepEqual(tl.sortEventsNewestFirst(events).map((e) => e.kind), ["c", "b", "d", "a"]);
  assert.equal(events[0].kind, "a");
  assert.equal(tl.trackingUrl({ number: "A 1", url: "https://x.test/t" }), "https://x.test/t");
  assert.equal(tl.trackingUrl({ number: "A 1" }, "https://bosta.co/t/{number}"), "https://bosta.co/t/A%201");
  assert.equal(tl.trackingUrl({ number: "A" }), undefined);
  assert.equal(tl.trackingUrl(undefined, "x"), undefined);
  assert.deepEqual(["refunded", "fulfilled", "paid", "note", "weird", "cancel"].map(tl.activityKind), ["refund", "shipment", "payment", "note", "other", "cancel"]);
});
