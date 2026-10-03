export type ApiKeyStatus = "active" | "expiring" | "expired" | "revoked";

export type DateLike = Date | number | string;

const toMs = (v: DateLike) => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

/** A key that expires within this many days is flagged "expiring". */
export const EXPIRING_DAYS = 7;

/** `nsq_live_a1b2••••••••wxyz`: the public prefix and the last four characters, never the secret. */
export function maskKey(prefix: string, last4?: string, dots = 8): string {
  return `${prefix}${"•".repeat(dots)}${last4 ?? ""}`;
}

export function keyStatus(key: { revokedAt?: DateLike | null; expiresAt?: DateLike | null }, now: number = Date.now()): ApiKeyStatus {
  if (key.revokedAt != null) return "revoked";
  if (key.expiresAt == null) return "active";
  const left = toMs(key.expiresAt) - now;
  if (left <= 0) return "expired";
  return left <= EXPIRING_DAYS * 86_400_000 ? "expiring" : "active";
}

/** The expiry date for "in N days", or null for "never". */
export function expiryFromDays(days: number | null, now: number = Date.now()): number | null {
  return days == null ? null : now + days * 86_400_000;
}

/** Whole days until the key expires, rounded up; negative once expired; null when it never expires. */
export function daysLeft(expiresAt: DateLike | null | undefined, now: number = Date.now()): number | null {
  if (expiresAt == null) return null;
  return Math.ceil((toMs(expiresAt) - now) / 86_400_000);
}

/** Toggle a scope id in a list, keeping the original order of `all`. */
export function toggleScope(selected: readonly string[], id: string, all: readonly string[]): string[] {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return all.filter((s) => next.has(s));
}
