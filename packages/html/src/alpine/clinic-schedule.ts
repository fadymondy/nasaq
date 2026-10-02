// nqClinicSchedule: a doctor's day. The markup is the React ClinicSchedule's (see the Blade component): a day scheduler beside a summary,
// the visit in progress, the next patient with how late they are and an overlap warning. The side column follows the day the scheduler shows.
//
//   <div data-slot="clinic-schedule" x-data="nqClinicSchedule({ appointments: [{ id, patient, service, start: '2026-09-29T08:30', end, status, room, followUp }], date, now, strings })"
//        x-on:date-change="setDate($event.detail.date)" x-on:event-click="pick($event.detail.id)">…</div>
//
// Read only. Fires "select" ({ id }) on the root when an appointment block or an Open button is used; "slot-select" and "date-change" come from the
// inner scheduler and bubble. Times without a zone are local. The scheduler is kept on its day view, like React.

import { BOOKING_STATUSES, type BookingStatus } from "./booking-pipeline-logic";
import { currentAppointment, findOverlaps, minutesLate, nextAppointment, summariseAppointments, type ClinicAppointment } from "./clinic-schedule-logic";
import type { Magics, Register } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toDate = (v: string): Date => {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(v);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)) : new Date(v);
};
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const fill = (s: string, vars: Record<string, string | number>) => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));

interface Strings {
  /** "{h} h {m} min" */
  hours: string;
  /** "{n} min late" */
  late: string;
  /** "Room {r}" */
  room: string;
  followUp: string;
  /** "1 pair of appointments overlaps." */
  overlapOne: string;
  /** "{n} pairs of appointments overlap." */
  overlapMany: string;
}

export interface ClinicScheduleConfig {
  appointments: { id: string; patient: string; service: string; start: string; end: string; status: BookingStatus; room?: string | null; followUp?: boolean }[];
  /** Any local ISO date; the day shown first. Defaults to `now`. */
  date?: string | null;
  now?: string | null;
  locale?: string | null;
  strings: Strings;
}

interface State extends Magics {
  cfg: ClinicScheduleConfig;
  appts: ClinicAppointment[];
  cursor: string;
  clock: Date;
  root: HTMLElement;
  dayDate: Date;
  locale: string;
  dayAppointments: ClinicAppointment[];
  summary: ReturnType<typeof summariseAppointments>;
  next: ClinicAppointment | undefined;
  late: number;
  overlapCount: number;
  num(n: number): string;
}

export const clinicSchedule: Register = (Alpine) => {
  Alpine.data("nqClinicSchedule", (cfg: ClinicScheduleConfig) => {
    const clock = cfg.now ? toDate(cfg.now) : new Date();
    const appts: ClinicAppointment[] = cfg.appointments.map((a) => ({
      id: String(a.id),
      patient: a.patient,
      service: a.service,
      start: toDate(a.start),
      end: toDate(a.end),
      status: a.status,
      room: a.room ?? undefined,
      followUp: a.followUp,
    }));
    return {
      cfg,
      appts,
      clock,
      cursor: dayKey(cfg.date ? toDate(cfg.date) : clock),
      root: null as unknown as HTMLElement,
      statuses: [...BOOKING_STATUSES, "no_show", "cancelled"] as string[],
      init(this: State) {
        this.root = this.$el;
        // The scheduler only ever shows the day; put it back if its view toggle is used.
        this.root.addEventListener("view-change", (e) => {
          if ((e as CustomEvent).detail?.view === "day") return;
          const sched = this.root.querySelector<HTMLElement>('[data-slot="scheduler"]');
          const alpine = (window as unknown as { Alpine?: { $data(el: Element): { view?: string } } }).Alpine;
          const data = sched && alpine ? alpine.$data(sched) : null;
          if (data) data.view = "day";
        });
      },

      setDate(this: State, key: string) {
        this.cursor = key;
      },
      pick(this: State, id: string) {
        this.root.dispatchEvent(new CustomEvent("select", { detail: { id }, bubbles: true }));
      },

      get locale(): string {
        const self = this as unknown as State & { $nq?: { locale: string } };
        return self.cfg.locale ?? self.$nq?.locale ?? "en";
      },
      num(this: State, n: number): string {
        return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
      },
      get dayDate(): Date {
        return toDate((this as unknown as State).cursor);
      },
      get dayAppointments(): ClinicAppointment[] {
        const self = this as unknown as State;
        return self.appts.filter((a) => sameDay(a.start, self.dayDate));
      },
      get empty(): boolean {
        return (this as unknown as State).dayAppointments.length === 0;
      },
      get dayLabel(): string {
        const self = this as unknown as State;
        return new Intl.DateTimeFormat(`${self.locale}-u-nu-latn`, { weekday: "long", day: "numeric", month: "long" }).format(self.dayDate);
      },

      // ---- summary
      get summary() {
        return summariseAppointments((this as unknown as State).dayAppointments);
      },
      get total(): string {
        const self = this as unknown as State;
        return self.num(self.summary.total);
      },
      get remaining(): string {
        const self = this as unknown as State;
        return self.num(self.summary.remaining);
      },
      get bookedLabel(): string {
        const self = this as unknown as State;
        const m = self.summary.bookedMinutes;
        return fill(self.cfg.strings.hours, { h: self.num(Math.floor(m / 60)), m: self.num(m % 60) });
      },
      count(this: State, status: BookingStatus): number {
        return this.summary.byStatus[status] ?? 0;
      },
      countLabel(this: State, status: BookingStatus): string {
        return this.num(this.summary.byStatus[status] ?? 0);
      },

      // ---- in visit, next up, overlaps
      get current(): ClinicAppointment | undefined {
        return currentAppointment((this as unknown as State).dayAppointments);
      },
      get next(): ClinicAppointment | undefined {
        const self = this as unknown as State;
        return nextAppointment(self.dayAppointments, self.clock);
      },
      get nextTime(): string {
        const self = this as unknown as State;
        return self.next ? new Intl.DateTimeFormat(`${self.locale}-u-nu-latn`, { hour: "numeric", minute: "2-digit" }).format(self.next.start) : "";
      },
      get nextDetail(): string {
        const self = this as unknown as State;
        return self.next ? self.next.service + (self.next.followUp ? ` · ${self.cfg.strings.followUp}` : "") : "";
      },
      get nextRoom(): string {
        const self = this as unknown as State;
        return self.next?.room ? fill(self.cfg.strings.room, { r: self.next.room }) : "";
      },
      get late(): number {
        const self = this as unknown as State;
        return self.next ? minutesLate(self.next, self.clock) : 0;
      },
      get lateLabel(): string {
        const self = this as unknown as State;
        return fill(self.cfg.strings.late, { n: self.num(self.late) });
      },
      get overlapCount(): number {
        return findOverlaps((this as unknown as State).dayAppointments).length;
      },
      get overlapLabel(): string {
        const self = this as unknown as State;
        return self.overlapCount === 1 ? self.cfg.strings.overlapOne : fill(self.cfg.strings.overlapMany, { n: self.num(self.overlapCount) });
      },
    };
  });
};
