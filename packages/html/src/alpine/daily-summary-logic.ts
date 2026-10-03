// Civil-date arithmetic, copied from the React daily-summary-math.ts. A civil date is YYYY-MM-DD, a label for a day, not an instant.

/** Adds whole days to a civil date. UTC arithmetic: a daylight-saving change never skips or repeats a day. */
export function addCivilDays(date: string, days: number): string {
  const [y = 1970, m = 1, d = 1] = date.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d + days));
  return `${at.getUTCFullYear()}-${String(at.getUTCMonth() + 1).padStart(2, "0")}-${String(at.getUTCDate()).padStart(2, "0")}`;
}
