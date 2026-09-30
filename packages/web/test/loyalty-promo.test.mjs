import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluatePromo, expiringPoints, isPromoCodeFormat, loyaltyTier, maxRedeemablePoints, normalizePromoCode, pointsEarned, pointsValue, promoLive, spendablePoints } from "../src/components/loyalty-promo/loyalty-logic.ts";

const tiers = [
  { id: "gold", minPoints: 5000 },
  { id: "silver", minPoints: 1000 },
  { id: "bronze", minPoints: 0 },
];

test("loyaltyTier finds tier, next and progress", () => {
  const a = loyaltyTier(1500, tiers);
  assert.deepEqual([a.tier.id, a.next.id, a.toNext, a.progress], ["silver", "gold", 3500, 12]);
  const top = loyaltyTier(9000, tiers);
  assert.deepEqual([top.tier.id, top.next, top.toNext, top.progress], ["gold", undefined, 0, 100]);
  assert.equal(loyaltyTier(0, tiers).tier.id, "bronze");
  assert.equal(loyaltyTier(10, []).tier, undefined);
});

test("pointsEarned drops fractions and applies the bonus", () => {
  assert.equal(pointsEarned(12_550, { pointsPerUnit: 1 }), 125);
  assert.equal(pointsEarned(12_550, { pointsPerUnit: 2, bonusBps: 2000 }), 301);
  assert.equal(pointsEarned(99, { pointsPerUnit: 1 }), 0);
  assert.equal(pointsEarned(-5, { pointsPerUnit: 1 }), 0);
});

test("redeeming is capped by balance, order share and minimum", () => {
  const rule = { minorPerPoint: 10, minPoints: 100, maxShareBps: 5000 };
  assert.equal(pointsValue(250, rule), 2500);
  assert.equal(maxRedeemablePoints(1000, 10_000, rule), 500);
  assert.equal(maxRedeemablePoints(300, 10_000, rule), 300);
  assert.equal(maxRedeemablePoints(1000, 1_500, rule), 0);
  assert.equal(maxRedeemablePoints(0, 10_000, rule), 0);
});

test("expiring and spendable points", () => {
  const lots = [{ points: 100, expiresOn: "2026-10-05" }, { points: 50, expiresOn: "2026-09-01" }, { points: 200, expiresOn: "2027-01-01" }, { points: 30 }];
  assert.deepEqual(expiringPoints(lots, "2026-09-30", 7), { points: 100, on: "2026-10-05" });
  assert.deepEqual(expiringPoints(lots, "2026-09-30", 0), { points: 0, on: null });
  assert.equal(spendablePoints(lots, "2026-09-30"), 330);
});

const base = { code: "WELCOME", type: "percent", value: 1500 };
const ctx = { subtotal: 20_000, today: "2026-09-30" };

test("evaluatePromo works out percent and fixed discounts", () => {
  assert.deepEqual(evaluatePromo(base, ctx), { valid: true, discount: 3000, total: 17_000 });
  assert.equal(evaluatePromo({ ...base, value: 1250 }, { ...ctx, subtotal: 10_001 }).discount, 1250); // 1250.125
  assert.equal(evaluatePromo({ ...base, maxDiscount: 2000 }, ctx).discount, 2000);
  assert.equal(evaluatePromo({ code: "F", type: "fixed", value: 5000 }, ctx).discount, 5000);
  assert.equal(evaluatePromo({ code: "F", type: "fixed", value: 50_000 }, ctx).total, 0);
});

test("evaluatePromo reports the first failing rule", () => {
  assert.equal(evaluatePromo({ ...base, active: false }, ctx).problem, "inactive");
  assert.equal(evaluatePromo({ ...base, startsOn: "2026-10-01" }, ctx).problem, "not-started");
  assert.equal(evaluatePromo({ ...base, endsOn: "2026-09-29" }, ctx).problem, "expired");
  assert.equal(evaluatePromo({ ...base, endsOn: "2026-09-30" }, ctx).valid, true);
  assert.equal(evaluatePromo({ ...base, minSubtotal: 25_000 }, ctx).problem, "min-subtotal");
  assert.equal(evaluatePromo({ ...base, maxRedemptions: 10 }, { ...ctx, redemptions: 10 }).problem, "exhausted");
  assert.equal(evaluatePromo({ ...base, perCustomer: 1 }, { ...ctx, customerRedemptions: 1 }).problem, "per-customer");
  assert.equal(evaluatePromo({ ...base, firstOrderOnly: true }, { ...ctx, firstOrder: false }).problem, "first-order");
  assert.equal(evaluatePromo({ ...base, firstOrderOnly: true }, ctx).valid, true);
});

test("promo codes are normalised and checked", () => {
  assert.equal(normalizePromoCode(" eid ٢٠٢٦ "), "EID2026");
  assert.equal(isPromoCodeFormat("eid-2026"), true);
  assert.equal(isPromoCodeFormat("ab"), false);
  assert.equal(isPromoCodeFormat("bad code!"), false);
  assert.equal(promoLive({ ...base, endsOn: "2026-09-29" }, "2026-09-30"), false);
  assert.equal(promoLive({ ...base, maxRedemptions: 2 }, "2026-09-30", 1), true);
});
