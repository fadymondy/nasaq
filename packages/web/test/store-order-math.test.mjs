import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";

const m = await import("../src/components/store-orders-admin/order-math.ts");

const line = (id, unitPrice, quantity, extra = {}) => ({ id, productId: `p-${id}`, variantId: `v-${id}`, name: id.toUpperCase(), unitPrice, quantity, ...extra });
const totals = (subtotal, discount, shipping, tax, total) => ({ subtotal, discount, shipping, tax, total, itemCount: 0, savings: 0 });
const order = (over = {}) => ({
  id: "o1",
  number: "#1",
  placedAt: "2026-09-01T10:00:00Z",
  status: "paid",
  payment: "paid",
  customer: { name: "Sara" },
  lines: [line("a", 10000, 2), line("b", 5000, 1)],
  totals: totals(25000, 1500, 3000, 0, 26500),
  ...over,
});

test("per line: outstanding, refundable and returnable units", () => {
  const l = line("a", 100, 4, { fulfilled: 3, refunded: 1, returned: 0 });
  assert.equal(m.lineRefundable(l), 3);
  // refund ate the one unshipped unit first
  assert.equal(m.lineCancelled(l), 1);
  assert.equal(m.lineOutstanding(l), 0);
  // the refunded unit was an unshipped one, so all three shipped units can still come back
  assert.equal(m.lineReturnable(l), 3);
  assert.equal(m.lineReturnable(l, 1), 2);
  const returned = line("a", 100, 4, { fulfilled: 4, refunded: 4, returned: 4 });
  assert.equal(m.lineCancelled(returned), 0);
  assert.equal(m.lineReturnable(returned), 0);
});

test("counts never go negative or above the quantity", () => {
  const l = line("a", 100, 2, { fulfilled: 9, refunded: -3 });
  assert.equal(m.lineFulfilled(l), 2);
  assert.equal(m.lineRefunded(l), 0);
  assert.equal(m.lineOutstanding(l), 0);
});

test("allocate hands out the largest remainders and always sums to the total", () => {
  assert.deepEqual(m.allocate(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(m.allocate(10, [3, 1]), [8, 2]);
  assert.deepEqual(m.allocate(0, [3, 1]), [0, 0]);
  assert.deepEqual(m.allocate(5, []), []);
  for (const total of [1, 7, 999, 12345]) assert.equal(m.allocate(total, [17, 5, 3, 91]).reduce((s, n) => s + n, 0), total);
});

test("line paid values share the discount and add up with shipping to the order total", () => {
  const o = order();
  assert.deepEqual(m.linePaidValues(o), [18800, 4700]);
  assert.equal(m.linePaidValues(o).reduce((s, n) => s + n, 0) + o.totals.shipping, o.totals.total);
});

test("exclusive tax is shared out by line value", () => {
  const o = order({ lines: [line("a", 10000, 1), line("b", 5000, 1)], totals: totals(15000, 0, 0, 2100, 17100) });
  assert.deepEqual(m.linePaidValues(o), [11400, 5700]);
});

test("units value rounds cumulatively so every unit adds back to the line", () => {
  assert.deepEqual([m.unitsValue(1000, 3, 0, 1), m.unitsValue(1000, 3, 1, 1), m.unitsValue(1000, 3, 2, 1)], [333, 334, 333]);
  assert.equal(m.unitsValue(1000, 3, 0, 3), 1000);
  assert.equal(m.unitsValue(1000, 3, 2, 5), 333);
  assert.equal(m.unitsValue(1000, 0, 0, 1), 0);
});

test("refund by lines prices the units and can add shipping", () => {
  const o = order();
  const plan = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "a", quantity: 1 }] });
  assert.equal(plan.ok, true);
  assert.equal(plan.amount, 9400);
  const withShipping = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "a", quantity: 1 }], includeShipping: true });
  assert.equal(withShipping.amount, 12400);
  assert.equal(withShipping.shipping, true);
});

test("refunding every unit and the shipping returns exactly what was paid", () => {
  const o = order();
  const plan = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "a", quantity: 2 }, { lineId: "b", quantity: 1 }], includeShipping: true });
  assert.equal(plan.ok, true);
  assert.equal(plan.amount, o.totals.total);
});

test("a second partial refund on the same line continues where the first stopped", () => {
  const o = order({ lines: [line("a", 1000, 3, { refunded: 1 })], totals: totals(3000, 2000, 0, 0, 1000) });
  const plan = m.planRefund(o, [{ amount: 333, picks: [{ lineId: "a", quantity: 1 }] }], { mode: "lines", picks: [{ lineId: "a", quantity: 2 }] });
  assert.equal(plan.ok, true);
  assert.equal(plan.amount, 667);
});

test("refund is refused above what is left on a line or on the order", () => {
  const o = order({ lines: [line("a", 10000, 2, { refunded: 1 }), line("b", 5000, 1)] });
  const over = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "a", quantity: 2 }] });
  assert.equal(over.ok, false);
  assert.deepEqual(over.issues, [{ code: "line-over", lineId: "a", max: 1 }]);
  const nothing = m.planRefund(o, [], { mode: "lines", picks: [] });
  assert.deepEqual(nothing.issues, [{ code: "empty" }]);
  const unknown = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "zzz", quantity: 1 }] });
  assert.deepEqual(unknown.issues, [{ code: "unknown-line", lineId: "zzz" }]);
});

test("refund by amount is capped at what is left after earlier refunds", () => {
  const o = order();
  assert.equal(m.refundRemaining(o, [{ amount: 20000 }]), 6500);
  assert.equal(m.planRefund(o, [{ amount: 20000 }], { mode: "amount", amount: 6500 }).ok, true);
  const over = m.planRefund(o, [{ amount: 20000 }], { mode: "amount", amount: 6501 });
  assert.deepEqual(over.issues, [{ code: "amount-over", max: 6500 }]);
  assert.deepEqual(m.planRefund(o, [], { mode: "amount", amount: 0 }).issues, [{ code: "amount-invalid" }]);
  assert.deepEqual(m.planRefund(o, [], { mode: "amount", amount: 10.5 }).issues, [{ code: "amount-invalid" }]);
});

test("lines refund that no longer fits the money left is refused", () => {
  const o = order();
  const plan = m.planRefund(o, [{ amount: 20000 }], { mode: "lines", picks: [{ lineId: "a", quantity: 2 }] });
  assert.equal(plan.ok, false);
  assert.deepEqual(plan.issues, [{ code: "amount-over", max: 6500 }]);
});

test("shipping can be refunded once, and not when there was none", () => {
  const o = order();
  const again = m.planRefund(o, [{ amount: 3000, shipping: true }], { mode: "lines", picks: [{ lineId: "b", quantity: 1 }], includeShipping: true });
  assert.deepEqual(again.issues, [{ code: "shipping-done" }]);
  const free = order({ totals: totals(25000, 1500, 0, 0, 23500) });
  assert.deepEqual(m.planRefund(free, [], { mode: "lines", picks: [], includeShipping: true }).issues, [{ code: "shipping-done" }]);
});

test("an unpaid order has nothing to refund", () => {
  for (const payment of ["pending", "failed", "authorized"]) {
    const o = order({ payment });
    assert.deepEqual(m.planRefund(o, [], { mode: "amount", amount: 100 }).issues, [{ code: "unpaid" }]);
    assert.equal(m.canRefund(o, []), false);
  }
  assert.equal(m.canRefund(order(), []), true);
  assert.equal(m.canRefund(order(), [{ amount: 26500 }]), false);
});

test("restock lists units per variant only when asked", () => {
  const o = order();
  const picks = [{ lineId: "a", quantity: 1 }, { lineId: "b", quantity: 1 }];
  assert.deepEqual(m.planRefund(o, [], { mode: "lines", picks, restock: true }).restock, [
    { variantId: "v-a", productId: "p-a", quantity: 1 },
    { variantId: "v-b", productId: "p-b", quantity: 1 },
  ]);
  assert.deepEqual(m.planRefund(o, [], { mode: "lines", picks, restock: false }).restock, []);
  const twice = m.restockFor([line("a", 1, 2), line("c", 1, 2, { variantId: "v-a", productId: "p-a" })], [{ lineId: "a", quantity: 1 }, { lineId: "c", quantity: 2 }]);
  assert.deepEqual(twice, [{ variantId: "v-a", productId: "p-a", quantity: 3 }]);
});

test("payment status after refunds and the payment summary", () => {
  assert.equal(m.paymentAfterRefund("paid", 1000, 0), "paid");
  assert.equal(m.paymentAfterRefund("paid", 1000, 400), "partially-refunded");
  assert.equal(m.paymentAfterRefund("paid", 1000, 1000), "refunded");
  const s = m.paymentSummary(order(), [{ amount: 9400 }]);
  assert.deepEqual(s, { total: 26500, paid: 26500, refunded: 9400, net: 17100, due: 0 });
  assert.deepEqual(m.paymentSummary(order({ payment: "pending" }), []), { total: 26500, paid: 0, refunded: 0, net: 0, due: 26500 });
});

test("fulfilment state and progress", () => {
  assert.equal(m.fulfilmentState(order().lines), "unfulfilled");
  assert.equal(m.fulfilmentState([line("a", 1, 2, { fulfilled: 1 }), line("b", 1, 1)]), "partial");
  assert.equal(m.fulfilmentState([line("a", 1, 2, { fulfilled: 2 }), line("b", 1, 1, { fulfilled: 1 })]), "fulfilled");
  // everything cancelled: nothing to ship
  assert.equal(m.fulfilmentState([line("a", 1, 2, { refunded: 2 })]), "none");
  // a refunded unshipped unit no longer counts as outstanding
  assert.equal(m.fulfilmentState([line("a", 1, 2, { fulfilled: 1, refunded: 1 })]), "fulfilled");
  assert.deepEqual(m.fulfilmentProgress([line("a", 1, 3, { fulfilled: 1 })]), { shipped: 1, outstanding: 2, total: 3 });
  assert.deepEqual(m.outstandingPicks([line("a", 1, 3, { fulfilled: 1 }), line("b", 1, 1, { fulfilled: 1 })]), [{ lineId: "a", quantity: 2 }]);
});

test("partial fulfilment: ship some now, the rest later", () => {
  const o = order();
  const first = m.planFulfilment(o, { picks: [{ lineId: "a", quantity: 1 }], carrier: "Bosta", trackingNumber: "BST1" });
  assert.equal(first.ok, true);
  assert.equal(first.completes, false);
  assert.equal(first.state, "partial");
  const shipped = m.applyFulfilment(o, first, { at: "2026-09-02T09:00:00Z", label: "Shipped" }, { carrier: "Bosta", number: "BST1" });
  assert.equal(shipped.status, "partially-fulfilled");
  assert.equal(shipped.lines[0].fulfilled, 1);
  assert.equal(shipped.tracking.number, "BST1");
  assert.equal(shipped.events.at(-1).kind, "fulfilled");

  const rest = m.planFulfilment(shipped, { picks: m.outstandingPicks(shipped.lines) });
  assert.equal(rest.completes, true);
  const done = m.applyFulfilment(shipped, rest, { at: "2026-09-03T09:00:00Z", label: "Shipped" });
  assert.equal(done.status, "shipped");
  assert.equal(done.events.at(-1).kind, "shipped");
});

test("fulfilment refuses too many units, unknown lines, empty picks and a carrier without a number", () => {
  const o = order();
  assert.deepEqual(m.planFulfilment(o, { picks: [{ lineId: "a", quantity: 3 }] }).issues, [{ code: "line-over", lineId: "a", max: 2 }]);
  assert.deepEqual(m.planFulfilment(o, { picks: [{ lineId: "x", quantity: 1 }] }).issues, [{ code: "unknown-line", lineId: "x" }]);
  assert.deepEqual(m.planFulfilment(o, { picks: [] }).issues, [{ code: "empty" }]);
  assert.deepEqual(m.planFulfilment(o, { picks: [{ lineId: "a", quantity: 1 }], carrier: "Bosta", trackingNumber: "  " }).issues, [{ code: "tracking-number" }]);
  assert.deepEqual(m.planFulfilment(order({ status: "cancelled" }), { picks: [{ lineId: "a", quantity: 1 }] }).issues, [{ code: "blocked" }]);
  const untouched = m.applyFulfilment(o, m.planFulfilment(o, { picks: [] }), { at: "x", label: "y" });
  assert.equal(untouched, o);
});

test("order status follows payment, fulfilment and refunds", () => {
  const S = (over) => m.deriveOrderStatus({ status: "paid", payment: "paid", lines: [line("a", 1, 2)], ...over });
  assert.equal(S({ payment: "pending" }), "pending");
  assert.equal(S({}), "paid");
  assert.equal(S({ status: "processing" }), "processing");
  assert.equal(S({ payment: "cod" }), "processing");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 1 })] }), "partially-fulfilled");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 2 })] }), "fulfilled");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 2 })], delivery: "out-for-delivery" }), "out-for-delivery");
  assert.equal(S({ status: "delivered", lines: [line("a", 1, 2, { fulfilled: 2 })] }), "delivered");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 2, refunded: 1 })] }), "partially-refunded");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 2, refunded: 2 })] }), "refunded");
  assert.equal(S({ lines: [line("a", 1, 2, { fulfilled: 2, refunded: 2, returned: 2 })] }), "returned");
  assert.equal(S({ payment: "refunded" }), "refunded");
  assert.equal(S({ status: "cancelled" }), "cancelled");
});

test("applyRefund updates lines, payment, status and timeline, and never mutates", () => {
  const o = order({ lines: [line("a", 10000, 2, { fulfilled: 2 }), line("b", 5000, 1, { fulfilled: 1 })], status: "delivered" });
  const frozen = JSON.stringify(o);
  const plan = m.planRefund(o, [], { mode: "lines", picks: [{ lineId: "b", quantity: 1 }], restock: true, note: "damaged" });
  const { order: after, refunds } = m.applyRefund(o, [], plan, { at: "2026-09-05T10:00:00Z", by: "Admin", label: "Refund", note: "damaged" });
  assert.equal(JSON.stringify(o), frozen);
  assert.equal(after.lines[1].refunded, 1);
  assert.equal(after.payment, "partially-refunded");
  assert.equal(after.status, "partially-refunded");
  assert.equal(after.events.at(-1).kind, "refund");
  assert.equal(refunds.length, 1);
  assert.equal(refunds[0].amount, 4700);
  assert.equal(refunds[0].restock, true);

  const rest = m.planRefund(after, refunds, { mode: "amount", amount: m.refundRemaining(after, refunds) });
  const final = m.applyRefund(after, refunds, rest, { at: "2026-09-06T10:00:00Z", label: "Refund" });
  assert.equal(final.order.payment, "refunded");
  assert.equal(final.order.status, "refunded");
  // a refused plan changes nothing
  const bad = m.planRefund(after, refunds, { mode: "amount", amount: 999999 });
  assert.equal(m.applyRefund(after, refunds, bad, { at: "x", label: "y" }).order, after);
});

test("cancel: allowed before shipping, refunds what was paid and restocks what was reserved", () => {
  const o = order();
  assert.equal(m.canCancel(o), true);
  const plan = m.planCancel(o, []);
  assert.equal(plan.refundAmount, 26500);
  assert.deepEqual(plan.restock.map((r) => [r.variantId, r.quantity]), [["v-a", 2], ["v-b", 1]]);
  const { order: cancelled, refunds } = m.applyCancel(o, [], { at: "2026-09-02T10:00:00Z", label: "Cancelled" });
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.payment, "refunded");
  assert.equal(refunds[0].amount, 26500);

  assert.equal(m.planCancel(order({ payment: "pending" }), []).refundAmount, 0);
  assert.equal(m.canCancel(order({ lines: [line("a", 1, 2, { fulfilled: 1 })] })), false);
  assert.equal(m.canCancel(order({ status: "shipped" })), false);
  assert.equal(m.canCancel(cancelled), false);
  assert.equal(m.planCancel(cancelled, refunds).ok, false);
});

test("notes go on the timeline", () => {
  const o = m.applyNote(order(), { at: "2026-09-02T10:00:00Z", by: "Admin", label: "Note", note: "Call first" });
  assert.deepEqual(o.events.at(-1), { at: "2026-09-02T10:00:00Z", kind: "note", label: "Note", by: "Admin", note: "Call first" });
});
