/**
 * Pure logic for a provider's availability: weekly hours with breaks, and vacations. Validation, lookup by date and
 * editing helpers. No React, no DOM. Self-contained on purpose: `node --test` loads it directly.
 */

export interface AvailabilityRange {
  /** "HH:mm", 24 hour. */
  start: string;
  end: string;
}

export interface AvailabilityDay {
  /** Off days keep their ranges so switching a day back on restores them. */
  enabled: boolean;
  ranges: AvailabilityRange[];
  breaks: AvailabilityRange[];
}

export interface AvailabilityVacation {
  id: string;
  /** Local `YYYY-MM-DD`, first day away. */
  from: string;
  /** Last day away, inclusive. */
  to: string;
  reason?: string;
}

export interface Availability {
  /** Index 0 is Sunday, like `Date#getDay`. */
  weekly: AvailabilityDay[];
  vacations: AvailabilityVacation[];
}

export function parseHm(value: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!m) return Number.NaN;
  const h = Number(m[1]);
  const min = Number(m[2]);
  return h > 24 || min > 59 || (h === 24 && min > 0) ? Number.NaN : h * 60 + min;
}

export function toHm(minutes: number): string {
  const m = Math.max(0, Math.min(1440, Math.round(minutes)));
  return m === 1440 ? "24:00" : `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const emptyDay = (): AvailabilityDay => ({ enabled: false, ranges: [], breaks: [] });

/** A week from a template: `open` days get `ranges` and `breaks`, the others are off. Default working days are given as `Date#getDay` numbers. */
export function makeWeek(open: readonly number[], ranges: AvailabilityRange[], breaks: AvailabilityRange[] = []): AvailabilityDay[] {
  return Array.from({ length: 7 }, (_, d) => (open.includes(d) ? { enabled: true, ranges: ranges.map((r) => ({ ...r })), breaks: breaks.map((r) => ({ ...r })) } : { enabled: false, ranges: ranges.map((r) => ({ ...r })), breaks: breaks.map((r) => ({ ...r })) }));
}

export type AvailabilityIssueCode = "end-before-start" | "invalid-time" | "overlap" | "break-outside-hours" | "vacation-order" | "vacation-overlap" | "no-hours";

export interface AvailabilityIssue {
  code: AvailabilityIssueCode;
  /** Where: a weekday index with the list and range index, or a vacation id. */
  day?: number;
  list?: "ranges" | "breaks";
  index?: number;
  vacationId?: string;
}

const valid = (r: AvailabilityRange) => Number.isFinite(parseHm(r.start)) && Number.isFinite(parseHm(r.end));

function checkList(list: AvailabilityRange[], day: number, name: "ranges" | "breaks", issues: AvailabilityIssue[]) {
  const spans: { s: number; e: number; i: number }[] = [];
  list.forEach((r, i) => {
    if (!valid(r)) return void issues.push({ code: "invalid-time", day, list: name, index: i });
    const s = parseHm(r.start);
    const e = parseHm(r.end);
    if (e <= s) return void issues.push({ code: "end-before-start", day, list: name, index: i });
    spans.push({ s, e, i });
  });
  spans.sort((a, b) => a.s - b.s);
  for (let k = 1; k < spans.length; k++) if (spans[k]!.s < spans[k - 1]!.e) issues.push({ code: "overlap", day, list: name, index: spans[k]!.i });
}

/** Everything wrong with an availability. Off days are not checked. An empty list means it can be saved. */
export function validateAvailability(av: Availability): AvailabilityIssue[] {
  const issues: AvailabilityIssue[] = [];
  av.weekly.forEach((d, day) => {
    if (!d.enabled) return;
    if (d.ranges.length === 0) issues.push({ code: "no-hours", day });
    checkList(d.ranges, day, "ranges", issues);
    checkList(d.breaks, day, "breaks", issues);
    d.breaks.forEach((b, i) => {
      if (!valid(b) || parseHm(b.end) <= parseHm(b.start)) return;
      const s = parseHm(b.start);
      const e = parseHm(b.end);
      if (!d.ranges.some((r) => valid(r) && parseHm(r.start) <= s && parseHm(r.end) >= e)) issues.push({ code: "break-outside-hours", day, list: "breaks", index: i });
    });
  });
  const sorted = [...av.vacations].sort((a, b) => a.from.localeCompare(b.from));
  sorted.forEach((v, i) => {
    if (v.to < v.from) issues.push({ code: "vacation-order", vacationId: v.id });
    const prev = sorted[i - 1];
    if (prev && v.from <= prev.to) issues.push({ code: "vacation-overlap", vacationId: v.id });
  });
  return issues;
}

export const isOnVacation = (av: Availability, date: Date) => {
  const key = dayKey(date);
  return av.vacations.find((v) => v.from <= key && key <= v.to);
};

/** The hours and breaks that apply on a date, or null when the provider is off (a day off, or on vacation). */
export function hoursForDate(av: Availability, date: Date): { ranges: AvailabilityRange[]; breaks: AvailabilityRange[] } | null {
  if (isOnVacation(av, date)) return null;
  const day = av.weekly[date.getDay()];
  if (!day || !day.enabled || day.ranges.length === 0) return null;
  return { ranges: day.ranges, breaks: day.breaks };
}

/** Minutes worked on a weekday: opening ranges minus breaks. */
export function workedMinutes(day: AvailabilityDay): number {
  if (!day.enabled) return 0;
  const sum = (list: AvailabilityRange[]) => list.reduce((t, r) => (valid(r) ? t + Math.max(0, parseHm(r.end) - parseHm(r.start)) : t), 0);
  return Math.max(0, sum(day.ranges) - sum(day.breaks));
}

export const weeklyMinutes = (av: Availability) => av.weekly.reduce((t, d) => t + workedMinutes(d), 0);

/** A new range that starts where the last one ends (09:00 for the first) and runs `lengthMinutes`, kept before midnight. */
export function nextRange(list: readonly AvailabilityRange[], lengthMinutes = 60): AvailabilityRange {
  const last = list.reduce((m, r) => (valid(r) ? Math.max(m, parseHm(r.end)) : m), -1);
  const start = Math.max(0, Math.min(1440 - lengthMinutes, last < 0 ? 9 * 60 : last));
  return { start: toHm(start), end: toHm(start + lengthMinutes) };
}

/** Copy one day's hours and breaks onto other weekdays (which become enabled). */
export function copyDay(weekly: readonly AvailabilityDay[], from: number, to: readonly number[]): AvailabilityDay[] {
  const source = weekly[from];
  if (!source) return [...weekly];
  return weekly.map((d, i) => (to.includes(i) ? { enabled: true, ranges: source.ranges.map((r) => ({ ...r })), breaks: source.breaks.map((r) => ({ ...r })) } : d));
}

/** Days between two `YYYY-MM-DD` dates, inclusive. */
export function vacationDays(v: Pick<AvailabilityVacation, "from" | "to">): number {
  const [fy, fm, fd] = v.from.split("-").map(Number);
  const [ty, tm, td] = v.to.split("-").map(Number);
  const a = Date.UTC(fy ?? 0, (fm ?? 1) - 1, fd ?? 1);
  const b = Date.UTC(ty ?? 0, (tm ?? 1) - 1, td ?? 1);
  return Math.max(0, Math.round((b - a) / 86400000)) + 1;
}
