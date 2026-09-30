import assert from "node:assert/strict";
import { test } from "node:test";
import {
  storeAverageOrderValue,
  storeConversionRate,
  storeFunnelCounts,
  storeKpis,
  storeLowStock,
  storeMinorFactor,
  storePeriodChange,
  storeReturningRate,
  storeSafeDivide,
  storeSeriesTotals,
  storeToMajor,
  storeTopN,
} from "../src/components/store-dashboard/store-dashboard-math.ts";

test("safe divide never returns NaN or Infinity", () => {
  assert.equal(storeSafeDivide(10, 4), 2.5);
  assert.equal(storeSafeDivide(10, 0), 0);
  assert.equal(storeSafeDivide(0, 0), 0);
  assert.equal(storeSafeDivide(10, 0, -1), -1);
  assert.equal(storeSafeDivide(Number.NaN, 2), 0);
  assert.equal(storeSafeDivide(5, Number.POSITIVE_INFINITY, 9), 9);
});

test("period change: up, down, flat and the cases with nothing to compare", () => {
  assert.equal(storePeriodChange(112, 100), 0.12);
  assert.equal(storePeriodChange(75, 100), -0.25);
  assert.equal(storePeriodChange(100, 100), 0);
  assert.equal(storePeriodChange(0, 0), 0);
  assert.equal(storePeriodChange(50, 0), undefined);
  assert.equal(storePeriodChange(50, undefined), undefined);
  assert.equal(storePeriodChange(0, 100), -1);
  assert.equal(storePeriodChange(Number.NaN, 100), undefined);
  // A negative previous keeps the direction: from -100 to -50 is an improvement.
  assert.equal(storePeriodChange(-50, -100), 0.5);
});

test("average order value rounds to a whole minor unit and is 0 with no orders", () => {
  assert.equal(storeAverageOrderValue(100000, 4), 25000);
  assert.equal(storeAverageOrderValue(100001, 3), 33334);
  assert.equal(storeAverageOrderValue(100000, 0), 0);
  assert.equal(storeAverageOrderValue(0, 0), 0);
});

test("conversion and returning rates are fractions clamped to 0..1", () => {
  assert.equal(storeConversionRate(30, 1000), 0.03);
  assert.equal(storeConversionRate(30, 0), 0);
  assert.equal(storeConversionRate(30, 10), 1);
  assert.equal(storeConversionRate(-5, 100), 0);
  assert.equal(storeReturningRate(40, 100), 0.4);
  assert.equal(storeReturningRate(0, 0), 0);
  assert.equal(storeReturningRate(120, 100), 1);
});

const current = { sales: 1_200_000, orders: 300, sessions: 10_000, customers: 250, returningCustomers: 100, addToCart: 1800, checkouts: 700, };
const previous = { sales: 1_000_000, orders: 250, sessions: 10_000, customers: 220, returningCustomers: 66, addToCart: 1500, checkouts: 600 };

test("KPIs carry the value, the previous value and the change", () => {
  const k = storeKpis(current, previous);
  assert.equal(k.sales.value, 1_200_000);
  assert.equal(k.sales.previous, 1_000_000);
  assert.ok(Math.abs(k.sales.change - 0.2) < 1e-9);
  assert.equal(k.orders.change, 0.2);
  assert.equal(k.aov.value, 4000);
  assert.equal(k.aov.previous, 4000);
  assert.equal(k.aov.change, 0);
  assert.equal(k.conversion.value, 0.03);
  assert.equal(k.conversion.previous, 0.025);
  assert.ok(Math.abs(k.conversion.change - 0.2) < 1e-9);
  assert.equal(k.returning.value, 0.4);
  assert.ok(Math.abs(k.returning.change - (0.4 - 0.3) / 0.3) < 1e-9);
});

test("KPIs without a previous period have no change", () => {
  const k = storeKpis(current);
  for (const key of ["sales", "orders", "aov", "conversion", "returning"]) {
    assert.equal(k[key].previous, undefined);
    assert.equal(k[key].change, undefined);
  }
});

test("KPIs for an empty period are zeros, not NaN", () => {
  const empty = { sales: 0, orders: 0, sessions: 0, customers: 0, returningCustomers: 0, addToCart: 0, checkouts: 0 };
  const k = storeKpis(empty, empty);
  assert.equal(k.aov.value, 0);
  assert.equal(k.conversion.value, 0);
  assert.equal(k.returning.value, 0);
  assert.equal(k.sales.change, 0);
  // An empty previous period against a busy one is "no comparison", not +Infinity.
  assert.equal(storeKpis(current, empty).sales.change, undefined);
});

test("series totals add sales, orders and sessions", () => {
  assert.deepEqual(
    storeSeriesTotals([
      { date: "2026-09-29", sales: 100, orders: 1, sessions: 10 },
      { date: "2026-09-30", sales: 250, orders: 2, sessions: 30 },
    ]),
    { sales: 350, orders: 3, sessions: 40 },
  );
  assert.deepEqual(storeSeriesTotals([]), { sales: 0, orders: 0, sessions: 0 });
});

test("funnel counts never widen and are cleaned", () => {
  assert.deepEqual(storeFunnelCounts({ sessions: 1000, addToCart: 300, checkouts: 120, orders: 60 }), { sessions: 1000, addToCart: 300, checkout: 120, purchase: 60 });
  // A step bigger than the one before is capped.
  assert.deepEqual(storeFunnelCounts({ sessions: 100, addToCart: 300, checkouts: 200, orders: 500 }), { sessions: 100, addToCart: 100, checkout: 100, purchase: 100 });
  assert.deepEqual(storeFunnelCounts({ sessions: -5, addToCart: Number.NaN, checkouts: 2.9, orders: 1 }), { sessions: 0, addToCart: 0, checkout: 0, purchase: 0 });
  assert.deepEqual(storeFunnelCounts({ sessions: 10.7, addToCart: 5.5, checkouts: 5, orders: 2 }), { sessions: 10, addToCart: 5, checkout: 5, purchase: 2 });
});

const product = (id, status, variants, extra = {}) => ({
  id,
  name: id.toUpperCase(),
  images: [{ src: `/${id}.svg`, alt: id }],
  options: [{ id: "size", name: "Size", values: [{ id: "m", label: "M" }, { id: "l", label: "L" }] }],
  variants,
  status,
  ...extra,
});

test("low stock lists out of stock first, then the lowest, and skips untracked and inactive", () => {
  const list = storeLowStock([
    product("a", "active", [
      { id: "a-m", sku: "A-M", options: { size: "m" }, price: 100, stock: 4 },
      { id: "a-l", sku: "A-L", options: { size: "l" }, price: 100, stock: 0 },
    ]),
    product("b", "active", [{ id: "b-m", options: { size: "m" }, price: 100 }, { id: "b-l", options: { size: "l" }, price: 100, stock: 20 }]),
    product("c", "archived", [{ id: "c-m", options: { size: "m" }, price: 100, stock: 1 }]),
    product("d", undefined, [{ id: "d-m", options: { size: "m" }, price: 100, stock: 2 }]),
    product("e", "draft", [{ id: "e-m", options: { size: "m" }, price: 100, stock: 0 }]),
  ]);
  assert.deepEqual(list.map((i) => [i.variantId, i.stock, i.level]), [["a-l", 0, "out"], ["d-m", 2, "low"], ["a-m", 4, "low"]]);
  assert.equal(list[0].variantLabel, "L");
  assert.equal(list[0].sku, "A-L");
  assert.equal(list[0].image, "/a.svg");
});

test("low stock threshold is inclusive and adjustable, and negative stock reads as 0", () => {
  const p = [product("a", "active", [{ id: "a-m", options: { size: "m" }, price: 1, stock: 5 }, { id: "a-l", options: { size: "l" }, price: 1, stock: -2 }])];
  assert.deepEqual(storeLowStock(p).map((i) => [i.variantId, i.stock, i.level]), [["a-l", 0, "out"], ["a-m", 5, "low"]]);
  assert.deepEqual(storeLowStock(p, 4).map((i) => i.variantId), ["a-l"]);
  assert.deepEqual(storeLowStock(p, -3), []);
});

test("top N keeps the biggest and does not mutate", () => {
  const rows = [{ id: "a", value: 5 }, { id: "b", value: 9 }, { id: "c", value: 5 }, { id: "d", value: 1 }];
  assert.deepEqual(storeTopN(rows, 3).map((r) => r.id), ["b", "a", "c"]);
  assert.deepEqual(rows.map((r) => r.id), ["a", "b", "c", "d"]);
  assert.deepEqual(storeTopN(rows, 0), []);
  assert.equal(storeTopN(rows, 99).length, 4);
});

test("minor units convert by the currency's own digits", () => {
  assert.equal(storeMinorFactor("EGP"), 100);
  assert.equal(storeMinorFactor("JPY"), 1);
  assert.equal(storeMinorFactor("KWD"), 1000);
  assert.equal(storeMinorFactor("not-a-code"), 100);
  assert.equal(storeToMajor(12550, "EGP"), 125.5);
  assert.equal(storeToMajor(500, "JPY"), 500);
});
