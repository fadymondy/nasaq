/* Pure maths for effective-dated rates and recurring subscriptions. Money is an integer in minor units; dates are "YYYY-MM-DD"
 * keys handled in UTC so a time zone never moves a day. No React, so it runs under node --test. */

/** Half-up integer division. */
export const divRound = (numerator: number, denominator: number): number => (denominator === 0 ? 0 : Math.floor((numerator * 2 + denominator) / (denominator * 2)));

const dayMs = 86_400_000;
const toDate = (key: string): Date => {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const toKey = (d: Date): string => d.toISOString().slice(0, 10);
export const dayCount = (from: string, to: string): number => Math.round((toDate(to).getTime() - toDate(from).getTime()) / dayMs);
export const shiftDay = (key: string, days: number): string => toKey(new Date(toDate(key).getTime() + days * dayMs));
const daysInMonth = (year: number, month0: number) => new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();

/* ------------------------------------------------------------------ rates */

export interface RateLike {
  /** Per hour (or per unit), minor units. */
  amount: number;
  /** The first day the rate applies. It holds until the next rate starts. */
  from: string;
}

/** The rates in date order. Two rates on the same day keep the later one in the list. */
export function sortRates<T extends RateLike>(rates: readonly T[]): T[] {
  const byDay = new Map<string, T>();
  for (const r of rates) byDay.set(r.from, r);
  return [...byDay.values()].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));
}

/** The rate in force on `day`: the latest one that started on or before it. Undefined before the first rate. */
export function rateAt<T extends RateLike>(rates: readonly T[], day: string): T | undefined {
  let found: T | undefined;
  for (const r of sortRates(rates)) if (r.from <= day) found = r;
  return found;
}

export interface RateSegment<T extends RateLike> {
  rate: T;
  from: string;
  /** The last day it applies, or null for the rate in force now. */
  to: string | null;
  /** Change from the rate before, in basis points (1000 is +10%). Null for the first rate. */
  changeBps: number | null;
}

/** The rate history as segments with an end date and the change from the rate before. */
export function rateSegments<T extends RateLike>(rates: readonly T[]): RateSegment<T>[] {
  const sorted = sortRates(rates);
  return sorted.map((rate, i) => {
    const prev = sorted[i - 1];
    const next = sorted[i + 1];
    return { rate, from: rate.from, to: next ? shiftDay(next.from, -1) : null, changeBps: prev && prev.amount > 0 ? divRound((rate.amount - prev.amount) * 10_000, prev.amount) : null };
  });
}

export type RateProblem = "amount" | "date" | "duplicate" | null;

/** Checks a new rate: a positive whole amount, a real date, and no other rate already starting that day (unless it is `ignoreFrom`). */
export function checkRate(rate: RateLike, existing: readonly RateLike[], ignoreFrom?: string): RateProblem {
  if (!Number.isInteger(rate.amount) || rate.amount <= 0) return "amount";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rate.from) || toKey(toDate(rate.from)) !== rate.from) return "date";
  if (existing.some((r) => r.from === rate.from && r.from !== ignoreFrom)) return "duplicate";
  return null;
}

export interface WorkEntry {
  day: string;
  minutes: number;
}

/**
 * The money for tracked time: each entry is priced at the rate in force on its own day, so a rate change mid-period does not
 * reprice earlier work. Each entry rounds half up to a whole minor unit. Entries before the first rate cost nothing.
 */
export function amountForWork(entries: readonly WorkEntry[], rates: readonly RateLike[]): number {
  const sorted = sortRates(rates);
  let total = 0;
  for (const e of entries) total += divRound((rateAt(sorted, e.day)?.amount ?? 0) * Math.max(0, e.minutes), 60);
  return total;
}

/** Margin of a bill rate over a cost rate in basis points of the bill rate. Null when there is no bill rate. */
export const marginBps = (bill: number, cost: number): number | null => (bill > 0 ? divRound((bill - cost) * 10_000, bill) : null);

/* ------------------------------------------------------------------ recurrence */

export type CycleUnit = "week" | "month" | "year";

export interface CycleLike {
  every: number;
  unit: CycleUnit;
}

/**
 * The `count` charge days on or after `from`, for a cycle that started on `anchor`. Months and years are counted from the
 * anchor, not from the previous charge, so a 31 January anchor gives 28 February, then 31 March (not the 28th again).
 */
export function nextOccurrences(cycle: CycleLike, anchor: string, from: string, count = 5): string[] {
  const every = Math.max(1, Math.floor(cycle.every));
  const out: string[] = [];
  const nth = (k: number): string => {
    if (cycle.unit === "week") return shiftDay(anchor, 7 * every * k);
    const a = toDate(anchor);
    const monthsToAdd = (cycle.unit === "year" ? 12 : 1) * every * k;
    const total = a.getUTCFullYear() * 12 + a.getUTCMonth() + monthsToAdd;
    const year = Math.floor(total / 12);
    const month = total % 12;
    const day = Math.min(a.getUTCDate(), daysInMonth(year, month));
    return toKey(new Date(Date.UTC(year, month, day)));
  };
  // Skip ahead cheaply, then walk.
  let k = 0;
  const approxDays = Math.max(0, dayCount(anchor, from));
  const perCycle = cycle.unit === "week" ? 7 * every : (cycle.unit === "year" ? 365 : 30) * every;
  k = Math.max(0, Math.floor(approxDays / perCycle) - 1);
  while (nth(k) < from) k++;
  for (; out.length < count; k++) out.push(nth(k));
  return out;
}

/** The charge that starts the cycle `day` falls in, and the one after it. */
export function cycleAround(cycle: CycleLike, anchor: string, day: string): { start: string; end: string } {
  const [next] = nextOccurrences(cycle, anchor, shiftDay(day, 1), 1);
  const after = next ?? day;
  // The previous charge is the last occurrence on or before `day`.
  let start = anchor;
  for (const d of nextOccurrences(cycle, anchor, anchor, 2000)) {
    if (d > day) break;
    start = d;
  }
  return { start, end: after };
}

/**
 * The share of a cycle's price for the days left when a change happens. `cycleStart` and `cycleEnd` are consecutive charge days
 * (the end is the next charge, not part of the cycle). Days from `changeDay` up to the end are charged; rounded half up.
 */
export function prorate(amount: number, cycleStart: string, cycleEnd: string, changeDay: string): number {
  const total = dayCount(cycleStart, cycleEnd);
  if (total <= 0) return 0;
  const left = Math.max(0, Math.min(total, dayCount(changeDay, cycleEnd)));
  return divRound(amount * left, total);
}

/** The price per month of a cycle, half up. A week counts as 52/12 of a month. */
export function cycleMonthlyEquivalent(amount: number, cycle: CycleLike): number {
  const every = Math.max(1, Math.floor(cycle.every));
  if (cycle.unit === "week") return divRound(amount * 52, 12 * every);
  if (cycle.unit === "month") return divRound(amount, every);
  return divRound(amount, 12 * every);
}

export interface SubscriptionLike {
  amount: number;
  cycle: CycleLike;
  status: "active" | "paused" | "cancelled";
  quantity?: number;
}

/** Monthly recurring revenue or cost: active subscriptions only, each turned into a monthly figure first. */
export const monthlyRecurring = (subs: readonly SubscriptionLike[]): number => subs.reduce((sum, s) => (s.status === "active" ? sum + cycleMonthlyEquivalent(s.amount, s.cycle) * (s.quantity ?? 1) : sum), 0);
