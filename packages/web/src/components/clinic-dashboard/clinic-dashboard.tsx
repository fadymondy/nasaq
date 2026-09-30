"use client";

import { BedDouble, Clock, DoorClosed, DoorOpen, Sparkles, Stethoscope, Users } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { StatCard, StatGrid } from "../stat-card";
import { QueueLiveIndicator, type QueueConnection } from "../waiting-screen";
import { useQueueNow } from "../waiting-screen/use-now";
import { busyMinutes, type ClinicDoctor, type ClinicDoctorStatus, type ClinicRoom, type ClinicRoomStatus, doctorsOnDuty, roomCounts, roomOccupancy, waitingFigures } from "./clinic-math";

const STRINGS = {
  en: {
    title: "Clinic today",
    waiting: "Waiting now",
    longest: "Longest wait",
    average: (n: number) => `Average ${n} min`,
    minutes: (n: number) => `${n} min`,
    onDuty: "Doctors on duty",
    ofTotal: (n: number) => `of ${n}`,
    occupancy: "Rooms in use",
    rooms: "Rooms",
    roomsHint: (free: number, busy: number) => `${free} free, ${busy} in use`,
    doctors: "Doctors on duty",
    noDoctors: "No doctor is on duty right now.",
    noRooms: "No rooms set up.",
    waitingFor: (n: number) => (n === 0 ? "No one waiting" : `${n} waiting`),
    inRoom: (r: string) => `Room ${r}`,
    since: (n: number) => `${n} min`,
    room: { free: "Free", busy: "In use", cleaning: "Cleaning", closed: "Closed" } as Record<ClinicRoomStatus, string>,
    doctor: { available: "Available", in_visit: "In a visit", break: "On a break", off: "Off" } as Record<ClinicDoctorStatus, string>,
    shift: "Shift",
  },
  ar: {
    title: "العيادة اليوم",
    waiting: "في الانتظار الآن",
    longest: "أطول انتظار",
    average: (n: number) => `المتوسط ${n} دقيقة`,
    minutes: (n: number) => `${n} دقيقة`,
    onDuty: "الأطباء المناوبون",
    ofTotal: (n: number) => `من ${n}`,
    occupancy: "الغرف المستخدمة",
    rooms: "الغرف",
    roomsHint: (free: number, busy: number) => `${free} فارغة، ${busy} مستخدمة`,
    doctors: "الأطباء المناوبون",
    noDoctors: "لا يوجد طبيب مناوب الآن.",
    noRooms: "لا توجد غرف.",
    waitingFor: (n: number) => (n === 0 ? "لا أحد ينتظر" : n === 1 ? "مريض ينتظر" : `${n} ينتظرون`),
    inRoom: (r: string) => `الغرفة ${r}`,
    since: (n: number) => `${n} د`,
    room: { free: "فارغة", busy: "مستخدمة", cleaning: "قيد التنظيف", closed: "مغلقة" } as Record<ClinicRoomStatus, string>,
    doctor: { available: "متاح", in_visit: "في زيارة", break: "في استراحة", off: "خارج الدوام" } as Record<ClinicDoctorStatus, string>,
    shift: "الدوام",
  },
};

export type ClinicDashboardLabels = (typeof STRINGS)["en"];

export interface ClinicDashboardProps extends Omit<ComponentProps<"div">, "children"> {
  rooms: readonly ClinicRoom[];
  doctors: readonly ClinicDoctor[];
  /** When each waiting patient joined the queue (epoch ms). */
  queuedAt: readonly number[];
  connection?: QueueConnection;
  updatedAt?: number;
  /** Called when a room card is used. */
  onRoomSelect?: (room: ClinicRoom) => void;
  /** Called when a doctor row is used. */
  onDoctorSelect?: (doctor: ClinicDoctor) => void;
  /** Extra content after the figures, for example a chart. */
  children?: ReactNode;
  /** Overrides the clock (epoch ms) for stories and tests. */
  now?: number;
  labels?: Partial<ClinicDashboardLabels>;
}

const ROOM_STYLE: Record<ClinicRoomStatus, { icon: typeof DoorOpen; badge: "success" | "warning" | "neutral" | "info" }> = {
  free: { icon: DoorOpen, badge: "success" },
  busy: { icon: BedDouble, badge: "warning" },
  cleaning: { icon: Sparkles, badge: "info" },
  closed: { icon: DoorClosed, badge: "neutral" },
};

const DOCTOR_BADGE: Record<ClinicDoctorStatus, "success" | "warning" | "neutral" | "info"> = { available: "success", in_visit: "warning", break: "info", off: "neutral" };

/**
 * The clinic at a glance for the front desk: waiting count and longest wait, doctors on duty, room use, then a card per room and a row per doctor.
 * Every state has an icon and a word, never colour alone. Read only; selecting a room or a doctor calls back.
 */
export function ClinicDashboard({ rooms, doctors, queuedAt, connection = "live", updatedAt, onRoomSelect, onDoctorSelect, children, now: nowProp, labels, className, ...rest }: ClinicDashboardProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels } as ClinicDashboardLabels;
  const now = useQueueNow(1000, nowProp);
  const figures = waitingFigures(queuedAt, now);
  const duty = doctorsOnDuty(doctors, new Date(now));
  const counts = roomCounts(rooms);
  const occupancy = Math.round(roomOccupancy(rooms) * 100);

  return (
    <div data-slot="clinic-dashboard" className={cn("flex flex-col gap-4", className)} {...rest}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-h3">{t.title}</h2>
        <QueueLiveIndicator connection={connection} updatedAt={updatedAt} now={nowProp} />
      </div>

      <StatGrid>
        <StatCard icon={<Users />} label={t.waiting} value={figures.waiting} deltaLabel={figures.waiting > 0 ? t.average(figures.averageMinutes) : undefined} />
        <StatCard icon={<Clock />} label={t.longest} value={<span className="tabular-nums">{t.minutes(figures.longestMinutes)}</span>} />
        <StatCard icon={<Stethoscope />} label={t.onDuty} value={duty.length} deltaLabel={t.ofTotal(doctors.length)} />
        <StatCard icon={<BedDouble />} label={t.occupancy} value={<span className="tabular-nums">{occupancy}%</span>} deltaLabel={t.roomsHint(counts.free, counts.busy)} />
      </StatGrid>

      <section aria-label={t.rooms} className="flex flex-col gap-2">
        <h3 className="text-label">{t.rooms}</h3>
        {rooms.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t.noRooms}</p>
        ) : (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3 p-0">
            {rooms.map((r) => {
              const style = ROOM_STYLE[r.status];
              const Icon = style.icon;
              const doctor = doctors.find((d) => d.id === r.doctorId);
              const minutes = busyMinutes(r, now);
              const body = (
                <>
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-label">{r.name}</span>
                    <Badge variant={style.badge}>
                      <Icon aria-hidden className="size-3" />
                      {t.room[r.status]}
                    </Badge>
                  </span>
                  {doctor ? <span className="text-caption text-muted-foreground">{doctor.name}</span> : null}
                  {r.status === "busy" ? (
                    <span className="flex items-center gap-2 text-caption text-muted-foreground">
                      {r.ticket ? (
                        <bdi dir="ltr" className="font-mono font-semibold tabular-nums text-foreground">
                          {r.ticket}
                        </bdi>
                      ) : null}
                      <span className="tabular-nums">{t.since(minutes)}</span>
                    </span>
                  ) : null}
                </>
              );
              return (
                <li key={r.id}>
                  {onRoomSelect ? (
                    <button type="button" data-slot="clinic-room" data-status={r.status} onClick={() => onRoomSelect(r)} className="flex w-full flex-col gap-1.5 rounded-card border border-border bg-card p-3 text-start outline-none transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus">
                      {body}
                    </button>
                  ) : (
                    <div data-slot="clinic-room" data-status={r.status} className="flex flex-col gap-1.5 rounded-card border border-border bg-card p-3">
                      {body}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {rooms.length > 0 ? <Progress value={occupancy} aria-label={t.occupancy} className="mt-1" /> : null}
      </section>

      <Card data-slot="clinic-doctors">
        <CardHeader>
          <CardTitle as="h3">{t.doctors}</CardTitle>
          <CardDescription>
            <Num value={duty.length} /> {t.ofTotal(doctors.length)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {duty.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.noDoctors}</p>
          ) : (
            <ul className="m-0 flex list-none flex-col divide-y divide-border p-0">
              {duty.map((d) => {
                const room = rooms.find((r) => r.id === d.roomId);
                const inner = (
                  <>
                    <Avatar name={d.name} src={d.avatar} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label">{d.name}</span>
                      <span className="block truncate text-caption text-muted-foreground">
                        {d.specialty}
                        {room ? ` · ${room.name}` : ""}
                        {d.shift ? (
                          <>
                            {" · "}
                            <bdi dir="ltr" className="tabular-nums">
                              {d.shift.start} - {d.shift.end}
                            </bdi>
                          </>
                        ) : null}
                      </span>
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <Badge variant={DOCTOR_BADGE[d.status]}>{t.doctor[d.status]}</Badge>
                      <span className="text-caption text-muted-foreground">{t.waitingFor(d.waiting)}</span>
                    </span>
                  </>
                );
                return (
                  <li key={d.id}>
                    {onDoctorSelect ? (
                      <button type="button" data-slot="clinic-doctor" onClick={() => onDoctorSelect(d)} className="flex w-full items-center gap-3 rounded-control py-2.5 text-start outline-none hover:bg-accent focus-visible:outline-2 focus-visible:outline-nq-focus">
                        {inner}
                      </button>
                    ) : (
                      <div data-slot="clinic-doctor" className="flex items-center gap-3 py-2.5">
                        {inner}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
      {children}
    </div>
  );
}
