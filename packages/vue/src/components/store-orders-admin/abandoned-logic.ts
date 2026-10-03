/*
 * Abandoned carts: value, age, recovery status and whether another recovery email may go out. Pure, no React.
 * Time comes in as an argument (`now`), never from the clock, so it is testable.
 */
import type { CommerceAbandonedCart } from "./order-types";

/** A cart left behind. Lives in the shared model as `CommerceAbandonedCart`. */
export type AbandonedCart = CommerceAbandonedCart;

export type RecoveryStatus = "new" | "emailed" | "recovered" | "lost" | "no-email";

export interface RecoveryRules {
  /** A cart is only "abandoned" after this many idle minutes. Default 60. */
  minIdleMinutes?: number;
  /** Minimum hours between two emails. Default 24. */
  cooldownHours?: number;
  /** Most recovery emails per cart. Default 3. */
  maxEmails?: number;
  /** After this many idle days the cart counts as lost. Default 14. */
  lostAfterDays?: number;
}

const DEFAULTS = { minIdleMinutes: 60, cooldownHours: 24, maxEmails: 3, lostAfterDays: 14 } as const;
const MINUTE = 60_000;

export const cartValue = (cart: Pick<AbandonedCart, "lines">): number => cart.lines.filter((l) => !l.savedForLater).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
export const cartItemCount = (cart: Pick<AbandonedCart, "lines">): number => cart.lines.filter((l) => !l.savedForLater).reduce((s, l) => s + l.quantity, 0);

/** Idle minutes since the last activity, never negative. */
export const cartIdleMinutes = (cart: Pick<AbandonedCart, "lastActivityAt">, now: number | Date): number =>
  Math.max(0, Math.floor((new Date(now).getTime() - new Date(cart.lastActivityAt).getTime()) / MINUTE));

export function recoveryStatus(cart: AbandonedCart, now: number | Date, rules: RecoveryRules = {}): RecoveryStatus {
  const r = { ...DEFAULTS, ...rules };
  if (cart.recoveredOrderId) return "recovered";
  if (cartIdleMinutes(cart, now) >= r.lostAfterDays * 24 * 60) return "lost";
  if (!cart.customer?.email) return "no-email";
  return cart.emailsSent > 0 ? "emailed" : "new";
}

export type RecoveryBlock = "recovered" | "lost" | "no-email" | "too-soon" | "cooldown" | "limit";

/** Whether another recovery email may go out now, and if not, why. `waitMinutes` says how long a cooldown has left. */
export function canSendRecovery(cart: AbandonedCart, now: number | Date, rules: RecoveryRules = {}): { ok: boolean; reason?: RecoveryBlock; waitMinutes?: number } {
  const r = { ...DEFAULTS, ...rules };
  const status = recoveryStatus(cart, now, rules);
  if (status === "recovered" || status === "lost" || status === "no-email") return { ok: false, reason: status };
  const idle = cartIdleMinutes(cart, now);
  if (idle < r.minIdleMinutes) return { ok: false, reason: "too-soon", waitMinutes: r.minIdleMinutes - idle };
  if (cart.emailsSent >= r.maxEmails) return { ok: false, reason: "limit" };
  if (cart.lastEmailAt) {
    const since = Math.floor((new Date(now).getTime() - new Date(cart.lastEmailAt).getTime()) / MINUTE);
    const wait = r.cooldownHours * 60 - since;
    if (wait > 0) return { ok: false, reason: "cooldown", waitMinutes: wait };
  }
  return { ok: true };
}

export interface RecoveryStats {
  carts: number;
  /** Value of carts that could still come back (new or emailed), minor units. */
  atRisk: number;
  recovered: number;
  recoveredValue: number;
  lost: number;
  /** Recovered share of carts that were emailed or recovered, in basis points (2500 = 25%). */
  rateBps: number;
}

export function recoveryStats(carts: readonly AbandonedCart[], now: number | Date, rules: RecoveryRules = {}): RecoveryStats {
  const stats: RecoveryStats = { carts: carts.length, atRisk: 0, recovered: 0, recoveredValue: 0, lost: 0, rateBps: 0 };
  let emailedOrRecovered = 0;
  for (const cart of carts) {
    const status = recoveryStatus(cart, now, rules);
    if (status === "recovered") {
      stats.recovered += 1;
      stats.recoveredValue += cartValue(cart);
      emailedOrRecovered += 1;
    } else if (status === "lost") stats.lost += 1;
    else {
      stats.atRisk += cartValue(cart);
      if (status === "emailed") emailedOrRecovered += 1;
    }
  }
  stats.rateBps = emailedOrRecovered ? Math.round((stats.recovered * 10000) / emailedOrRecovered) : 0;
  return stats;
}

/** A recovery discount: `percent` of the cart value, rounded down, capped at `cap` when given. */
export function recoveryDiscount(value: number, percent: number, cap?: number): number {
  const off = Math.floor((Math.max(value, 0) * Math.min(Math.max(percent, 0), 100)) / 100);
  return cap !== undefined ? Math.min(off, cap) : off;
}
