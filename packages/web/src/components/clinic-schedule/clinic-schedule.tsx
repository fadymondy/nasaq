"use client";

import { AlertTriangle, ArrowRight, Clock } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { BOOKING_STATUSES, type BookingStatus } from "../booking-flow/booking-math";
import { BookingStatusBadge, useBookingStatusLabel } from "../booking-pipeline";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { formatDate, Num } from "../numeric";
import { Scheduler, type SchedulerEvent } from "../scheduler";
import { currentAppointment, type ClinicAppointment, findOverlaps, minutesLate, nextAppointment, STATUS_TONE, summariseAppointments } from "./schedule-math";

const STRINGS = {
  en: {
    summary: "Today at a glance",
    total: "Booked",
    remaining: "Still to see",
    minutes: (n: number) => `${n} min`,
    booked: "Booked time",
    hours: (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`,
    next: "Next up",
    nothing: "No one is waiting.",
    late: (n: number) => `${n} min late`,
    overlap: (n: number) => `${n} ${n === 1 ? "pair of appointments overlaps" : "pairs of appointments overlap"}.`,
    open: "Open",
    inVisit: "In visit now",
    legend: "Status legend",
    empty: "No appointments on this day.",
    room: (r: string) => `Room ${r}`,
    followUp: "Follow-up",
  },
  ar: {
    summary: "اليوم في لمحة",
    total: "محجوز",
    remaining: "متبقٍ",
    minutes: (n: number) => `${n} دقيقة`,
    booked: "الوقت المحجوز",
    hours: (m: number) => `${Math.floor(m / 60)} س ${m % 60} د`,
    next: "التالي",
    nothing: "لا أحد في الانتظار.",
    late: (n: number) => `متأخر ${n} دقيقة`,
    overlap: (n: number) => (n === 1 ? "يوجد موعدان متداخلان." : `يوجد ${n} أزواج من المواعيد المتداخلة.`),
    open: "فتح",
    inVisit: "في الزيارة الآن",
    legend: "دليل الحالات",
    empty: "لا مواعيد في هذا اليوم.",
    room: (r: string) => `الغرفة ${r}`,
    followUp: "متابعة",
  },
};

export type ClinicScheduleLabels = (typeof STRINGS)["en"];

export interface ClinicScheduleProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  /** The doctor's appointments. Any day; the schedule shows the one in `date`. */
  appointments: readonly ClinicAppointment[];
  /** The day shown. Controlled. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** Visible hours. Default 8 to 18. */
  workingHours?: { start: number; end: number };
  /** Called when an appointment block or the "Open" button is used. */
  onSelect?: (appointment: ClinicAppointment) => void;
  /** Called for a click on an empty slot, for adding a walk-in or a break. */
  onSlotSelect?: (start: Date, end: Date) => void;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  labels?: Partial<ClinicScheduleLabels>;
}

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * A doctor's day: a day timeline with each appointment coloured and named by status (the status word is in the block title, so colour is never the only cue),
 * a count per status, the next patient with how late they are, and a warning when appointments overlap.
 * Read only: selecting an appointment or an empty slot calls back, and the host decides what happens.
 */
export function ClinicSchedule({ appointments, date: dateProp, defaultDate, onDateChange, workingHours = { start: 8, end: 18 }, onSelect, onSlotSelect, now: nowProp, labels, className, ...rest }: ClinicScheduleProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as ClinicScheduleLabels;
  const statusName = useBookingStatusLabel();
  const now = useMemo(() => nowProp ?? new Date(), [nowProp]);
  const [dateInner, setDateInner] = useState(defaultDate ?? now);
  const date = dateProp ?? dateInner;
  const day = useMemo(() => appointments.filter((a) => sameDay(a.start, date)), [appointments, date]);
  const summary = summariseAppointments(day);
  const current = currentAppointment(day);
  const next = nextAppointment(day, now);
  const overlaps = findOverlaps(day);
  const late = next ? minutesLate(next, now) : 0;

  const events: SchedulerEvent[] = day.map((a) => ({ id: a.id, title: `${a.patient} · ${statusName(a.status)}`, start: a.start, end: a.end, tone: STATUS_TONE[a.status] }));
  const byId = new Map(day.map((a) => [a.id, a]));
  const shown: BookingStatus[] = [...BOOKING_STATUSES, "no_show", "cancelled"];

  return (
    <div data-slot="clinic-schedule" className={cn("grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start", className)} {...rest}>
      <div className="min-w-0">
        <Scheduler
          events={events}
          view="day"
          date={date}
          onDateChange={(d) => {
            setDateInner(d);
            onDateChange?.(d);
          }}
          workingHours={workingHours}
          slotMinutes={15}
          today={now}
          onSlotSelect={onSlotSelect}
          onEventClick={(e) => {
            const a = byId.get(e.id);
            if (a) onSelect?.(a);
          }}
        />
        {day.length === 0 ? <p className="mt-3 text-body-sm text-muted-foreground">{t.empty}</p> : null}
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle as="h3">{t.summary}</CardTitle>
            <CardDescription>
              <bdi>{formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" })}</bdi>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <dl className="m-0 grid grid-cols-2 gap-3">
              <div>
                <dt className="text-caption text-muted-foreground">{t.total}</dt>
                <dd className="m-0 text-h2 tabular-nums">
                  <Num value={summary.total} />
                </dd>
              </div>
              <div>
                <dt className="text-caption text-muted-foreground">{t.remaining}</dt>
                <dd className="m-0 text-h2 tabular-nums">
                  <Num value={summary.remaining} />
                </dd>
              </div>
              <div className="col-span-2">
                <dt className="text-caption text-muted-foreground">{t.booked}</dt>
                <dd className="m-0 text-body-sm tabular-nums">{t.hours(summary.bookedMinutes)}</dd>
              </div>
            </dl>
            <ul aria-label={t.legend} className="m-0 flex list-none flex-wrap gap-1.5 p-0">
              {shown
                .filter((s) => summary.byStatus[s] > 0)
                .map((s) => (
                  <li key={s} className="inline-flex items-center gap-1">
                    <BookingStatusBadge status={s} />
                    <span className="text-caption tabular-nums text-muted-foreground">
                      <Num value={summary.byStatus[s]} />
                    </span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>

        {current ? (
          <Card data-slot="clinic-current">
            <CardHeader>
              <CardTitle as="h3">{t.inVisit}</CardTitle>
              <CardDescription>{current.service}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-2">
              <span className="text-label">{current.patient}</span>
              {onSelect ? (
                <Button size="sm" variant="secondary" onClick={() => onSelect(current)}>
                  {t.open}
                  <ArrowRight aria-hidden className="rtl:rotate-180" />
                </Button>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <Card data-slot="clinic-next">
          <CardHeader>
            <CardTitle as="h3">{t.next}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {next ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-label">{next.patient}</p>
                    <p className="text-caption text-muted-foreground">
                      {next.service}
                      {next.followUp ? ` · ${t.followUp}` : ""}
                    </p>
                  </div>
                  <BookingStatusBadge status={next.status} />
                </div>
                <p className="inline-flex items-center gap-1.5 text-body-sm">
                  <Clock aria-hidden className="size-4 text-muted-foreground" />
                  <bdi>{formatDate(next.start, locale, { hour: "numeric", minute: "2-digit" })}</bdi>
                  {next.room ? <span className="text-muted-foreground">· {t.room(next.room)}</span> : null}
                  {late > 0 ? <span className="font-medium text-nq-warning-text">· {t.late(late)}</span> : null}
                </p>
                {onSelect ? (
                  <Button size="sm" variant="secondary" onClick={() => onSelect(next)}>
                    {t.open}
                  </Button>
                ) : null}
              </>
            ) : (
              <p className="text-body-sm text-muted-foreground">{t.nothing}</p>
            )}
          </CardContent>
        </Card>

        {overlaps.length > 0 ? (
          <Alert tone="warning" icon={AlertTriangle}>
            {t.overlap(overlaps.length)}
          </Alert>
        ) : null}
      </div>
    </div>
  );
}
