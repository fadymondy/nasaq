/* Pure loyalty and promo maths: tiers, points earned and redeemed, expiry, and promo-code rules. Money is an integer in minor
 * units; dates are "YYYY-MM-DD" keys. No React, so it runs under node --test. */

/** Half-up integer division. */
const divRound = (numerator: number, denominator: number) => (denominator === 0 ? 0 : Math.floor((numerator * 2 + denominator) / (denominator * 2)));

const dayMs = 86_400_000;
const dayNumber = (key: string) => Math.floor(Date.parse(`${key}T00:00:00Z`) / dayMs);

/* ------------------------------------------------------------------ tiers */

export interface LoyaltyTierLike {
  id: string;
  /** Lifetime points needed to reach the tier. The lowest tier is usually 0. */
  minPoints: number;
}

export interface LoyaltyTierState<T extends LoyaltyTierLike> {
  tier: T | undefined;
  next: T | undefined;
  /** Points still needed for `next`. 0 at the top tier. */
  toNext: number;
  /** 0 to 100 through the current tier. 100 at the top tier. */
  progress: number;
}

/** Where `lifetimePoints` puts a customer: the tier they hold, the next one, points to go and the percentage through. */
export function loyaltyTier<T extends LoyaltyTierLike>(lifetimePoints: number, tiers: readonly T[]): LoyaltyTierState<T> {
  const sorted = [...tiers].sort((a, b) => a.minPoints - b.minPoints);
  let tier: T | undefined;
  for (const t of sorted) if (lifetimePoints >= t.minPoints) tier = t;
  const next = sorted.find((t) => t.minPoints > lifetimePoints);
  if (!next) return { tier, next: undefined, toNext: 0, progress: 100 };
  const from = tier?.minPoints ?? 0;
  const span = next.minPoints - from;
  return { tier, next, toNext: next.minPoints - lifetimePoints, progress: span > 0 ? Math.max(0, Math.min(100, Math.floor(((lifetimePoints - from) / span) * 100))) : 0 };
}

/* ------------------------------------------------------------------ earning and redeeming */

export interface EarnRule {
  /** Points per whole currency unit spent (per 100 minor units). */
  pointsPerUnit: number;
  /** Tier bonus in basis points: 2000 is +20%. */
  bonusBps?: number;
}

/** Points for a purchase: whole points only, the fraction is dropped. `amount` is minor units. */
export function pointsEarned(amount: number, { pointsPerUnit, bonusBps = 0 }: EarnRule): number {
  if (amount <= 0 || pointsPerUnit <= 0) return 0;
  return Math.floor((amount * pointsPerUnit * (10_000 + bonusBps)) / (100 * 10_000));
}

export interface RedeemRule {
  /** What one point is worth, in minor units (1 is one piastre). */
  minorPerPoint: number;
  /** Fewest points that can be redeemed at once. */
  minPoints?: number;
  /** Most of an order that points may pay, in basis points: 5000 is half. */
  maxShareBps?: number;
}

/** The money `points` are worth. */
export const pointsValue = (points: number, { minorPerPoint }: RedeemRule): number => Math.max(0, Math.floor(points)) * minorPerPoint;

/**
 * How many points can be spent on an order: not more than the balance, not more than the allowed share of the order, and none
 * at all when that is under the minimum.
 */
export function maxRedeemablePoints(balance: number, orderTotal: number, rule: RedeemRule): number {
  if (balance <= 0 || orderTotal <= 0 || rule.minorPerPoint <= 0) return 0;
  const cap = Math.floor((orderTotal * (rule.maxShareBps ?? 10_000)) / 10_000);
  const usable = Math.min(Math.floor(balance), Math.floor(cap / rule.minorPerPoint));
  return usable < (rule.minPoints ?? 0) ? 0 : usable;
}

export interface PointsLot {
  /** Points still unspent from one earning. */
  points: number;
  /** The last day the points can be used, or undefined when they never expire. */
  expiresOn?: string;
}

/** Points that lapse within `withinDays` of `asOf` (inclusive), and the first day it happens. Already-lapsed lots are ignored. */
export function expiringPoints(lots: readonly PointsLot[], asOf: string, withinDays: number): { points: number; on: string | null } {
  const today = dayNumber(asOf);
  let points = 0;
  let on: string | null = null;
  for (const lot of lots) {
    if (!lot.expiresOn || lot.points <= 0) continue;
    const left = dayNumber(lot.expiresOn) - today;
    if (left < 0 || left > withinDays) continue;
    points += lot.points;
    if (on === null || lot.expiresOn < on) on = lot.expiresOn;
  }
  return { points, on };
}

/** Points that can still be spent on `asOf`: lots past their last day do not count. */
export const spendablePoints = (lots: readonly PointsLot[], asOf: string): number => lots.reduce((sum, l) => (l.expiresOn && l.expiresOn < asOf ? sum : sum + Math.max(0, l.points)), 0);

/* ------------------------------------------------------------------ promo codes */

export interface PromoLike {
  code: string;
  type: "percent" | "fixed";
  /** Percent: basis points (1500 is 15%). Fixed: minor units. */
  value: number;
  /** Cap on a percentage discount, minor units. */
  maxDiscount?: number;
  /** Smallest order the code applies to, minor units. */
  minSubtotal?: number;
  startsOn?: string;
  endsOn?: string;
  /** Total uses across everyone. */
  maxRedemptions?: number;
  /** Uses per customer. */
  perCustomer?: number;
  firstOrderOnly?: boolean;
  active?: boolean;
}

export interface PromoContext {
  /** Order value before the discount, minor units. */
  subtotal: number;
  today: string;
  /** Times the code has been used so far, by everyone. */
  redemptions?: number;
  /** Times this customer has used it. */
  customerRedemptions?: number;
  /** True when the customer has no earlier orders. */
  firstOrder?: boolean;
}

export type PromoProblem = "inactive" | "not-started" | "expired" | "min-subtotal" | "exhausted" | "per-customer" | "first-order";

export type PromoResult = { valid: true; discount: number; total: number } | { valid: false; problem: PromoProblem; discount: 0; total: number };

/** Uppercases and trims a code, dropping inner spaces. Arabic-Indic digits become Latin. */
export const normalizePromoCode = (input: string): string =>
  input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x660))
    .replace(/\s+/g, "")
    .toUpperCase();

/** Whether a code is well formed: 3 to 24 letters, digits, dashes or underscores. */
export const isPromoCodeFormat = (input: string): boolean => /^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(normalizePromoCode(input));

/**
 * Checks a promo against an order and works out the discount. A percentage is rounded half up and capped by `maxDiscount`; the
 * discount never exceeds the subtotal. Rules are checked in a fixed order, so the first failing rule is the reason returned.
 */
export function evaluatePromo(promo: PromoLike, ctx: PromoContext): PromoResult {
  const bad = (problem: PromoProblem): PromoResult => ({ valid: false, problem, discount: 0, total: ctx.subtotal });
  if (promo.active === false) return bad("inactive");
  if (promo.startsOn && ctx.today < promo.startsOn) return bad("not-started");
  if (promo.endsOn && ctx.today > promo.endsOn) return bad("expired");
  if (promo.maxRedemptions !== undefined && (ctx.redemptions ?? 0) >= promo.maxRedemptions) return bad("exhausted");
  if (promo.perCustomer !== undefined && (ctx.customerRedemptions ?? 0) >= promo.perCustomer) return bad("per-customer");
  if (promo.firstOrderOnly && ctx.firstOrder === false) return bad("first-order");
  if (promo.minSubtotal !== undefined && ctx.subtotal < promo.minSubtotal) return bad("min-subtotal");
  let discount = promo.type === "percent" ? divRound(ctx.subtotal * promo.value, 10_000) : promo.value;
  if (promo.type === "percent" && promo.maxDiscount !== undefined) discount = Math.min(discount, promo.maxDiscount);
  discount = Math.max(0, Math.min(discount, ctx.subtotal));
  return { valid: true, discount, total: ctx.subtotal - discount };
}

/** Whether a promo can still be used today, ignoring the order: active, in its dates and not used up. */
export function promoLive(promo: PromoLike, today: string, redemptions = 0): boolean {
  if (promo.active === false) return false;
  if (promo.startsOn && today < promo.startsOn) return false;
  if (promo.endsOn && today > promo.endsOn) return false;
  return promo.maxRedemptions === undefined || redemptions < promo.maxRedemptions;
}
