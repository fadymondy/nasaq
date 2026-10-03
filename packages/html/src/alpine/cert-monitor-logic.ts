// Pure helpers for the certificate monitor (a copy of the React cert-format.ts): days left, status and tone, summaries.

export type CertStatus = "valid" | "expiring" | "critical" | "expired" | "error";
export type CertTone = "success" | "warning" | "danger" | "neutral";

const DAY = 86_400_000;

/** Whole days from `now` until `validTo`. Negative once expired. Rounds down, so "0" still means "expires today". NaN input gives null. */
export function certDaysLeft(validTo: Date | number | string, now: Date | number = Date.now()): number | null {
  const end = new Date(validTo).getTime();
  const from = new Date(now).getTime();
  if (!Number.isFinite(end) || !Number.isFinite(from)) return null;
  return Math.floor((end - from) / DAY);
}

export interface CertThresholds {
  /** At or below this many days the badge is a warning. Default 30. */
  warnDays: number;
  /** At or below this many days it is critical. Default 7. */
  criticalDays: number;
}
export const DEFAULT_THRESHOLDS: CertThresholds = { warnDays: 30, criticalDays: 7 };

export function certStatus(days: number | null, th: CertThresholds = DEFAULT_THRESHOLDS): CertStatus {
  if (days === null) return "error";
  if (days < 0) return "expired";
  if (days <= th.criticalDays) return "critical";
  if (days <= th.warnDays) return "expiring";
  return "valid";
}

export function certTone(status: CertStatus): CertTone {
  return status === "valid" ? "success" : status === "expiring" ? "warning" : status === "critical" || status === "expired" ? "danger" : "neutral";
}

/** Sort key: soonest expiry first, unknown last. */
export const byExpiry = (a: number | null, b: number | null): number => (a ?? Infinity) - (b ?? Infinity);

export function summarizeCerts(list: readonly (number | null)[], th: CertThresholds = DEFAULT_THRESHOLDS) {
  const out = { total: list.length, valid: 0, expiring: 0, critical: 0, expired: 0, error: 0 };
  for (const d of list) out[certStatus(d, th)] += 1;
  return out;
}

/** True for a plain hostname or wildcard like *.example.com. */
export const isValidCertHost = (h: string): boolean => /^(\*\.)?([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(h.trim());
