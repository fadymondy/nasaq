import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAmount, groupByDay, parseAmount } from "../src/components/wallet/wallet-math.ts";

test("parseAmount reads typed money", () => {
  assert.equal(parseAmount("1,250.50"), 1250.5);
  assert.equal(parseAmount("١٢٥٠٫٥"), 1250.5);
  assert.equal(parseAmount("1250,5"), 1250.5);
  assert.equal(parseAmount("1,250"), 1250);
  assert.equal(parseAmount("0"), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
});

test("checkAmount applies limits", () => {
  assert.equal(checkAmount(null), "invalid");
  assert.equal(checkAmount(5, { min: 10 }), "min");
  assert.equal(checkAmount(500, { max: 100 }), "max");
  assert.equal(checkAmount(50, { min: 10, max: 100 }), null);
});

test("groupByDay orders newest first", () => {
  const groups = groupByDay([
    { id: 1, date: new Date(2026, 8, 27, 10) },
    { id: 2, date: new Date(2026, 8, 29, 8) },
    { id: 3, date: new Date(2026, 8, 29, 17) },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].items.map((i) => i.id), [3, 2]);
  assert.equal(groups[1].items[0].id, 1);
});
