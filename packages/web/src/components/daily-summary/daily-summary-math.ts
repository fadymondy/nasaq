/*
 * Pure helpers for the daily summary: civil-date arithmetic and the "is anything here" check.
 * A civil date is `YYYY-MM-DD` in the person's own timezone. It is a label for a day, not an instant.
 */

/** Adds whole days to a civil date. Uses UTC arithmetic so a daylight-saving change never skips or repeats a day. */
export function addCivilDays(date: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + days));
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
}

export function isCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return addCivilDays(value, 0) === value;
}

/** True when the date is after `max` (both civil dates). ISO dates sort as text. */
export function isAfter(date: string, max: string): boolean {
  return date > max;
}

/** Sleep in minutes to whole seconds, for `Duration`. */
export function minutesToSeconds(minutes: number): number {
  return Math.round(minutes * 60);
}

/** Meals or drinks split by kind. The parts should add up to `total`; when they do not, the surplus is "unclassified", never dropped. */
export function unclassifiedCount(total: number, ...parts: number[]): number {
  return Math.max(0, total - parts.reduce((a, b) => a + b, 0));
}
