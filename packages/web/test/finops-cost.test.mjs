import assert from "node:assert/strict";
import { test } from "node:test";
import { budgetState, finopsTotals, monthlyEquivalent, parseAmount, rightsize, roundMoney, validateLineItem } from "../src/components/finops-cost/finops-format.ts";

const small = { name: "S", monthlyPrice: 10 };
const big = { name: "L", monthlyPrice: 40 };

test("rightsize", () => {
  assert.deepEqual(rightsize({ cpu: 10, memory: 20, disk: 50 }, 20, small), { kind: "downsize", savings: 10, plan: small });
  assert.equal(rightsize({ cpu: 10, memory: 60, disk: 50 }, 20).kind, "ok");
  assert.deepEqual(rightsize({ cpu: 90, memory: 20, disk: 10 }, 20, small, big), { kind: "upsize", extra: 20, plan: big });
  assert.equal(rightsize({ cpu: 10, memory: 10, disk: 95 }, 20).kind, "upsize");
});

test("line items and totals", () => {
  assert.equal(monthlyEquivalent({ amount: 120, period: "yearly" }), 10);
  assert.equal(monthlyEquivalent({ amount: 50, period: "once" }), 0);
  const t = finopsTotals([{ monthlyPrice: 0.1 }, { monthlyPrice: 0.2 }], [{ amount: 24, period: "yearly" }]);
  assert.deepEqual(t, { servers: 0.3, items: 2, total: 2.3 });
  assert.equal(roundMoney(0.1 + 0.2), 0.3);
});

test("budgetState", () => {
  assert.equal(budgetState(50, undefined), "none");
  assert.equal(budgetState(50, 100), "under");
  assert.equal(budgetState(95, 100), "near");
  assert.equal(budgetState(101, 100), "over");
});

test("parseAmount and validateLineItem", () => {
  assert.equal(parseAmount("1,250.50"), 1250.5);
  assert.equal(parseAmount("12,5"), 12.5);
  assert.equal(parseAmount("١٢٥٠"), 1250);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
  assert.deepEqual(validateLineItem({ name: "", amount: "0" }), { ok: false, problems: ["name", "amount"] });
  assert.deepEqual(validateLineItem({ name: "x", amount: "5" }), { ok: true, amount: 5 });
});
