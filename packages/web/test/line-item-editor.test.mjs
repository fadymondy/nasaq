import assert from "node:assert/strict";
import { test } from "node:test";
import { allocateMinor, bpsToPercentText, computeLineItems, lineGross, mulDivRound, quantityText } from "../src/components/line-item-editor/line-item-math.ts";

const sum = (xs) => xs.reduce((a, b) => a + b, 0);

test("mulDivRound rounds half away from zero, exactly", () => {
  assert.equal(mulDivRound(1, 1, 2), 1);
  assert.equal(mulDivRound(-1, 1, 2), -1);
  assert.equal(mulDivRound(1, 1, 3), 0);
  assert.equal(mulDivRound(5, 1, 10), 1);
  assert.equal(mulDivRound(4, 1, 10), 0);
  // Larger than 2^53 as a float product.
  assert.equal(mulDivRound(9_007_199_254_740_991, 15, 100), 1_351_079_888_211_149);
});

test("lineGross keeps fractional quantities exact", () => {
  assert.equal(lineGross(3, 1999), 5997);
  assert.equal(lineGross(1.5, 1999), 2999); // 2998.5 rounds up
  assert.equal(lineGross(0.001, 999), 1);
  assert.equal(lineGross(1.005, 100), 101); // 100.5 -> 101, no float error
});

test("no float drift: 0.1 + 0.2 style sums stay exact", () => {
  const t = computeLineItems(Array.from({ length: 10 }, (_, i) => ({ id: String(i), quantity: 1, unitPrice: 10 })));
  assert.equal(t.total, 100);
});

test("exclusive tax rounds per line", () => {
  const t = computeLineItems(
    [
      { id: "a", quantity: 1, unitPrice: 333 },
      { id: "b", quantity: 1, unitPrice: 333 },
      { id: "c", quantity: 1, unitPrice: 333 },
    ],
    { defaultTaxBps: 1500 },
  );
  // 49.95 per line rounds to 50 each.
  assert.deepEqual(t.lines.map((l) => l.tax), [50, 50, 50]);
  assert.equal(t.taxTotal, 150);
  assert.equal(t.total, 999 + 150);
});

test("invoice rounding taxes the whole once and shares it out", () => {
  const lines = [
    { id: "a", quantity: 1, unitPrice: 333 },
    { id: "b", quantity: 1, unitPrice: 333 },
    { id: "c", quantity: 1, unitPrice: 333 },
  ];
  const t = computeLineItems(lines, { defaultTaxBps: 1500, taxRounding: "invoice" });
  assert.equal(t.taxTotal, 150); // 149.85 -> 150
  assert.equal(sum(t.lines.map((l) => l.tax)), t.taxTotal);
  const odd = computeLineItems([{ id: "a", quantity: 1, unitPrice: 101 }, { id: "b", quantity: 1, unitPrice: 101 }], { defaultTaxBps: 500, taxRounding: "invoice" });
  assert.equal(odd.taxTotal, 10); // 10.1 -> 10; per line would be 5 + 5 = 10; shares still sum
  assert.equal(sum(odd.lines.map((l) => l.tax)), 10);
});

test("modes can differ by a minor unit and each is self-consistent", () => {
  const lines = Array.from({ length: 3 }, (_, i) => ({ id: String(i), quantity: 1, unitPrice: 110 }));
  const perLine = computeLineItems(lines, { defaultTaxBps: 500, taxRounding: "line" });
  const perInvoice = computeLineItems(lines, { defaultTaxBps: 500, taxRounding: "invoice" });
  assert.equal(perLine.taxTotal, 3 * 6); // 5.5 -> 6 each
  assert.equal(perInvoice.taxTotal, 17); // 16.5 -> 17
  for (const t of [perLine, perInvoice]) {
    assert.equal(t.total, t.taxableTotal + t.taxTotal);
    assert.equal(t.total, sum(t.lines.map((l) => l.total)));
  }
});

test("tax-inclusive prices split the tax out of the price", () => {
  const t = computeLineItems([{ id: "a", quantity: 1, unitPrice: 11500 }], { taxMode: "inclusive", defaultTaxBps: 1500 });
  assert.equal(t.total, 11500);
  assert.equal(t.taxTotal, 1500);
  assert.equal(t.taxableTotal, 10000);
  const odd = computeLineItems([{ id: "a", quantity: 1, unitPrice: 999 }], { taxMode: "inclusive", defaultTaxBps: 1500 });
  assert.equal(odd.total, 999);
  assert.equal(odd.taxTotal, 130); // 999 - round(999/1.15 = 868.7) = 999 - 869
  assert.equal(odd.taxableTotal + odd.taxTotal, 999);
});

test("line discounts round once and never exceed the line", () => {
  const t = computeLineItems([{ id: "a", quantity: 3, unitPrice: 333, discountBps: 1250 }]);
  assert.equal(t.lines[0].gross, 999);
  assert.equal(t.lines[0].discount, 125); // 124.875
  assert.equal(t.total, 874);
  assert.equal(computeLineItems([{ id: "a", quantity: 1, unitPrice: 500, discountBps: 99999 }]).total, 0);
});

test("order discount is shared by value and sums exactly", () => {
  const lines = [
    { id: "a", quantity: 1, unitPrice: 1000 },
    { id: "b", quantity: 1, unitPrice: 1000 },
    { id: "c", quantity: 1, unitPrice: 1000 },
  ];
  const t = computeLineItems(lines, { orderDiscount: { type: "amount", minor: 100 }, defaultTaxBps: 1500 });
  assert.deepEqual(t.lines.map((l) => l.discount).sort(), [33, 33, 34]);
  assert.equal(t.discountTotal, 100);
  assert.equal(t.taxableTotal, 2900);
  const pct = computeLineItems(lines, { orderDiscount: { type: "percent", bps: 1000 } });
  assert.equal(pct.discountTotal, 300);
  // A discount bigger than the basket is capped at the basket.
  assert.equal(computeLineItems(lines, { orderDiscount: { type: "amount", minor: 99999 } }).total, 0);
});

test("mixed rates are grouped", () => {
  const t = computeLineItems(
    [
      { id: "a", quantity: 2, unitPrice: 1000, taxBps: 1500 },
      { id: "b", quantity: 1, unitPrice: 500, taxBps: 0 },
      { id: "c", quantity: 1, unitPrice: 200, taxBps: 500 },
    ],
    {},
  );
  assert.deepEqual(t.taxGroups, [
    { bps: 500, taxable: 200, tax: 10 },
    { bps: 1500, taxable: 2000, tax: 300 },
  ]);
  assert.equal(t.total, 2700 + 310);
});

test("allocateMinor: largest remainder, sums to the total", () => {
  assert.deepEqual(allocateMinor(100, [1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(allocateMinor(-100, [1, 1, 1]), [-34, -33, -33]);
  assert.deepEqual(allocateMinor(5, [0, 0]), [0, 0]);
  assert.equal(sum(allocateMinor(7, [3, 3, 1, 0])), 7);
  assert.equal(allocateMinor(7, [3, 3, 1, 0])[3], 0);
});

test("percent and quantity text", () => {
  assert.equal(bpsToPercentText(1500), "15");
  assert.equal(bpsToPercentText(1250), "12.5");
  assert.equal(bpsToPercentText(575), "5.75");
  assert.equal(quantityText(2), "2");
  assert.equal(quantityText(1.5), "1.5");
  assert.equal(quantityText(0.125), "0.125");
});
