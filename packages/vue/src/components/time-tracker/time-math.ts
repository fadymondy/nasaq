/* Pure time helpers for the time tracker. Durations are whole seconds, dates are local "YYYY-MM-DD" keys. */

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** 3725 -> "1:02:05" (clock, for the running timer). */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 3600)}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(s % 60)}`;
}

/** 5400 -> "1:30" (hours:minutes, for entries and timesheet cells; seconds are dropped, not rounded up). */
export function formatHours(totalSeconds: number): string {
  const m = Math.floor(Math.max(0, totalSeconds) / 60);
  return `${Math.floor(m / 60)}:${pad2(m % 60)}`;
}

const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const latin = (s: string) => s.replace(ARABIC_DIGITS, (d) => String(d.charCodeAt(0) & 0xf));

/**
 * Reads what people type into a duration field: "1:30", "1.5", "1.5h", "90m", "2h 15m", "45". A bare number
 * with no unit is hours when it has a decimal point or is at most 12, otherwise minutes. Returns seconds, or
 * null when it cannot be read.
 */
export function parseDuration(input: string): number | null {
  const text = latin(input).trim().toLowerCase().replace(",", ".").replace("٫", ".");
  if (!text) return null;
  const clock = /^(\d{1,3}):([0-5]?\d)(?::([0-5]?\d))?$/.exec(text);
  if (clock) return Number(clock[1]) * 3600 + Number(clock[2]) * 60 + Number(clock[3] ?? 0);
  const units = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?)?$/.exec(text);
  if (units && (units[1] || units[2])) return Math.round(Number(units[1] ?? 0) * 3600 + Number(units[2] ?? 0) * 60);
  const bare = /^(\d+(?:\.\d+)?)$/.exec(text);
  if (bare) {
    const n = Number(bare[1]);
    return Math.round(text.includes(".") || n <= 12 ? n * 3600 : n * 60);
  }
  return null;
}

/** "09:30" -> minutes since midnight, or null. */
export function parseTime(input: string): number | null {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(latin(input).trim());
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Local date key: 2026-09-29. */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export function fromDateKey(key: string): Date {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export const addDays = (d: Date, days: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + days);

/** The first day of the week containing `date`. `weekStartsOn`: 0 Sunday … 6 Saturday. */
export function startOfWeek(date: Date, weekStartsOn = 0): Date {
  const diff = (date.getDay() - weekStartsOn + 7) % 7;
  return addDays(new Date(date.getFullYear(), date.getMonth(), date.getDate()), -diff);
}

/** Seven consecutive date keys from `start`. */
export const weekKeys = (start: Date) => Array.from({ length: 7 }, (_, i) => dateKey(addDays(start, i)));

export interface Timed {
  date: string;
  seconds: number;
}

/** Sum of seconds per date key. */
export function totalsByDate(entries: readonly Timed[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.date, (map.get(e.date) ?? 0) + e.seconds);
  return map;
}

export const sumSeconds = (entries: readonly { seconds: number }[]) => entries.reduce((total, e) => total + e.seconds, 0);

export interface GridRow {
  key: string;
  /** Seconds per date key of the visible days. */
  cells: Record<string, number>;
  total: number;
}

/**
 * Pivots entries into timesheet rows: one per `rowKey(entry)` in first-seen order, with seconds per visible
 * day, a row total, and column totals for the days.
 */
export function buildGrid<T extends Timed>(entries: readonly T[], days: readonly string[], rowKey: (entry: T) => string) {
  const visible = new Set(days);
  const rows = new Map<string, GridRow>();
  const columns: Record<string, number> = Object.fromEntries(days.map((d) => [d, 0]));
  for (const e of entries) {
    if (!visible.has(e.date)) continue;
    const key = rowKey(e);
    const row = rows.get(key) ?? { key, cells: {}, total: 0 };
    row.cells[e.date] = (row.cells[e.date] ?? 0) + e.seconds;
    row.total += e.seconds;
    columns[e.date] = (columns[e.date] ?? 0) + e.seconds;
    rows.set(key, row);
  }
  return { rows: [...rows.values()], columns, total: Object.values(columns).reduce((a, b) => a + b, 0) };
}
