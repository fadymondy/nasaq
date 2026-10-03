/** Pure date math for the Calendar. Local-time dates at 00:00; no time zones, no dependencies. */

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

/** Adds months and clamps the day (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

export const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Negative, zero or positive: day order, ignoring the time of day. */
export const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();

export function clampDay(d: Date, min?: Date, max?: Date) {
  if (min && compareDays(d, min) < 0) return startOfDay(min);
  if (max && compareDays(d, max) > 0) return startOfDay(max);
  return startOfDay(d);
}

/** Stable key for `data-date` and lookups: "2026-09-29" (local date, not UTC). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** First day of the week for a locale, 0 = Sunday … 6 = Saturday. `Intl.Locale` weekInfo where available, else a small regional fallback. */
export function getWeekStartsOn(locale: string): WeekDay {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    // Intl numbers days 1 = Monday … 7 = Sunday.
    if (info) return (info.firstDay % 7) as WeekDay;
    const maximized = loc.maximize();
    return fallbackWeekStart(maximized.language, maximized.region);
  } catch {
    return 0;
  }
}

const SATURDAY_REGIONS = new Set(["AE", "AF", "BH", "DJ", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SD", "SY"]);
const SUNDAY_REGIONS = new Set(["SA", "US", "CA", "IL", "JP", "IN", "BR", "MX", "PH", "KR", "TW", "YE"]);

function fallbackWeekStart(language: string, region?: string): WeekDay {
  if (region && SATURDAY_REGIONS.has(region)) return 6;
  if (region && SUNDAY_REGIONS.has(region)) return 0;
  if (!region && language === "ar") return 6;
  return region ? 1 : 0;
}

/** The 7 weekday indexes (0 = Sunday) in display order. */
export const weekOrder = (weekStartsOn: WeekDay) => Array.from({ length: 7 }, (_, i) => ((weekStartsOn + i) % 7) as WeekDay);

/** Start of the week containing `d`. */
export function startOfWeek(d: Date, weekStartsOn: WeekDay) {
  return addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));
}

export function endOfWeek(d: Date, weekStartsOn: WeekDay) {
  return addDays(startOfWeek(d, weekStartsOn), 6);
}

/**
 * The weeks of a month as rows of 7 dates, including the outside days that pad the first and last row
 * (4 to 6 rows). Pass `fixedWeeks` for a constant 6 rows so the grid does not change height.
 */
export function monthMatrix(month: Date, weekStartsOn: WeekDay, fixedWeeks = false) {
  const first = startOfMonth(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  let cursor = startOfWeek(first, weekStartsOn);
  const rows: Date[][] = [];
  const total = fixedWeeks ? 6 : Math.ceil(((first.getDay() - weekStartsOn + 7) % 7 + last.getDate()) / 7);
  for (let r = 0; r < total; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    rows.push(row);
  }
  return rows;
}
