/** Change of `current` against `previous` as a fraction (0.124 is +12.4%). Undefined when there is nothing to compare. */
export function changeRatio(current: number, previous: number | undefined): number | undefined {
  if (previous === undefined || !Number.isFinite(previous) || !Number.isFinite(current)) return undefined;
  if (previous === 0) return current === 0 ? 0 : undefined;
  return (current - previous) / Math.abs(previous);
}

/** Local date of `"2026-09-29"` (never read as UTC, so the day does not shift) or any other date input. */
export function parseAnalyticsDay(value: Date | string | number): Date {
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  }
  return value instanceof Date ? value : new Date(value);
}

/** Sum, or mean when `mode` is "avg" (rates, positions). Empty input gives 0. */
export function aggregate(values: readonly number[], mode: "sum" | "avg" = "sum"): number {
  if (values.length === 0) return 0;
  const total = values.reduce((a, b) => a + b, 0);
  return mode === "avg" ? total / values.length : total;
}

/** Each value's share of the total, as fractions. All zeros give all zeros. */
export function shares(values: readonly number[]): number[] {
  const total = values.reduce((a, b) => a + Math.max(0, b), 0);
  return values.map((v) => (total > 0 ? Math.max(0, v) / total : 0));
}

/** Click-through rate as a fraction. Zero impressions give 0. */
export function clickThroughRate(clicks: number, impressions: number): number {
  return impressions > 0 ? clicks / impressions : 0;
}

/** "2m 14s", "1h 05m", "48s". Arabic uses the abbreviations د / س / ث. */
export function formatSeconds(totalSeconds: number, ar = false): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const u = ar ? { h: "س", m: "د", s: "ث" } : { h: "h", m: "m", s: "s" };
  if (h > 0) return `${h}${u.h} ${String(m).padStart(2, "0")}${u.m}`;
  if (m > 0) return `${m}${u.m} ${String(sec).padStart(2, "0")}${u.s}`;
  return `${sec}${u.s}`;
}

/** "12 ms", "1.24 s" for a latency in milliseconds. */
export function formatMillis(ms: number, ar = false): string {
  const unit = ar ? { ms: "مللي ث", s: "ث" } : { ms: "ms", s: "s" };
  if (ms >= 1000) return `${(ms / 1000).toFixed(ms >= 10_000 ? 1 : 2)} ${unit.s}`;
  return `${ms >= 100 ? Math.round(ms) : Math.round(ms * 10) / 10} ${unit.ms}`;
}

/** The country's flag as regional-indicator letters, or "" for anything that is not an ISO alpha-2 code. */
export function flagEmoji(code: string): string {
  if (!/^[A-Za-z]{2}$/.test(code)) return "";
  return [...code.toUpperCase()].map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join("");
}

/** The country's name in `locale`, falling back to the code. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}
