"use client";

import { Archive, CalendarClock, CircleAlert, Download, HardDrive, Lock, Play, RotateCcw, Trash2 } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { ConfirmButton } from "../alert-dialog";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime, Num } from "../numeric";
import { Progress } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import {
  type BackupFrequency,
  type BackupRetention,
  type BackupSchedule,
  type BackupStatus,
  clampPercent,
  type DateLike,
  formatBytes,
  nextRun,
  parseTime,
  pruneCandidates,
  type RetentionError,
  totalSize,
  validateRetention,
} from "./backup-format";

export {
  type BackupFrequency,
  type BackupRetention,
  type BackupSchedule,
  type BackupStatus,
  formatBytes,
  nextRun,
  parseTime,
  pruneCandidates,
  type RetentionError,
  totalSize,
  validateRetention,
} from "./backup-format";

const STRINGS = {
  en: {
    title: "Backups",
    description: "Automatic and manual copies of your data. Restore one to roll back.",
    runNow: "Back up now",
    running: "Backing up",
    lastBackup: "Last backup",
    nextRun: "Next backup",
    scheduleOff: "Schedule is off",
    storage: "Storage used",
    backupsCount: (n: number) => (n === 1 ? "1 backup" : `${n} backups`),
    never: "No backup yet",
    listTitle: "Backup history",
    list: "Backups",
    emptyTitle: "No backups yet",
    emptyBody: "Run your first backup now, or turn on the schedule.",
    kind: { scheduled: "Scheduled", manual: "Manual", "pre-restore": "Before restore" },
    status: { completed: "Completed", running: "In progress", failed: "Failed", restoring: "Restoring" } satisfies Record<BackupStatus, string>,
    progressFor: (name: string) => `Progress of ${name}`,
    locked: "Kept until you delete it",
    restore: "Restore",
    restoreFor: (name: string) => `Restore ${name}`,
    download: "Download",
    downloadFor: (name: string) => `Download ${name}`,
    remove: "Delete",
    removeFor: (name: string) => `Delete ${name}`,
    deleteTitle: (name: string) => `Delete ${name}?`,
    deleteBody: "This backup is removed for good. You will not be able to restore from it.",
    deleteConfirm: "Delete backup",
    restoreTitle: (name: string) => `Restore ${name}?`,
    restoreBody: "Your current data is replaced with the data in this backup. Changes made after it was taken are lost.",
    restoreSafety: "A safety backup of the current data is taken first, so you can undo this.",
    restoreCheck: "I understand my current data will be replaced.",
    restoreConfirm: "Restore backup",
    cancel: "Cancel",
    scheduleTitle: "Schedule",
    scheduleBody: "Back up on a schedule, in the server's time.",
    enabled: "Automatic backups",
    frequency: "Frequency",
    frequencies: { hourly: "Every hour", daily: "Every day", weekly: "Every week", monthly: "Every month" } satisfies Record<BackupFrequency, string>,
    time: "Time",
    minute: "Minute past the hour",
    weekday: "Day of the week",
    monthlyHint: "Runs on the 1st of each month.",
    retentionTitle: "Retention",
    retentionBody: "Old backups are deleted automatically so storage stays under control.",
    keepLast: "Keep the last",
    keepLastSuffix: "backups",
    maxAge: "Delete after (days)",
    maxAgeHint: "0 keeps backups until the count limit removes them.",
    prune: (n: number) => (n === 0 ? "Nothing would be deleted right now." : n === 1 ? "1 backup would be deleted at the next run." : `${n} backups would be deleted at the next run.`),
    errors: {
      keepLast: "Keep a whole number of backups, from 1 to 1000.",
      maxAgeDays: "Days is a whole number from 0 to 3650.",
    } satisfies Record<RetentionError, string>,
    timeInvalid: "Enter a time like 02:30.",
    save: "Save schedule",
    saved: "Schedule saved.",
    genericError: "Something went wrong. Try again.",
    actionsFor: (name: string) => `Actions for ${name}`,
    loading: "Loading backups",
  },
  ar: {
    title: "النسخ الاحتياطية",
    description: "نسخ تلقائية ويدوية من بياناتك. استعد إحداها للرجوع إلى حالة سابقة.",
    runNow: "نسخ احتياطي الآن",
    running: "جارٍ النسخ",
    lastBackup: "آخر نسخة",
    nextRun: "النسخة القادمة",
    scheduleOff: "الجدولة متوقفة",
    storage: "المساحة المستخدمة",
    backupsCount: (n: number) => (n === 1 ? "نسخة واحدة" : n === 2 ? "نسختان" : n <= 10 ? `${n} نسخ` : `${n} نسخة`),
    never: "لا توجد نسخة بعد",
    listTitle: "سجل النسخ",
    list: "النسخ الاحتياطية",
    emptyTitle: "لا توجد نسخ احتياطية بعد",
    emptyBody: "شغّل أول نسخة الآن، أو فعّل الجدولة.",
    kind: { scheduled: "مجدولة", manual: "يدوية", "pre-restore": "قبل الاستعادة" },
    status: { completed: "مكتملة", running: "قيد التنفيذ", failed: "فشلت", restoring: "قيد الاستعادة" } satisfies Record<BackupStatus, string>,
    progressFor: (name: string) => `تقدم ${name}`,
    locked: "محفوظة حتى تحذفها",
    restore: "استعادة",
    restoreFor: (name: string) => `استعادة ${name}`,
    download: "تنزيل",
    downloadFor: (name: string) => `تنزيل ${name}`,
    remove: "حذف",
    removeFor: (name: string) => `حذف ${name}`,
    deleteTitle: (name: string) => `حذف ${name}؟`,
    deleteBody: "تُحذف هذه النسخة نهائيًا ولن تتمكن من الاستعادة منها.",
    deleteConfirm: "حذف النسخة",
    restoreTitle: (name: string) => `استعادة ${name}؟`,
    restoreBody: "تُستبدل بياناتك الحالية ببيانات هذه النسخة. تضيع التغييرات التي جرت بعد أخذها.",
    restoreSafety: "تؤخذ أولًا نسخة أمان من البيانات الحالية، ليمكنك التراجع.",
    restoreCheck: "أفهم أن بياناتي الحالية ستُستبدل.",
    restoreConfirm: "استعادة النسخة",
    cancel: "إلغاء",
    scheduleTitle: "الجدولة",
    scheduleBody: "خذ نسخة احتياطية حسب جدول، بتوقيت الخادم.",
    enabled: "النسخ التلقائي",
    frequency: "التكرار",
    frequencies: { hourly: "كل ساعة", daily: "كل يوم", weekly: "كل أسبوع", monthly: "كل شهر" } satisfies Record<BackupFrequency, string>,
    time: "الوقت",
    minute: "الدقيقة من الساعة",
    weekday: "يوم الأسبوع",
    monthlyHint: "تعمل في اليوم الأول من كل شهر.",
    retentionTitle: "الاحتفاظ",
    retentionBody: "تُحذف النسخ القديمة تلقائيًا ليبقى التخزين تحت السيطرة.",
    keepLast: "احتفظ بآخر",
    keepLastSuffix: "نسخة",
    maxAge: "الحذف بعد (أيام)",
    maxAgeHint: "الصفر يبقي النسخ إلى أن يزيلها حد العدد.",
    prune: (n: number) =>
      n === 0 ? "لن يُحذف شيء الآن." : n === 1 ? "ستُحذف نسخة واحدة عند التشغيل القادم." : n === 2 ? "ستُحذف نسختان عند التشغيل القادم." : `ستُحذف ${n} نسخ عند التشغيل القادم.`,
    errors: {
      keepLast: "أدخل عددًا صحيحًا من النسخ، من 1 إلى 1000.",
      maxAgeDays: "الأيام عدد صحيح من 0 إلى 3650.",
    } satisfies Record<RetentionError, string>,
    timeInvalid: "أدخل وقتًا مثل 02:30.",
    save: "حفظ الجدولة",
    saved: "تم حفظ الجدولة.",
    genericError: "حدث خطأ ما. حاول مرة أخرى.",
    actionsFor: (name: string) => `إجراءات ${name}`,
    loading: "جارٍ تحميل النسخ",
  },
};

export type BackupManagerLabels = (typeof STRINGS)["en"];

export type BackupKind = "scheduled" | "manual" | "pre-restore";

export interface BackupRecord {
  id: string;
  /** A name to show. Default: the date of the backup. */
  name?: string;
  createdAt: DateLike;
  sizeBytes?: number;
  kind: BackupKind;
  status: BackupStatus;
  /** 0 to 100, while `running` or `restoring`. Leave out when the length is unknown. */
  progress?: number;
  /** Kept until deleted by hand; retention never removes it. */
  locked?: boolean;
  /** Why it failed. */
  error?: string;
}

export interface BackupManagerProps extends Omit<ComponentProps<"div">, "children"> {
  backups: readonly BackupRecord[];
  schedule: BackupSchedule;
  retention: BackupRetention;
  loading?: boolean;
  /** Start a backup. Resolve, or resolve `{ error }` to show it. The host then adds a `running` backup to `backups`. */
  onRunNow: () => Promise<void | { error?: string }>;
  /** Restore this backup, after the confirm. */
  onRestore: (id: string) => Promise<void | { error?: string }>;
  /** Save the schedule and retention. */
  onSaveSchedule: (next: { schedule: BackupSchedule; retention: BackupRetention }) => Promise<void | { error?: string }>;
  /** Delete a backup. Shows Delete on finished backups. */
  onDelete?: (id: string) => Promise<void | { error?: string }>;
  /** Download a backup. Shows Download on completed backups. */
  onDownload?: (id: string) => Promise<void | { error?: string }>;
  /** Whether a safety backup is taken before a restore. Only changes the wording. Default true. */
  safetyBackup?: boolean;
  /** Override "now" (tests and stories). */
  now?: DateLike;
  /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
  labels?: Partial<BackupManagerLabels>;
}

const statusTone: Record<BackupStatus, StatusTone> = { completed: "success", running: "info", failed: "danger", restoring: "info" };

function backupName(b: BackupRecord, fmt: (d: DateLike) => string): string {
  return b.name ?? fmt(b.createdAt);
}

function RestoreDialog({
  backup,
  name,
  safety,
  onClose,
  onConfirm,
  t,
}: {
  backup: BackupRecord | null;
  name: string;
  safety: boolean;
  onClose: () => void;
  onConfirm: (id: string) => Promise<void>;
  t: BackupManagerLabels;
}) {
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  useEffect(() => {
    if (backup) setChecked(false);
  }, [backup]);
  return (
    <Dialog open={backup !== null} onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent data-slot="backup-restore">
        <DialogHeader>
          <DialogTitle>{t.restoreTitle(name)}</DialogTitle>
          <DialogDescription>{t.restoreBody}</DialogDescription>
        </DialogHeader>
        <Alert tone="warning">{safety ? t.restoreSafety : t.restoreBody}</Alert>
        <label className="flex cursor-pointer items-start gap-2.5 text-body-sm text-foreground">
          <Checkbox className="mt-0.5" checked={checked} onCheckedChange={(v) => setChecked(v === true)} />
          <span>{t.restoreCheck}</span>
        </label>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={pending} onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            type="button"
            variant="danger"
            disabled={!checked}
            loading={pending}
            onClick={async () => {
              if (!backup) return;
              setPending(true);
              try {
                await onConfirm(backup.id);
              } finally {
                setPending(false);
                onClose();
              }
            }}
          >
            {t.restoreConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Backups in one place: a summary (last backup, next run, storage), the history with progress for a running
 * backup or restore, run now, download, delete and a restore that needs a confirmation, and a form for the
 * schedule (hourly to monthly) and retention (keep the last N, delete after N days) with a live preview of
 * what retention would remove. It is presentational: your callbacks talk to the server and you pass `backups` back.
 */
export function BackupManager({
  backups,
  schedule,
  retention,
  loading = false,
  onRunNow,
  onRestore,
  onSaveSchedule,
  onDelete,
  onDownload,
  safetyBackup = true,
  now,
  labels,
  className,
  ...props
}: BackupManagerProps) {
  const nasaq = useOptionalNasaq();
  const locale = nasaq?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labels };
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [restoring, setRestoring] = useState<BackupRecord | null>(null);

  const [draft, setDraft] = useState<BackupSchedule>(schedule);
  const [keepLast, setKeepLast] = useState(String(retention.keepLast));
  const [maxAge, setMaxAge] = useState(String(retention.maxAgeDays ?? 0));
  const [saving, setSaving] = useState(false);
  useEffect(() => setDraft(schedule), [schedule]);
  useEffect(() => {
    setKeepLast(String(retention.keepLast));
    setMaxAge(String(retention.maxAgeDays ?? 0));
  }, [retention]);

  const dateFmt = useMemo(() => new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" }), [locale]);
  const fmtDate = (d: DateLike) => dateFmt.format(new Date(d));
  const weekdays = useMemo(() => Array.from({ length: 7 }, (_, d) => new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date(2024, 0, 7 + d))), [locale]);

  const sorted = useMemo(() => [...backups].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [backups]);
  const busy = backups.some((b) => b.status === "running" || b.status === "restoring");
  const last = sorted.find((b) => b.status === "completed" || b.status === "failed");
  const next = nextRun(schedule, now);

  const keepNum = Number(keepLast);
  const ageNum = Number(maxAge);
  const retentionDraft: BackupRetention = { keepLast: keepNum, maxAgeDays: ageNum };
  const retentionError = validateRetention(retentionDraft);
  const timeError = parseTime(draft.time) ? null : t.timeInvalid;
  const dirty =
    JSON.stringify({ ...draft, dayOfWeek: draft.frequency === "weekly" ? (draft.dayOfWeek ?? 0) : undefined }) !==
      JSON.stringify({ ...schedule, dayOfWeek: schedule.frequency === "weekly" ? (schedule.dayOfWeek ?? 0) : undefined }) ||
    keepNum !== retention.keepLast ||
    ageNum !== (retention.maxAgeDays ?? 0);
  const prunable = retentionError ? [] : pruneCandidates(backups, retentionDraft, now);

  async function run<T extends void | { error?: string }>(fn: () => Promise<T>) {
    setError(null);
    setNotice(null);
    try {
      const result = await fn();
      if (result && (result as { error?: string }).error) setError((result as { error: string }).error);
      return !(result && (result as { error?: string }).error);
    } catch {
      setError(t.genericError);
      return false;
    }
  }

  async function runNow() {
    setStarting(true);
    await run(onRunNow);
    setStarting(false);
  }

  async function save() {
    if (retentionError || timeError) return;
    setSaving(true);
    const ok = await run(() => onSaveSchedule({ schedule: draft, retention: retentionDraft }));
    setSaving(false);
    if (ok) setNotice(t.saved);
  }

  const dayItems = weekdays.map((label, i) => ({ value: String(i), label }));
  const freqItems = (Object.keys(t.frequencies) as BackupFrequency[]).map((value) => ({ value, label: t.frequencies[value] }));

  return (
    <Card data-slot="backup-manager" className={cn("w-full max-w-5xl", className)} {...props}>
      <CardHeader className="sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex flex-col gap-1.5">
          <CardTitle as="h2">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <Button type="button" variant="primary" className="mt-3 sm:mt-0" loading={starting} disabled={busy || starting} onClick={runNow}>
          <Play aria-hidden />
          {busy ? t.running : t.runNow}
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {error ? (
          <Alert tone="danger" onDismiss={() => setError(null)}>
            {error}
          </Alert>
        ) : null}
        {notice ? (
          <Alert tone="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        ) : null}

        <dl data-slot="backup-summary" className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-card border border-border p-3">
            <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <Archive aria-hidden className="size-3.5" />
              {t.lastBackup}
            </dt>
            <dd className="flex flex-col gap-0.5">
              {last ? (
                <>
                  <Status tone={statusTone[last.status]}>{t.status[last.status]}</Status>
                  <DateTime value={last.createdAt} relative className="text-caption text-muted-foreground" />
                </>
              ) : (
                <span className="text-body-sm text-muted-foreground">{t.never}</span>
              )}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-card border border-border p-3">
            <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <CalendarClock aria-hidden className="size-3.5" />
              {t.nextRun}
            </dt>
            <dd className="text-body-sm text-foreground">
              {next ? <DateTime value={next} format={{ dateStyle: "medium", timeStyle: "short" }} /> : <span className="text-muted-foreground">{t.scheduleOff}</span>}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-card border border-border p-3">
            <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
              <HardDrive aria-hidden className="size-3.5" />
              {t.storage}
            </dt>
            <dd className="flex flex-col gap-0.5">
              <span dir="ltr" className="w-fit text-body-sm tabular-nums text-foreground">
                {formatBytes(totalSize(backups))}
              </span>
              <span className="text-caption text-muted-foreground">{t.backupsCount(backups.filter((b) => b.status === "completed").length)}</span>
            </dd>
          </div>
        </dl>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
          <section aria-labelledby="backup-history" className="flex min-w-0 flex-col gap-3">
            <h3 id="backup-history" className="text-h4 text-foreground">
              {t.listTitle}
            </h3>
            {loading ? (
              <div role="status" aria-label={t.loading} className="flex flex-col gap-3">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <EmptyState icon={Archive} title={t.emptyTitle} description={t.emptyBody} />
            ) : (
              <ul aria-label={t.list} className="overflow-hidden rounded-card border border-border">
                {sorted.map((b) => {
                  const name = backupName(b, fmtDate);
                  const active = b.status === "running" || b.status === "restoring";
                  return (
                    <li key={b.id} data-slot="backup" data-status={b.status} className="flex flex-col gap-3 border-t border-border px-4 py-3 first:border-t-0 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-label text-foreground" dir="auto">
                            {name}
                          </span>
                          <Badge variant="outline">{t.kind[b.kind]}</Badge>
                          {b.locked ? (
                            <span title={t.locked} className="inline-flex text-muted-foreground">
                              <Lock aria-label={t.locked} role="img" className="size-3.5" />
                            </span>
                          ) : null}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
                          <Status tone={statusTone[b.status]}>{t.status[b.status]}</Status>
                          {b.sizeBytes != null && b.status !== "running" ? (
                            <span dir="ltr" className="tabular-nums">
                              {formatBytes(b.sizeBytes)}
                            </span>
                          ) : null}
                          {b.name ? <DateTime value={b.createdAt} relative /> : null}
                        </div>
                        {active ? (
                          <Progress
                            aria-label={t.progressFor(name)}
                            value={b.progress === undefined ? null : clampPercent(b.progress)}
                            size="sm"
                            tone="info"
                            showValue
                            valueText={b.progress === undefined ? undefined : <Num value={clampPercent(b.progress) / 100} format={{ style: "percent" }} />}
                            label={<span className="sr-only">{t.progressFor(name)}</span>}
                          />
                        ) : null}
                        {b.status === "failed" && b.error ? (
                          <p className="flex items-center gap-1.5 text-caption text-nq-danger-text">
                            <CircleAlert aria-hidden className="size-3.5 shrink-0" />
                            <span dir="auto">{b.error}</span>
                          </p>
                        ) : null}
                      </div>
                      {!active ? (
                        <div role="group" aria-label={t.actionsFor(name)} className="flex shrink-0 flex-wrap gap-2">
                          {b.status === "completed" ? (
                            <Button type="button" size="sm" variant="secondary" disabled={busy} aria-label={t.restoreFor(name)} onClick={() => setRestoring(b)}>
                              <RotateCcw aria-hidden className="rtl:-scale-x-100" />
                              {t.restore}
                            </Button>
                          ) : null}
                          {b.status === "completed" && onDownload ? (
                            <Button type="button" size="sm" variant="ghost" aria-label={t.downloadFor(name)} onClick={() => run(() => onDownload(b.id))}>
                              <Download aria-hidden />
                              {t.download}
                            </Button>
                          ) : null}
                          {onDelete ? (
                            <ConfirmButton
                              size="sm"
                              variant="danger"
                              aria-label={t.removeFor(name)}
                              title={t.deleteTitle(name)}
                              description={t.deleteBody}
                              confirmLabel={t.deleteConfirm}
                              onConfirm={() => run(() => onDelete(b.id))}
                            >
                              <Trash2 aria-hidden />
                              {t.remove}
                            </ConfirmButton>
                          ) : null}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-labelledby="backup-schedule" data-slot="backup-schedule" className="flex flex-col gap-4 rounded-card border border-border p-4 lg:self-start">
            <div className="flex flex-col gap-1">
              <h3 id="backup-schedule" className="text-h4 text-foreground">
                {t.scheduleTitle}
              </h3>
              <p className="text-body-sm text-muted-foreground">{t.scheduleBody}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span id="backup-enabled" className="text-label text-foreground">
                {t.enabled}
              </span>
              <Switch aria-labelledby="backup-enabled" checked={draft.enabled} onCheckedChange={(v) => setDraft((d) => ({ ...d, enabled: v }))} />
            </div>
            <fieldset disabled={!draft.enabled} className="m-0 grid gap-4 border-0 p-0 disabled:opacity-60">
              <Field>
                <FieldLabel>{t.frequency}</FieldLabel>
                <Select items={freqItems} value={draft.frequency} onValueChange={(v) => v && setDraft((d) => ({ ...d, frequency: v as BackupFrequency }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {freqItems.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              {draft.frequency === "weekly" ? (
                <Field>
                  <FieldLabel>{t.weekday}</FieldLabel>
                  <Select items={dayItems} value={String(draft.dayOfWeek ?? 0)} onValueChange={(v) => v && setDraft((d) => ({ ...d, dayOfWeek: Number(v) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {dayItems.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field invalid={Boolean(timeError)}>
                <FieldLabel>{draft.frequency === "hourly" ? t.minute : t.time}</FieldLabel>
                <Input ltr type="time" value={draft.time} onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))} />
                {timeError ? <FieldError match>{timeError}</FieldError> : draft.frequency === "monthly" ? <FieldDescription>{t.monthlyHint}</FieldDescription> : null}
              </Field>
            </fieldset>
            <div className="flex flex-col gap-1 border-t border-border pt-4">
              <h4 className="text-label text-foreground">{t.retentionTitle}</h4>
              <p className="text-caption text-muted-foreground">{t.retentionBody}</p>
            </div>
            <Field invalid={retentionError === "keepLast"}>
              <FieldLabel>
                {t.keepLast} <span className="text-muted-foreground">({t.keepLastSuffix})</span>
              </FieldLabel>
              <Input ltr inputMode="numeric" value={keepLast} onChange={(e) => setKeepLast(e.target.value)} />
              {retentionError === "keepLast" ? <FieldError match>{t.errors.keepLast}</FieldError> : null}
            </Field>
            <Field invalid={retentionError === "maxAgeDays"}>
              <FieldLabel>{t.maxAge}</FieldLabel>
              <Input ltr inputMode="numeric" value={maxAge} onChange={(e) => setMaxAge(e.target.value)} />
              {retentionError === "maxAgeDays" ? <FieldError match>{t.errors.maxAgeDays}</FieldError> : <FieldDescription>{t.maxAgeHint}</FieldDescription>}
            </Field>
            {!retentionError ? (
              <p role="status" data-slot="backup-prune" className="text-caption text-muted-foreground">
                {t.prune(prunable.length)}
              </p>
            ) : null}
            <Button type="button" variant="primary" disabled={!dirty || Boolean(retentionError) || Boolean(timeError)} loading={saving} onClick={save}>
              {t.save}
            </Button>
          </section>
        </div>
      </CardContent>
      <RestoreDialog
        backup={restoring}
        name={restoring ? backupName(restoring, fmtDate) : ""}
        safety={safetyBackup}
        onClose={() => setRestoring(null)}
        onConfirm={async (id) => {
          await run(() => onRestore(id));
        }}
        t={t}
      />
    </Card>
  );
}
