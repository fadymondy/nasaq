import assert from "node:assert/strict";
import { test } from "node:test";
import {
  stockCanIssue,
  stockCellKey,
  stockLevel,
  stockMatrix,
  stockOnHand,
  stockSignedQuantity,
  stockStatement,
  stockSum,
  stockTransfer,
} from "../src/components/stock-ledger/stock-math.ts";

const products = [
  { id: "a", name: "Beans", sku: "A", reorderPoint: 10 },
  { id: "b", name: "Cups", sku: "B" },
];
const warehouses = [
  { id: "w1", name: "Main" },
  { id: "w2", name: "Shop" },
];
const M = (id, date, productId, warehouseId, type, quantity) => ({ id, date, productId, warehouseId, type, quantity });
const movements = [
  M("1", "2026-09-01T09:00:00", "a", "w1", "receive", 50),
  M("2", "2026-09-02T09:00:00", "a", "w1", "issue", -30),
  M("3", "2026-09-02T10:00:00", "a", "w2", "receive", 30),
  M("4", "2026-09-05T10:00:00", "a", "w2", "adjust", -25),
  M("5", "2026-09-06T10:00:00", "b", "w1", "receive", 4),
];

test("signed quantity: the sign a person types does not matter for receive and issue", () => {
  assert.equal(stockSignedQuantity("receive", -5), 5);
  assert.equal(stockSignedQuantity("issue", 5), -5);
  assert.equal(stockSignedQuantity("issue", -5), -5);
  assert.equal(stockSignedQuantity("adjust", -2), -2);
  assert.equal(stockSignedQuantity("adjust", 2), 2);
});

test("on-hand is the sum of signed movements per product and warehouse", () => {
  const m = stockOnHand(movements);
  assert.equal(m.get(stockCellKey("a", "w1")), 20);
  assert.equal(m.get(stockCellKey("a", "w2")), 5);
  assert.equal(m.get(stockCellKey("b", "w1")), 4);
  assert.equal(m.get(stockCellKey("b", "w2")), undefined);
  assert.equal(stockOnHand(movements, { asOf: "2026-09-02" }).get(stockCellKey("a", "w1")), 20);
  assert.equal(stockOnHand(movements, { asOf: "2026-09-01" }).get(stockCellKey("a", "w1")), 50);
});

test("decimal quantities do not drift", () => {
  assert.equal(stockSum([0.1, 0.2]), 0.3);
  assert.equal(stockSum(Array.from({ length: 10 }, () => 0.1)), 1);
  const ms = Array.from({ length: 10 }, (_, i) => M(String(i), "2026-09-01", "a", "w1", "receive", 0.1));
  assert.equal(stockOnHand(ms).get(stockCellKey("a", "w1")), 1);
});

test("levels: out at zero or less, low at or under the reorder point", () => {
  assert.equal(stockLevel(0, 10), "out");
  assert.equal(stockLevel(-3, 10), "out");
  assert.equal(stockLevel(10, 10), "low");
  assert.equal(stockLevel(11, 10), "ok");
  assert.equal(stockLevel(1), "ok");
});

test("matrix: rectangular grid, totals per product and warehouse, level from the total", () => {
  const x = stockMatrix(products, warehouses, movements);
  assert.deepEqual(x.rows[0].cells, { w1: 20, w2: 5 });
  assert.equal(x.rows[0].total, 25);
  assert.equal(x.rows[0].level, "ok");
  assert.deepEqual(x.rows[1].cells, { w1: 4, w2: 0 });
  assert.deepEqual(x.warehouseTotals, { w1: 24, w2: 5 });
  assert.equal(x.total, 29);
  const low = stockMatrix(products, warehouses, [...movements, M("9", "2026-09-07", "a", "w1", "issue", -15)]);
  assert.equal(low.rows[0].total, 10);
  assert.equal(low.rows[0].level, "low");
});

test("statement carries a running balance in time order", () => {
  const rows = stockStatement([...movements].reverse(), { productId: "a" });
  assert.deepEqual(rows.map((r) => r.balance), [50, 20, 50, 25]);
  assert.deepEqual(stockStatement(movements, { productId: "a", warehouseId: "w1" }).map((r) => r.balance), [50, 20]);
  assert.equal(stockStatement(movements, { productId: "a", warehouseId: "w2", opening: 10 })[1].balance, 15);
});

test("issue check and transfer as a paired issue and receive", () => {
  assert.equal(stockCanIssue(movements, "a", "w1", 20), true);
  assert.equal(stockCanIssue(movements, "a", "w1", 20.001), false);
  assert.equal(stockCanIssue(movements, "b", "w2", 1), false);
  const [out, inn] = stockTransfer({ id: "t1", date: "2026-09-08", productId: "a", fromWarehouseId: "w1", toWarehouseId: "w2", quantity: 8, reference: "TR-1" });
  assert.equal(out.type, "issue");
  assert.equal(out.quantity, -8);
  assert.equal(inn.type, "receive");
  assert.equal(inn.quantity, 8);
  assert.equal(out.reference, inn.reference);
  const after = stockOnHand([...movements, out, inn]);
  assert.equal(after.get(stockCellKey("a", "w1")), 12);
  assert.equal(after.get(stockCellKey("a", "w2")), 13);
  // A transfer never changes the company total.
  assert.equal(stockMatrix(products, warehouses, [...movements, out, inn]).rows[0].total, 25);
});
