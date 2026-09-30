import assert from "node:assert/strict";
import { test } from "node:test";
import "./_ts-resolve.mjs";
const m = await import("../src/components/store-merch/store-merch-model.ts");

test("countdown splits into parts and never goes negative", () => {
  const now = 1_000_000;
  const end = now + ((1 * 24 + 2) * 3600 + 3 * 60 + 4) * 1000;
  assert.deepEqual({ ...m.merchCountdownParts(end, now), remaining: 0 }, { days: 1, hours: 2, minutes: 3, seconds: 4, done: false, remaining: 0 });
  const over = m.merchCountdownParts(now - 5, now);
  assert.equal(over.done, true);
  assert.equal(over.seconds, 0);
  assert.equal(m.merchCountdownParts(Number.NaN, now).done, true);
});

test("a partial second rounds up so the readout never shows zero early", () => {
  const p = m.merchCountdownParts(1500, 0);
  assert.equal(p.seconds, 2);
  assert.equal(p.done, false);
});

test("next tick lines up with the second boundary", () => {
  assert.equal(m.merchNextTick(2500, 0), 500);
  assert.equal(m.merchNextTick(3000, 0), 1000);
  assert.equal(m.merchNextTick(10, 20), 0);
});

test("active deals are started, unexpired and soonest first", () => {
  const deals = [{ id: "late", endsAt: 500 }, { id: "soon", endsAt: 200 }, { id: "future", startsAt: 300, endsAt: 900 }, { id: "gone", endsAt: 50 }];
  assert.deepEqual(m.merchActiveDeals(deals, 100).map((d) => d.id), ["soon", "late"]);
  assert.deepEqual(m.merchActiveDeals(deals, 350).map((d) => d.id), ["late", "future"]);
});

test("deal progress is a clamped whole percent", () => {
  assert.equal(m.merchDealProgress(30, 120), 25);
  assert.equal(m.merchDealProgress(999, 100), 100);
  assert.equal(m.merchDealProgress(5, 0), 0);
  assert.equal(m.merchDealProgress(undefined, 10), 0);
});

test("recently viewed moves to front, dedupes and caps", () => {
  assert.deepEqual(m.merchRecordViewed(["a", "b", "c"], "b"), ["b", "a", "c"]);
  assert.equal(m.merchRecordViewed(["a", "b", "c"], "d", 3).length, 3);
  const products = [{ id: "a" }, { id: "b" }, { id: "c" }];
  assert.deepEqual(m.merchViewedProducts(products, ["c", "gone", "a", "b"], "a").map((p) => p.id), ["c", "b"]);
});

test("related products rank category, brand and tags and skip the product itself and drafts", () => {
  const base = { images: [], options: [], variants: [] };
  const list = [
    { ...base, id: "x", name: "X", category: "Tops", brand: "Nile", tags: ["cotton"] },
    { ...base, id: "y", name: "Y", category: "Tops" },
    { ...base, id: "z", name: "Z", brand: "Nile", tags: ["cotton", "summer"] },
    { ...base, id: "w", name: "W", category: "Tops", status: "draft" },
    { ...base, id: "v", name: "V", category: "Home" },
  ];
  assert.deepEqual(m.merchRelatedProducts(list, list[0]).map((p) => p.id), ["y", "z"]);
  assert.deepEqual(m.merchRelatedProducts(list, list[0], 1).map((p) => p.id), ["y"]);
});
