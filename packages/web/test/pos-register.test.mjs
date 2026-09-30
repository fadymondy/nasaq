import assert from "node:assert/strict";
import { test } from "node:test";
import { computeLineItems } from "../src/components/line-item-editor/line-item-math.ts";
import { posCanAddTender, posChange, posDrawerSummary, posQuickTenders, posRemaining, posRoundMinor, posSaleParts, posSettle, posTenderLimit, posVariance } from "../src/components/pos-register/pos-math.ts";

test("change and remaining never go negative", () => {
  assert.equal(posChange(4600, 5000), 400);
  assert.equal(posChange(4600, 4000), 0);
  assert.equal(posRemaining(4600, 4000), 600);
  assert.equal(posRemaining(4600, 5000), 0);
});

test("quick tenders: exact first, then notes, ascending, unique", () => {
  assert.deepEqual(posQuickTenders(4600, "SAR"), [4600, 5000, 6000, 10000]);
  assert.deepEqual(posQuickTenders(5000, "SAR"), [5000, 6000, 10000, 20000]);
  assert.deepEqual(posQuickTenders(4600, "SAR", 2), [4600, 5000]);
  const t = posQuickTenders(123, "SAR");
  assert.equal(t[0], 123);
  assert.equal(new Set(t).size, t.length);
});

test("basket total with 15% VAT matches the drawer", () => {
  const t = computeLineItems([
    { id: "a", quantity: 2, unitPrice: 1600 },
    { id: "b", quantity: 1, unitPrice: 1300 },
  ], { defaultTaxBps: 1500 });
  assert.equal(t.taxTotal, 480 + 195);
  assert.equal(t.total, 4500 + 675);
  const d = posDrawerSummary(50000, [{ method: "cash", total: t.total }]);
  assert.equal(d.expectedCash, 50000 + 5175);
  assert.equal(posChange(t.total, 10000), 4825);
});

test("drawer sums cash, card and wallet; refunds leave the drawer", () => {
  const d = posDrawerSummary(20000, [
    { method: "cash", total: 5175 },
    { method: "card", total: 3000 },
    { method: "wallet", total: 1000 },
    { method: "cash", total: 1150, refund: true },
  ]);
  assert.equal(d.cash, 5175 - 1150);
  assert.equal(d.card, 3000);
  assert.equal(d.wallet, 1000);
  assert.equal(d.sales, 3);
  assert.equal(d.expectedCash, 20000 + 4025);
});

test("variance is counted minus expected", () => {
  assert.equal(posVariance(24025, 24000), -25);
  assert.equal(posVariance(24025, 24100), 75);
  assert.equal(posVariance(100, 100), 0);
});

const tender = (method, amount) => ({ id: `${method}-${amount}`, method, amount });

test("split: remaining falls as tenders are added and never goes negative", () => {
  assert.equal(posSettle(5175, []).remaining, 5175);
  assert.equal(posSettle(5175, [tender("card", 3000)]).remaining, 2175);
  assert.equal(posSettle(5175, [tender("card", 3000), tender("wallet", 1000)]).remaining, 1175);
  const full = posSettle(5175, [tender("card", 3000), tender("cash", 2175)]);
  assert.equal(full.remaining, 0);
  assert.equal(full.change, 0);
  assert.equal(full.settled, true);
});

test("split: change comes only from cash and only when cash overpays the remainder", () => {
  const s = posSettle(5175, [tender("card", 3000), tender("cash", 5000)]);
  assert.equal(s.change, 2825);
  assert.equal(s.cash, 2175);
  assert.equal(s.card, 3000);
  assert.equal(s.settled, true);
  // cash short of the remainder: no change, still owing
  const short = posSettle(5175, [tender("card", 3000), tender("cash", 1000)]);
  assert.equal(short.change, 0);
  assert.equal(short.remaining, 1175);
  assert.equal(short.settled, false);
  // no cash at all: an exact card payment gives no change
  assert.equal(posSettle(5175, [tender("card", 5175)]).change, 0);
});

test("split: several tenders of the same method add up", () => {
  const s = posSettle(10000, [tender("cash", 2000), tender("cash", 3000), tender("card", 2500), tender("card", 2500)]);
  assert.equal(s.paid, 10000);
  assert.equal(s.cash, 5000);
  assert.equal(s.card, 5000);
  assert.equal(s.settled, true);
  const two = posSettle(1000, [tender("cash", 600), tender("cash", 600)]);
  assert.equal(two.change, 200);
  assert.equal(two.cash, 1000);
});

test("split: card and wallet cannot exceed the remaining amount", () => {
  assert.equal(posTenderLimit(5175, [tender("cash", 1000)], "card"), 4175);
  assert.equal(posTenderLimit(5175, [], "cash"), Infinity);
  assert.equal(posCanAddTender(5175, [tender("cash", 1000)], "card", 4175), true);
  assert.equal(posCanAddTender(5175, [tender("cash", 1000)], "card", 4176), false);
  assert.equal(posCanAddTender(5175, [tender("card", 3000)], "wallet", 2176), false);
  assert.equal(posCanAddTender(5175, [], "cash", 100000), true);
  // nothing more can be added once the sale is paid, not even cash
  assert.equal(posCanAddTender(5175, [tender("card", 5175)], "cash", 100), false);
  assert.equal(posCanAddTender(5175, [], "card", 0), false);
  // a list that overpays by card is invalid and never settles or gives change
  const bad = posSettle(1000, [tender("card", 1500), tender("cash", 500)]);
  assert.equal(bad.valid, false);
  assert.equal(bad.change, 0);
  assert.equal(bad.settled, false);
});

test("split: removing a tender restores the remaining amount", () => {
  const list = [tender("card", 3000), tender("cash", 2175)];
  assert.equal(posSettle(5175, list).settled, true);
  const after = list.filter((t) => t.method !== "cash");
  assert.equal(posSettle(5175, after).remaining, 2175);
  assert.equal(posSettle(5175, after).settled, false);
});

test("rounding: amounts are whole minor units, fractions round half up, junk is zero", () => {
  assert.equal(posRoundMinor(1000.4), 1000);
  assert.equal(posRoundMinor(1000.5), 1001);
  assert.equal(posRoundMinor(-5), 0);
  assert.equal(posRoundMinor(Number.NaN), 0);
  assert.equal(posRoundMinor(Number.POSITIVE_INFINITY), 0);
  assert.equal(posSettle(1000.4, [tender("cash", 999.6)]).settled, true);
  assert.equal(posSettle(1000, [tender("cash", 0.4)]).paid, 0);
  assert.equal(posSettle(0, [tender("cash", 500)]).settled, false);
});

test("a split sale reaches the drawer as what each method took, with change off the cash", () => {
  const parts = posSaleParts(5175, [tender("card", 3000), tender("cash", 5000)]);
  assert.deepEqual(parts, [{ method: "cash", amount: 2175 }, { method: "card", amount: 3000 }]);
  const d = posDrawerSummary(10000, [{ method: "cash", total: 5175, parts }, { method: "cash", total: 1000 }]);
  assert.equal(d.cash, 2175 + 1000);
  assert.equal(d.card, 3000);
  assert.equal(d.sales, 2);
  assert.equal(d.expectedCash, 10000 + 3175);
});
