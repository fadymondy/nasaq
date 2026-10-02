/**
 * Pure logic for a doctor's day: status to tone, counts, what is next, overlaps and free gaps. No React, no DOM.
 * Local-time dates. Self-contained on purpose: `node --test` loads it directly.
 */
import type { BookingStatus } from "../booking-pipeline/booking-math";

export interface ClinicAppointment {
  id: string;
  patient: string;
  service: string;
  start: Date;
  end: Date;
  status: BookingStatus;
  room?: string;
  /** A follow-up to an earlier visit. */
  followUp?: boolean;
  /** Tickets and other short notes shown on the card. */
  note?: string;
}

export type AppointmentTone = "neutral" | "brand" | "success" | "warning" | "danger" | "info";

/** The Scheduler tone for each status: waiting states are neutral or info, the live visit is brand, done is success, problems warn or fail. */
export const CLINIC_STATUS_TONE: Record<BookingStatus, AppointmentTone> = {
  requested: "warning",
  confirmed: "neutral",
  checked_in: "info",
  in_visit: "brand",
  done: "success",
  no_show: "danger",
  cancelled: "danger",
};

export const byAppointmentStart = (a: { start: Date }, b: { start: Date }) => a.start.getTime() - b.start.getTime();

/** Cancelled and no-show appointments take no time in the day, so they are left out of load and overlap checks. */
const takesTime = (a: ClinicAppointment) => a.status !== "cancelled" && a.status !== "no_show";

export interface DaySummary {
  total: number;
  byStatus: Record<BookingStatus, number>;
  /** Not started and not closed: requested, confirmed, checked in. */
  remaining: number;
  /** Minutes booked (cancelled and no-show excluded). */
  bookedMinutes: number;
}

export function summariseAppointments(appointments: readonly ClinicAppointment[]): DaySummary {
  const byStatus: Record<BookingStatus, number> = { requested: 0, confirmed: 0, checked_in: 0, in_visit: 0, done: 0, no_show: 0, cancelled: 0 };
  let bookedMinutes = 0;
  for (const a of appointments) {
    byStatus[a.status]++;
    if (takesTime(a)) bookedMinutes += Math.max(0, Math.round((a.end.getTime() - a.start.getTime()) / 60000));
  }
  return {
    total: appointments.length,
    byStatus,
    remaining: byStatus.requested + byStatus.confirmed + byStatus.checked_in,
    bookedMinutes,
  };
}

/** The visit in progress, if any. */
export const currentAppointment = (appointments: readonly ClinicAppointment[]) => appointments.find((a) => a.status === "in_visit");

/** The next appointment that has not started: the earliest checked-in or confirmed one from `now` on, else the earliest waiting overdue one. */
export function nextAppointment(appointments: readonly ClinicAppointment[], now: Date): ClinicAppointment | undefined {
  const open = appointments.filter((a) => a.status === "checked_in" || a.status === "confirmed" || a.status === "requested").sort(byAppointmentStart);
  return open.find((a) => a.status === "checked_in") ?? open.find((a) => a.end.getTime() > now.getTime());
}

/** Minutes a not-yet-started appointment is late. 0 when it is not late or already started. */
export function minutesLate(a: ClinicAppointment, now: Date): number {
  if (a.status !== "confirmed" && a.status !== "checked_in") return 0;
  return Math.max(0, Math.floor((now.getTime() - a.start.getTime()) / 60000));
}

/** Pairs of appointment ids that overlap in time. Cancelled and no-show ones are ignored. */
export function findOverlaps(appointments: readonly ClinicAppointment[]): [string, string][] {
  const live = appointments.filter((a) => takesTime(a)).sort(byAppointmentStart);
  const pairs: [string, string][] = [];
  for (let i = 0; i < live.length; i++)
    for (let j = i + 1; j < live.length && live[j]!.start.getTime() < live[i]!.end.getTime(); j++) pairs.push([live[i]!.id, live[j]!.id]);
  return pairs;
}

export interface FreeGap {
  start: Date;
  end: Date;
  minutes: number;
}

/** Free stretches of at least `minMinutes` between `from` and `to` that no live appointment covers. */
export function freeGaps(appointments: readonly ClinicAppointment[], from: Date, to: Date, minMinutes = 15): FreeGap[] {
  const live = appointments.filter((a) => takesTime(a) && a.end > from && a.start < to).sort(byAppointmentStart);
  const gaps: FreeGap[] = [];
  let cursor = from.getTime();
  const push = (s: number, e: number) => {
    const minutes = Math.floor((e - s) / 60000);
    if (minutes >= minMinutes) gaps.push({ start: new Date(s), end: new Date(e), minutes });
  };
  for (const a of live) {
    if (a.start.getTime() > cursor) push(cursor, Math.min(a.start.getTime(), to.getTime()));
    cursor = Math.max(cursor, a.end.getTime());
  }
  if (cursor < to.getTime()) push(cursor, to.getTime());
  return gaps;
}

/** Share of the working window that is booked, 0 to 1. */
export function utilisation(appointments: readonly ClinicAppointment[], windowMinutes: number): number {
  if (windowMinutes <= 0) return 0;
  return Math.min(1, summariseAppointments(appointments).bookedMinutes / windowMinutes);
}
