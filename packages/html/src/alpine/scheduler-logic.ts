/** Pure layout math for the Scheduler: no framework, no DOM. Local-time dates. */

// A copy of the React scheduler-math.ts plus the calendar date helpers it leans on, so scheduler.ts is self-contained.
export const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
export const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export type SchedulerTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";
export type SchedulerView = "day" | "week" | "month";

export interface SchedulerEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  tone?: SchedulerTone;
}

export interface WorkingHours {
  /** First visible hour, 0-23. */
  start: number;
  /** Hour the grid ends at, 1-24 (exclusive). */
  end: number;
}

export interface PositionedEvent {
  event: SchedulerEvent;
  /** Minutes from the top of the visible range. */
  top: number;
  /** Length in minutes inside the visible range. */
  height: number;
  /** 0-based column inside its overlap cluster. */
  column: number;
  /** Number of columns in the cluster. */
  columns: number;
}

export const MINUTES_PER_DAY = 24 * 60;

/** Minutes since local midnight of `day` (may be negative or above 1440 when `d` is on another day). */
export const minutesSince = (d: Date, day: Date) => Math.round((d.getTime() - startOfDay(day).getTime()) / 60000);

/** Clamp the configured hours to a valid, non-empty range. */
export function normalizeHours(hours: WorkingHours): WorkingHours {
  const start = Math.min(Math.max(Math.floor(hours.start), 0), 23);
  const end = Math.min(Math.max(Math.ceil(hours.end), start + 1), 24);
  return { start, end };
}

/** Slot start times, in minutes from midnight, covering the working hours. */
export function timeSlots(hours: WorkingHours, slotMinutes: number): number[] {
  const { start, end } = normalizeHours(hours);
  const step = Math.max(Math.floor(slotMinutes), 5);
  const out: number[] = [];
  for (let m = start * 60; m < end * 60; m += step) out.push(m);
  return out;
}

/** True when the event touches the calendar day (an event ending exactly at midnight does not touch the next day). */
export function eventOnDay(event: SchedulerEvent, day: Date) {
  const s = startOfDay(day).getTime();
  const e = addDays(startOfDay(day), 1).getTime();
  const end = Math.max(event.end.getTime(), event.start.getTime());
  return event.start.getTime() < e && (end > s || (end === s && event.start.getTime() === s));
}

/** Events touching a day, sorted by start then by longest first. */
export function eventsForDay(events: SchedulerEvent[], day: Date) {
  return events
    .filter((e) => eventOnDay(e, day))
    .sort((a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime() || a.id.localeCompare(b.id));
}

/**
 * Positions one day's events inside the visible range `[rangeStart, rangeEnd)` (minutes from midnight).
 * Events that overlap in time form a cluster; inside a cluster each event takes the first free column, so
 * `columns` is the most events shown side by side. Events outside the range are dropped; ones that cross
 * it are clipped. Zero-length events get `minLength` minutes so they stay clickable.
 */
export function layoutDayEvents(events: SchedulerEvent[], day: Date, rangeStart: number, rangeEnd: number, minLength = 15): PositionedEvent[] {
  const items = eventsForDay(events, day)
    .map((event) => {
      const s = Math.max(minutesSince(event.start, day), rangeStart);
      const rawEnd = Math.min(minutesSince(event.end, day), rangeEnd);
      const e = Math.max(rawEnd, Math.min(s + minLength, rangeEnd));
      return { event, s, e };
    })
    .filter((i) => i.s < rangeEnd && i.e > rangeStart && i.s < i.e);

  const out: PositionedEvent[] = [];
  let cluster: { event: SchedulerEvent; s: number; e: number; column: number }[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    for (const c of cluster) out.push({ event: c.event, top: c.s - rangeStart, height: c.e - c.s, column: c.column, columns: colEnds.length });
    cluster = [];
    colEnds = [];
    clusterEnd = -Infinity;
  };
  for (const item of items) {
    if (item.s >= clusterEnd) flush();
    let column = colEnds.findIndex((end) => end <= item.s);
    if (column === -1) column = colEnds.length;
    colEnds[column] = item.e;
    cluster.push({ ...item, column });
    clusterEnd = Math.max(clusterEnd, item.e);
  }
  flush();
  return out;
}

/** Percent geometry for a positioned event, ready for `style`. */
export function eventBox(p: PositionedEvent, rangeMinutes: number) {
  return {
    top: (p.top / rangeMinutes) * 100,
    height: (p.height / rangeMinutes) * 100,
    insetInlineStart: (p.column / p.columns) * 100,
    width: (1 / p.columns) * 100,
  };
}

/** Steps the anchor date by one view unit: a day, a week or a month. */
export function stepDate(view: SchedulerView, date: Date, direction: 1 | -1) {
  if (view === "month") return new Date(date.getFullYear(), date.getMonth() + direction, 1);
  return addDays(date, (view === "week" ? 7 : 1) * direction);
}

/** Splits a day's events into the chips that fit and the overflow count. */
export function splitChips(events: SchedulerEvent[], max: number) {
  if (events.length <= max) return { visible: events, hidden: 0 };
  // Keep one line for the "+N more" trigger: it replaces the last chip.
  const visible = events.slice(0, Math.max(max - 1, 0));
  return { visible, hidden: events.length - visible.length };
}

/* ------------------------------------------------------------------ calendar date helpers (calendar-math.ts) */

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
export const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
export const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();

/** Stable key for `data-date` and lookups: "2026-09-29" (local date, not UTC). */
export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "2026-09-15" (or a longer ISO string) to a local Date, or null. */
export function parseDay(key: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const SATURDAY_REGIONS = new Set(["AE", "AF", "BH", "DJ", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SD", "SY"]);
const SUNDAY_REGIONS = new Set(["SA", "US", "CA", "IL", "JP", "IN", "BR", "MX", "PH", "KR", "TW", "YE"]);

/** First day of the week for a locale, 0 = Sunday … 6 = Saturday. */
export function getWeekStartsOn(locale: string): WeekDay {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (info) return (info.firstDay % 7) as WeekDay;
    const { language, region } = loc.maximize();
    if (region && SATURDAY_REGIONS.has(region)) return 6;
    if (region && SUNDAY_REGIONS.has(region)) return 0;
    if (!region && language === "ar") return 6;
    return region ? 1 : 0;
  } catch {
    return 0;
  }
}

export const startOfWeek = (d: Date, weekStartsOn: WeekDay) => addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));

/** The weeks of a month as rows of 7 dates, including the outside days that pad the first and last row. */
export function monthMatrix(month: Date, weekStartsOn: WeekDay) {
  const first = startOfMonth(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  let cursor = startOfWeek(first, weekStartsOn);
  const rows: Date[][] = [];
  const total = Math.ceil((((first.getDay() - weekStartsOn + 7) % 7) + last.getDate()) / 7);
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
