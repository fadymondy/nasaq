"use client";

import { CalendarClock, Pencil, Play } from "lucide-react";
import { type ComponentProps, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { ConfirmButton } from "../alert-dialog";
import { Button } from "../button";
import { DateTime } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { describeCron, isValidTimeZone, nextRuns, parseCron } from "./cron";

const STRINGS = {
  en: {
    label: "Schedules",
    empty: "No schedules yet",
    emptyBody: "Create a schedule to run something on a timer.",
    status: { ok: "Ran fine", failed: "Failed", missed: "Missed" },
    never: "Has not run yet",
    lastRun: "Last run",
    nextRun: "Next run",
    off: "Paused",
    custom: "Custom schedule",
    invalid: "Invalid schedule",
    enable: (name: string) => `Turn on ${name}`,
    runNow: "Run now",
    edit: "Edit",
    remove: "Delete",
    removeTitle: (name: string) => `Delete ${name}?`,
    removeBody: "It stops running and its schedule is lost. Past runs are kept.",
  },
  ar: {
    label: "الجداول",
    empty: "لا جداول بعد",
    emptyBody: "أنشئ جدولًا لتشغيل شيء في مواعيد محددة.",
    status: { ok: "عمل بنجاح", failed: "فشل", missed: "فاته الموعد" },
    never: "لم يعمل بعد",
    lastRun: "آخر تشغيل",
    nextRun: "التشغيل القادم",
    off: "متوقف مؤقتًا",
    custom: "جدول مخصص",
    invalid: "جدول غير صالح",
    enable: (name: string) => `تشغيل ${name}`,
    runNow: "شغّل الآن",
    edit: "تعديل",
    remove: "حذف",
    removeTitle: (name: string) => `حذف ${name}؟`,
    removeBody: "يتوقف عن العمل ويُفقد جدوله. تبقى التشغيلات السابقة.",
  },
};

export type CronScheduleListLabels = (typeof STRINGS)["en"];
export type ScheduleRunStatus = "ok" | "failed" | "missed";

export interface CronSchedule {
  id: string;
  name: string;
  /** Cron expression. */
  cron: string;
  timeZone?: string;
  enabled: boolean;
  /** The last time it was due: `ok` it ran, `failed` it ran and errored, `missed` nothing ran at its time. */
  lastRun?: { at: Date | number | string; status: ScheduleRunStatus; message?: string };
}

export interface CronScheduleListProps extends Omit<ComponentProps<"div">, "children" | "onToggle"> {
  schedules: readonly CronSchedule[];
  /** Pause or resume. */
  onToggle?: (schedule: CronSchedule, enabled: boolean) => Promise<void | { error?: string }>;
  onRunNow?: (schedule: CronSchedule) => Promise<void | { error?: string }>;
  onEdit?: (schedule: CronSchedule) => void;
  onDelete?: (schedule: CronSchedule) => Promise<void | { error?: string }>;
  /** The moment "next run" counts from. Default: now. */
  now?: Date | number;
  loading?: boolean;
  labels?: Partial<CronScheduleListLabels>;
}

const TONE: Record<ScheduleRunStatus, StatusTone> = { ok: "success", failed: "danger", missed: "warning" };

/**
 * The schedules you have: what each one says in words, its status the last time it was due (ran, failed or missed;
 * shown with an icon and a word), when it runs next, and pause, run now, edit and delete.
 */
export function CronScheduleList({ schedules, onToggle, onRunNow, onEdit, onDelete, now, loading, labels, className, ...rest }: CronScheduleListProps) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const upcoming = useMemo(() => new Map(schedules.map((s) => [s.id, s.enabled ? nextRuns(s.cron, { from: now ?? Date.now(), count: 1, timeZone: s.timeZone && isValidTimeZone(s.timeZone) ? s.timeZone : "UTC" })[0] : undefined])), [schedules, now]);

  async function act(id: string, run: () => Promise<void | { error?: string }>) {
    setBusy(id);
    setError(null);
    const res = await run();
    setBusy(null);
    if (res && res.error) setError(res.error);
  }

  if (loading) {
    return (
      <div data-slot="cron-schedule-list" aria-busy className={cn("flex flex-col gap-2", className)} {...rest}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16" />
        ))}
      </div>
    );
  }
  if (schedules.length === 0) {
    return (
      <div data-slot="cron-schedule-list" className={className} {...rest}>
        <EmptyState icon={CalendarClock} title={t.empty} description={t.emptyBody} />
      </div>
    );
  }

  return (
    <div data-slot="cron-schedule-list" className={cn("flex flex-col gap-2", className)} {...rest}>
      {error ? (
        <p role="alert" className="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <ul aria-label={t.label} className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
        {schedules.map((s) => {
          const words = describeCron(s.cron, ar ? "ar" : "en");
          const valid = words !== null || /^[@*\d]/.test(s.cron.trim());
          const next = upcoming.get(s.id);
          return (
            <li key={s.id} data-schedule={s.id} className={cn("flex flex-wrap items-center gap-x-4 gap-y-3 p-4", !s.enabled && "opacity-80")}>
              <Switch checked={s.enabled} disabled={!onToggle || busy === s.id} onCheckedChange={(v) => onToggle && void act(s.id, () => onToggle(s, v))} aria-label={t.enable(s.name)} />
              <div className="min-w-0 flex-1 basis-56">
                <p className="truncate text-label text-foreground">{s.name}</p>
                <p className="text-body-sm text-muted-foreground">
                  {words ?? (parseCron(s.cron).ok ? t.custom : t.invalid)}
                  <bdi dir="ltr" className="ms-2 font-mono text-code">
                    {s.cron}
                  </bdi>
                  {s.timeZone ? (
                    <bdi dir="ltr" className="ms-2 text-caption">
                      {s.timeZone}
                    </bdi>
                  ) : null}
                </p>
              </div>
              <dl className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 text-body-sm sm:min-w-64">
                <dt className="text-muted-foreground">{t.lastRun}</dt>
                <dd className="min-w-0">
                  {s.lastRun ? (
                    <span className="flex flex-wrap items-center gap-x-2">
                      <Status tone={TONE[s.lastRun.status]}>{t.status[s.lastRun.status]}</Status>
                      <DateTime value={s.lastRun.at} relative className="text-caption text-muted-foreground" />
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{t.never}</span>
                  )}
                </dd>
                <dt className="text-muted-foreground">{t.nextRun}</dt>
                <dd>{s.enabled && next ? <DateTime value={next} format={{ dateStyle: "medium", timeStyle: "short", ...(s.timeZone && isValidTimeZone(s.timeZone) ? { timeZone: s.timeZone } : { timeZone: "UTC" }) }} /> : <span className="text-muted-foreground">{t.off}</span>}</dd>
              </dl>
              <div className="flex items-center gap-1">
                {onRunNow ? (
                  <Button variant="ghost" size="icon-sm" aria-label={`${t.runNow}: ${s.name}`} title={t.runNow} disabled={busy === s.id} onClick={() => void act(s.id, () => onRunNow(s))}>
                    <Play aria-hidden />
                  </Button>
                ) : null}
                {onEdit ? (
                  <Button variant="ghost" size="icon-sm" aria-label={`${t.edit}: ${s.name}`} title={t.edit} onClick={() => onEdit(s)}>
                    <Pencil aria-hidden />
                  </Button>
                ) : null}
                {onDelete ? (
                  <ConfirmButton variant="danger" size="sm" title={t.removeTitle(s.name)} description={t.removeBody} confirmLabel={t.remove} onConfirm={() => act(s.id, () => onDelete(s))}>
                    {t.remove}
                  </ConfirmButton>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
