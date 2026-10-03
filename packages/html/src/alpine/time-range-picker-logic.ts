/*
 * Time range maths. A range is one of: a relative window ending now ("24h"), a calendar week ("week" plus its first
 * day) or custom calendar days. Calendar days are plain "YYYY-MM-DD" strings, so they never shift with the reader's
 * clock; they turn into instants only through a named IANA time zone. Pure, so the tests can run it in node.
 * A resolved range is `[from, to)`: `to` is exclusive (the start of the next day for day based ranges).
 */

export type TimeRangeUnit = "m" | "h" | "d";
/** A relative window: minutes, hours or days back from now, such as "30m", "6h" or "7d". */
export type RelativePreset = `${number}${TimeRangeUnit}`;
export type TimeComparison = "none" | "previous" | "year";
export type TimeRangeWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TimeRangeValue =
  | { kind: "relative"; preset: RelativePreset }
  /** `start` is the first day of the week, "YYYY-MM-DD". */
  | { kind: "week"; start: string }
  /** Inclusive calendar days, "YYYY-MM-DD". */
  | { kind: "custom"; from: string; to: string };

export interface ResolvedTimeRange {
  from: Date;
  /** Exclusive end. */
  to: Date;
}

export interface TimeRangeContext {
  /** "Now". Default: the current time. */
  now?: Date;
  /** IANA zone the days are read in, such as "Asia/Riyadh". Default "UTC". */
  timeZone?: string;
  /** First day of the week, 0 = Sunday. Default 1 (Monday). */
  weekStartsOn?: TimeRangeWeekday;
}

export const TIME_RANGE_PRESETS: readonly RelativePreset[] = ["1h", "6h", "24h", "7d", "30d"];

const DAY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const PRESET_RE = /^(\d{1,4})(m|h|d)$/;
const UNIT_MS: Record<TimeRangeUnit, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };

/** True for a real calendar day such as "2026-02-28" ("2026-02-30" is not). */
export function isDay(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const m = DAY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toISOString().slice(0, 10) === value;
}

function dayToUtc(day: string): number {
  const m = DAY_RE.exec(day);
  if (!m) throw new RangeError(`Not a calendar day: ${day}`);
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

const utcToDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The day `n` calendar days after `day` (negative for before). */
export function addDays(day: string, n: number): string {
  return utcToDay(dayToUtc(day) + n * 86_400_000);
}

/** Days from `a` to `b` (b minus a), so a day to itself is 0. */
export function diffDays(a: string, b: string): number {
  return Math.round((dayToUtc(b) - dayToUtc(a)) / 86_400_000);
}

/** Inclusive number of days from `from` to `to`. */
export const countDays = (from: string, to: string) => diffDays(from, to) + 1;

/** `n` calendar months after `day`, clamped to the end of a short month (Jan 31 + 1 month = Feb 28). */
export function addMonths(day: string, n: number): string {
  const d = new Date(dayToUtc(day));
  const target = d.getUTCFullYear() * 12 + d.getUTCMonth() + n;
  const year = Math.floor(target / 12);
  const month = ((target % 12) + 12) % 12;
  const last = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return utcToDay(Date.UTC(year, month, Math.min(d.getUTCDate(), last)));
}

/** Same day `n` years on, clamped (Feb 29 goes to Feb 28 in a common year). */
export const addYears = (day: string, n: number) => addMonths(day, n * 12);

/** 0 = Sunday for a calendar day. */
export function weekdayOf(day: string): TimeRangeWeekday {
  return new Date(dayToUtc(day)).getUTCDay() as TimeRangeWeekday;
}

/** The first day of the week that contains `day`. */
export function startOfWeek(day: string, weekStartsOn: TimeRangeWeekday = 1): string {
  const back = (weekdayOf(day) - weekStartsOn + 7) % 7;
  return addDays(day, -back);
}

/** Whether the zone name is one Intl knows. */
export function isTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

const formatters = new Map<string, Intl.DateTimeFormat>();
function zoneFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
    formatters.set(timeZone, f);
  }
  return f;
}

/** The zone's offset from UTC at `instant`, in milliseconds (Riyadh is +10_800_000). */
export function zoneOffsetMs(instant: Date, timeZone: string): number {
  const parts: Record<string, number> = {};
  for (const p of zoneFormatter(timeZone).formatToParts(instant)) if (p.type !== "literal") parts[p.type] = Number(p.value);
  const asUtc = Date.UTC(parts.year!, parts.month! - 1, parts.day!, parts.hour! % 24, parts.minute!, parts.second!);
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The calendar day `instant` falls on in the zone. */
export function dayInZone(instant: Date, timeZone = "UTC"): string {
  return utcToDay(instant.getTime() + zoneOffsetMs(instant, timeZone));
}

/** The instant a calendar day starts in the zone. Daylight saving days come out 23 or 25 hours long. */
export function startOfDayInZone(day: string, timeZone = "UTC"): Date {
  const wall = dayToUtc(day);
  let guess = wall - zoneOffsetMs(new Date(wall), timeZone);
  guess = wall - zoneOffsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** "UTC+03:00" style label for the zone's offset at `instant`. */
export function zoneOffsetLabel(instant: Date, timeZone = "UTC"): string {
  const min = Math.round(zoneOffsetMs(instant, timeZone) / 60_000);
  const sign = min < 0 ? "-" : "+";
  const abs = Math.abs(min);
  return `UTC${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

/** Amount and unit of a relative preset, or null when the text is not one. */
export function parsePreset(preset: string): { amount: number; unit: TimeRangeUnit } | null {
  const m = PRESET_RE.exec(preset);
  if (!m || Number(m[1]) < 1) return null;
  return { amount: Number(m[1]), unit: m[2] as TimeRangeUnit };
}

/** The relative window in milliseconds, or 0 for an invalid preset. */
export function presetMs(preset: string): number {
  const p = parsePreset(preset);
  return p ? p.amount * UNIT_MS[p.unit] : 0;
}

/** Puts two days in order. */
export function orderDays(a: string, b: string): { from: string; to: string } {
  return a <= b ? { from: a, to: b } : { from: b, to: a };
}

/** The week of `now` in the zone. */
export function currentWeek(ctx: TimeRangeContext = {}): TimeRangeValue {
  const { now = new Date(), timeZone = "UTC", weekStartsOn = 1 } = ctx;
  return { kind: "week", start: startOfWeek(dayInZone(now, timeZone), weekStartsOn) };
}

/** The week `n` weeks after (or before, when negative) a week value. Other kinds are returned unchanged. */
export function shiftWeek(value: TimeRangeValue, n: number): TimeRangeValue {
  return value.kind === "week" ? { kind: "week", start: addDays(value.start, n * 7) } : value;
}

/** True when the week starts after today (nothing has happened in it yet). */
export function isFutureWeek(value: TimeRangeValue, ctx: TimeRangeContext = {}): boolean {
  if (value.kind !== "week") return false;
  const { now = new Date(), timeZone = "UTC" } = ctx;
  return value.start > dayInZone(now, timeZone);
}

/** Turns a value into the instants it covers, `[from, to)`. */
export function resolveTimeRange(value: TimeRangeValue, ctx: TimeRangeContext = {}): ResolvedTimeRange {
  const { now = new Date(), timeZone = "UTC" } = ctx;
  if (value.kind === "relative") {
    const ms = presetMs(value.preset);
    if (!ms) throw new RangeError(`Not a relative preset: ${value.preset}`);
    return { from: new Date(now.getTime() - ms), to: new Date(now.getTime()) };
  }
  if (value.kind === "week") return { from: startOfDayInZone(value.start, timeZone), to: startOfDayInZone(addDays(value.start, 7), timeZone) };
  const { from, to } = orderDays(value.from, value.to);
  return { from: startOfDayInZone(from, timeZone), to: startOfDayInZone(addDays(to, 1), timeZone) };
}

/** The range straight before (or one year before) a value, for "vs previous period". `none` gives null. */
export function comparisonRange(value: TimeRangeValue, mode: TimeComparison, ctx: TimeRangeContext = {}): ResolvedTimeRange | null {
  if (mode === "none") return null;
  const { timeZone = "UTC" } = ctx;
  const current = resolveTimeRange(value, ctx);
  if (value.kind === "relative") {
    if (mode === "previous") return { from: new Date(current.from.getTime() - (current.to.getTime() - current.from.getTime())), to: new Date(current.from.getTime()) };
    const back = (d: Date) => {
      const c = new Date(d.getTime());
      c.setUTCFullYear(c.getUTCFullYear() - 1);
      return c;
    };
    return { from: back(current.from), to: back(current.to) };
  }
  const first = value.kind === "week" ? value.start : orderDays(value.from, value.to).from;
  const last = value.kind === "week" ? addDays(value.start, 6) : orderDays(value.from, value.to).to;
  if (mode === "year") return { from: startOfDayInZone(addYears(first, -1), timeZone), to: startOfDayInZone(addDays(addYears(last, -1), 1), timeZone) };
  // Previous period: the same number of calendar days straight before, so a daylight saving change cannot skew it.
  const n = countDays(first, last);
  return { from: startOfDayInZone(addDays(first, -n), timeZone), to: startOfDayInZone(first, timeZone) };
}

/** The inclusive last day of a resolved range, in the zone. */
export function lastDayOf(range: ResolvedTimeRange, timeZone = "UTC"): string {
  return dayInZone(new Date(range.to.getTime() - 1), timeZone);
}

/** Compact text for URLs: "24h", "week:2026-09-27", "2026-09-01..2026-09-15". */
export function serializeTimeRange(value: TimeRangeValue): string {
  if (value.kind === "relative") return value.preset;
  if (value.kind === "week") return `week:${value.start}`;
  const { from, to } = orderDays(value.from, value.to);
  return `${from}..${to}`;
}

/** Reads `serializeTimeRange` output. Anything unreadable gives null so the caller can fall back to a default. */
export function parseTimeRange(text: string | null | undefined): TimeRangeValue | null {
  if (!text) return null;
  if (parsePreset(text)) return { kind: "relative", preset: text as RelativePreset };
  if (text.startsWith("week:")) {
    const start = text.slice(5);
    return isDay(start) ? { kind: "week", start } : null;
  }
  const [from, to, ...rest] = text.split("..");
  if (rest.length === 0 && isDay(from) && isDay(to)) return { kind: "custom", ...orderDays(from, to) };
  return null;
}

/** Whether two values cover the same thing. */
export function sameTimeRange(a: TimeRangeValue, b: TimeRangeValue): boolean {
  return serializeTimeRange(a) === serializeTimeRange(b);
}
