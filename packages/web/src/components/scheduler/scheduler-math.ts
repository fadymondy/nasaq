/** Pure layout math for the Scheduler: no React, no DOM. Local-time dates. */

// Self-contained on purpose: `node --test` loads this file directly and cannot resolve extensionless imports.
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

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
