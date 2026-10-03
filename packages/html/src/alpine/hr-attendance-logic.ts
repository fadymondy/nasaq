/* Pure HR maths: leave days and balances, attendance hours and payroll totals. Dates are "YYYY-MM-DD" keys so time zones never
 * shift a day; money is an integer in minor units. No React, so it runs under node --test. */

export const parseDay = (key: string): Date => {
  const [y = 1970, m = 1, d = 1] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};

export const dayKey = (date: Date): string => date.toISOString().slice(0, 10);

export const addDaysKey = (key: string, days: number): string => dayKey(new Date(parseDay(key).getTime() + days * 86_400_000));

/** Today as a key, from the local calendar (not UTC). */
export const todayKey = (now = new Date()): string => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

/* ------------------------------------------------------------------ leave */

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveTypeLike {
  id: string;
  /** Days granted per year. */
  annualDays: number;
  /** "upfront": the whole year is available on 1 January. "monthly": one twelfth is earned each month. Default "upfront". */
  accrual?: "upfront" | "monthly";
  /** Days that may be carried into the next year. */
  carryOverMax?: number;
  /** When false the type has no limit (unpaid leave, sick leave with a certificate). Default true. */
  limited?: boolean;
}

export interface LeaveRequestLike {
  id?: string;
  typeId: string;
  /** First and last day, inclusive. */
  start: string;
  end: string;
  status: LeaveStatus;
  /** Set when the first or last day is only half a day. */
  halfStart?: boolean;
  halfEnd?: boolean;
}

export interface LeaveCalendar {
  /** Days of the week that are not worked, 0 Sunday to 6 Saturday. Default Friday and Saturday. */
  weekend?: readonly number[];
  /** Public holidays as day keys. */
  holidays?: readonly string[];
}

/**
 * Working days from `start` to `end`, both included. Weekends and holidays do not count. A half day at the start or end
 * counts 0.5, but only when that day is a working day. Returns 0 when `end` is before `start`.
 */
export function leaveDays(start: string, end: string, { weekend = [5, 6], holidays = [] }: LeaveCalendar = {}, half: { start?: boolean; end?: boolean } = {}): number {
  if (end < start) return 0;
  const off = new Set(holidays);
  let days = 0;
  for (let key = start; key <= end; key = addDaysKey(key, 1)) {
    if (weekend.includes(parseDay(key).getUTCDay()) || off.has(key)) continue;
    days += (key === start && half.start) || (key === end && half.end) ? 0.5 : 1;
  }
  return days;
}

const requestDays = (r: LeaveRequestLike, calendar?: LeaveCalendar) => leaveDays(r.start, r.end, calendar, { start: r.halfStart, end: r.halfEnd });

export interface LeaveBalance {
  typeId: string;
  /** Granted for the year plus days carried in. */
  entitled: number;
  /** Earned so far: all of `entitled` for upfront types, a twelfth per month for monthly ones. */
  accrued: number;
  used: number;
  pending: number;
  /** Earned and not yet taken or asked for: `accrued - used - pending`. Never negative. */
  available: number;
  /** Granted for the whole year and not yet taken (pending counts as taken). Can be negative when overdrawn. */
  remaining: number;
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;

/**
 * The balance of one leave type for a calendar year. Approved leave is "used", pending leave is held against the balance.
 * Monthly accrual earns `annualDays / 12` per month elapsed (rounded to the nearest half day). `carriedOver` is added to both
 * the entitlement and what has been earned, capped by the type's `carryOverMax`.
 */
export function leaveBalance(
  type: LeaveTypeLike,
  requests: readonly LeaveRequestLike[],
  { year, asOf, carriedOver = 0, calendar }: { year: number; asOf: string; carriedOver?: number; calendar?: LeaveCalendar },
): LeaveBalance {
  const carried = Math.max(0, Math.min(carriedOver, type.carryOverMax ?? carriedOver));
  const entitled = type.annualDays + carried;
  const asOfYear = Number(asOf.slice(0, 4));
  const monthsElapsed = asOfYear > year ? 12 : asOfYear < year ? 0 : Number(asOf.slice(5, 7));
  const accrued = (type.accrual ?? "upfront") === "monthly" ? Math.min(entitled, roundHalf(carried + (type.annualDays * monthsElapsed) / 12)) : entitled;
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  let used = 0;
  let pending = 0;
  for (const r of requests) {
    if (r.typeId !== type.id || (r.status !== "approved" && r.status !== "pending")) continue;
    // Only the part inside the year counts.
    const start = r.start < yearStart ? yearStart : r.start;
    const end = r.end > yearEnd ? yearEnd : r.end;
    const days = requestDays({ ...r, start, end, halfStart: r.halfStart && start === r.start, halfEnd: r.halfEnd && end === r.end }, calendar);
    if (r.status === "approved") used += days;
    else pending += days;
  }
  return { typeId: type.id, entitled, accrued, used, pending, available: Math.max(0, accrued - used - pending), remaining: entitled - used - pending };
}

/** The first request that shares a day with `start`..`end`, ignoring rejected and cancelled ones and `ignoreId`. */
export function findLeaveOverlap<T extends LeaveRequestLike>(requests: readonly T[], start: string, end: string, ignoreId?: string): T | undefined {
  return requests.find((r) => (r.status === "approved" || r.status === "pending") && r.id !== ignoreId && r.start <= end && r.end >= start);
}

export type LeaveProblem = "range" | "none" | "overlap" | "balance" | null;

/** Checks a new request: dates in order, at least one working day, no overlap, and enough available days for limited types. */
export function checkLeaveRequest(
  type: LeaveTypeLike,
  request: Pick<LeaveRequestLike, "start" | "end" | "halfStart" | "halfEnd">,
  requests: readonly LeaveRequestLike[],
  opts: { year: number; asOf: string; carriedOver?: number; calendar?: LeaveCalendar },
): { problem: LeaveProblem; days: number; balance: LeaveBalance } {
  const balance = leaveBalance(type, requests, opts);
  if (request.end < request.start) return { problem: "range", days: 0, balance };
  const days = leaveDays(request.start, request.end, opts.calendar, { start: request.halfStart, end: request.halfEnd });
  if (days === 0) return { problem: "none", days, balance };
  if (findLeaveOverlap(requests, request.start, request.end)) return { problem: "overlap", days, balance };
  if (type.limited !== false && days > balance.available) return { problem: "balance", days, balance };
  return { problem: null, days, balance };
}

/* ------------------------------------------------------------------ attendance */

export interface PunchLike {
  /** "in" starts work, "out" ends it, "break-start" and "break-end" pause it. */
  kind: "in" | "out" | "break-start" | "break-end";
  /** Epoch milliseconds. */
  at: number;
}

/**
 * Minutes worked from a day's punches. Time between "in" and "out" counts, time between "break-start" and "break-end" does
 * not. An open session (no "out" yet) runs to `now`.
 */
export function attendanceMinutes(punches: readonly PunchLike[], now: number): number {
  let total = 0;
  let since: number | null = null;
  for (const p of [...punches].sort((a, b) => a.at - b.at)) {
    if ((p.kind === "in" || p.kind === "break-end") && since === null) since = p.at;
    else if ((p.kind === "out" || p.kind === "break-start") && since !== null) {
      total += Math.max(0, p.at - since);
      since = null;
    }
  }
  if (since !== null) total += Math.max(0, now - since);
  return Math.floor(total / 60_000);
}

/** The state after the punches: "in", "break" or "out". */
export function attendanceState(punches: readonly PunchLike[]): "in" | "break" | "out" {
  const last = [...punches].sort((a, b) => a.at - b.at).at(-1);
  if (!last || last.kind === "out") return "out";
  return last.kind === "break-start" ? "break" : "in";
}

/** Minutes after the shift start plus the grace period. 0 when on time. `shiftStart` is "09:00". */
export function attendanceLateMinutes(clockIn: number, shiftStart: string, graceMinutes = 0): number {
  const d = new Date(clockIn);
  const [h = 0, m = 0] = shiftStart.split(":").map(Number);
  const late = d.getHours() * 60 + d.getMinutes() - (h * 60 + m);
  return late > graceMinutes ? late : 0;
}

/* ------------------------------------------------------------------ payroll */

export interface PayrollLineLike {
  /** Monthly base pay, minor units. */
  basic: number;
  allowances?: number;
  /** Extra pay such as overtime. */
  additions?: number;
  /** Tax, insurance, unpaid leave. */
  deductions?: number;
}

/** Divides with half-up rounding, so money stays whole minor units. */
export const divRound = (numerator: number, denominator: number): number => (denominator === 0 ? 0 : Math.floor((numerator * 2 + denominator) / (denominator * 2)));

/** Base pay for the days actually worked in a month: `monthly * worked / working`, rounded half up. */
export function prorateSalary(monthly: number, workedDays: number, workingDays: number): number {
  return divRound(monthly * Math.max(0, Math.min(workedDays, workingDays)), workingDays);
}

/** Pay withheld for unpaid leave days. */
export const unpaidLeaveDeduction = (monthly: number, unpaidDays: number, workingDays: number): number => divRound(monthly * Math.max(0, unpaidDays), workingDays);

export const payrollGross = (l: PayrollLineLike): number => l.basic + (l.allowances ?? 0) + (l.additions ?? 0);
export const payrollNet = (l: PayrollLineLike): number => payrollGross(l) - (l.deductions ?? 0);

export function payrollTotals(lines: readonly PayrollLineLike[]): { gross: number; deductions: number; net: number; count: number } {
  let gross = 0;
  let deductions = 0;
  for (const l of lines) {
    gross += payrollGross(l);
    deductions += l.deductions ?? 0;
  }
  return { gross, deductions, net: gross - deductions, count: lines.length };
}
