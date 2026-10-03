/** Pure helpers for usage meters: how full a limit is, which tone that is, overage cost and budget burn. */

export type UsageTone = "ok" | "warning" | "danger" | "over";

export interface UsageThresholds {
  /** Fraction of the limit at which the meter turns warning. Default 0.75. */
  warnAt?: number;
  /** Fraction of the limit at which the meter turns danger. Default 0.9. */
  dangerAt?: number;
}

/** `used / limit`. `null` (unlimited) and a zero limit with nothing used are 0; a zero limit that is used is 1. Not clamped. */
export function usageFraction(used: number, limit: number | null): number {
  if (limit === null) return 0;
  if (limit <= 0) return used > 0 ? 1 : 0;
  return Math.max(0, used) / limit;
}

/** `over` past the limit, then `danger` from `dangerAt`, `warning` from `warnAt`, otherwise `ok`. Unlimited is always `ok`. */
export function usageTone(used: number, limit: number | null, { warnAt = 0.75, dangerAt = 0.9 }: UsageThresholds = {}): UsageTone {
  if (limit === null) return "ok";
  if (used > limit) return "over";
  const f = usageFraction(used, limit);
  if (f >= dangerAt) return "danger";
  if (f >= warnAt) return "warning";
  return "ok";
}

export interface OverageItem {
  used: number;
  /** `null` is unlimited: never any overage. */
  limit: number | null;
  /** Price of each unit past the limit. Without it the item has no overage price. */
  overageRate?: number;
}

/** What going past the limit costs: the units over the limit times the rate. 0 within the limit, unlimited or unpriced. */
export function overageAmount({ used, limit, overageRate }: OverageItem): number {
  if (limit === null || overageRate === undefined) return 0;
  return Math.max(0, used - limit) * overageRate;
}

export function overageTotal(items: readonly OverageItem[]): number {
  return items.reduce((sum, item) => sum + overageAmount(item), 0);
}

export interface BurnProjection {
  /** Where the period ends up if the spend rate so far holds. */
  projected: number;
  /** The projection is past the budget. */
  willExceed: boolean;
  /** How far past the budget, 0 when within it. */
  overBy: number;
  /** What is left of the budget, never negative. */
  remaining: number;
}

/** Linear burn: `elapsed` is the fraction of the period gone (0..1). Before the period starts the projection is the spend so far. */
export function burnProjection(used: number, budget: number, elapsed: number): BurnProjection {
  const e = Math.min(1, Math.max(0, elapsed));
  const projected = e > 0 ? used / e : used;
  return { projected, willExceed: projected > budget, overBy: Math.max(0, projected - budget), remaining: Math.max(0, budget - used) };
}
