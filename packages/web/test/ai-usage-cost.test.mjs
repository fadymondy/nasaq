import assert from "node:assert/strict";
import test from "node:test";
import { costPerMillion, costTotals, sumTokens, tokenSplit, totalTokens, withMarkup } from "../src/components/ai-usage-cost/usage-cost-math.ts";

test("costTotals sums billed and unbilled", () => {
  const t = costTotals([
    { billed: 10, unbilled: 0 },
    { billed: 0, unbilled: 30 },
  ]);
  assert.deepEqual(t, { billed: 10, unbilled: 30, total: 40, billedShare: 0.25 });
  assert.equal(costTotals([]).billedShare, 0);
});

test("withMarkup", () => {
  assert.equal(withMarkup(100, 0.2), 120);
  assert.equal(withMarkup(100, 0), 100);
  assert.equal(withMarkup(100, -0.5), 100);
});

test("token sums and cost per million", () => {
  assert.equal(totalTokens({ tokensIn: 3, tokensOut: 4 }), 7);
  assert.deepEqual(
    sumTokens([
      { tokensIn: 1, tokensOut: 2 },
      { tokensIn: 3, tokensOut: 4 },
    ]),
    { tokensIn: 4, tokensOut: 6, total: 10 },
  );
  assert.equal(costPerMillion({ tokensIn: 500_000, tokensOut: 500_000, cost: 5 }), 5);
  assert.equal(costPerMillion({ tokensIn: 0, tokensOut: 0, cost: 5 }), 0);
});

test("tokenSplit shares sum to one and cached counts inside input", () => {
  const s = tokenSplit(800, 200, 300);
  assert.equal(s.cached, 0.3);
  assert.equal(s.input, 0.5);
  assert.equal(s.output, 0.2);
  assert.deepEqual(tokenSplit(0, 0), { input: 0, output: 0, cached: 0 });
  assert.equal(tokenSplit(100, 0, 500).cached, 1);
});
