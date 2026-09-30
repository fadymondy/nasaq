"use client";

import { ArrowDownToLine, CircleAlert, CircleCheck, RefreshCw, RotateCw, Sparkles, Wrench } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Input } from "../field";
import { DateTime } from "../numeric";
import { Progress } from "../progress";
import { ProductLogo } from "../product-mark";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "../sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../table";
import {
  type AppRelease,
  clampUpdatePercent,
  countBelow,
  formatUpdateSize,
  formatUpdateTime,
  formatUpdateSpeed,
  isUpdateRequired,
  minBuildProblem,
  type ReleaseNote,
  secondsLeft,
  type UpdateStatus,
} from "./app-update-format";

const STRINGS = {
  en: {
    pillAvailable: "Update available",
    pillDownloading: "Downloading {percent}%",
    pillReady: "Restart to update",
    pillError: "Update failed",
    pillHint: "Version {version}",
    sheetTitle: "Version {version} is ready",
    sheetDescription: "Build {build}",
    whatsNew: "What is new",
    noNotes: "Fixes and improvements.",
    typeNew: "New",
    typeImproved: "Improved",
    typeFixed: "Fixed",
    download: "Download update",
    downloading: "Downloading update",
    speed: "Speed",
    remaining: "left",
    size: "Size",
    restart: "Restart now",
    later: "Later",
    retry: "Try again",
    readyNote: "The update is downloaded. Restarting takes a few seconds and keeps your work.",
    errorNote: "The download did not finish. Check your connection and try again.",
    forcedTitle: "Please update to continue",
    forcedBody: "This version is no longer supported. Update to keep using the app.",
    forcedVersions: "You have build {current}. The oldest supported build is {min}.",
    managerTitle: "Releases",
    managerDescription: "Publish builds, roll them out slowly and decide the oldest build that may still run.",
    minBuild: "Minimum supported build",
    minBuildHint: "Builds below this are stopped and must update.",
    save: "Save",
    saved: "Saved",
    invalid: "Enter a whole number, 0 or more.",
    tooHigh: "That is newer than the latest release.",
    blocked: "{count} people are on a build below this and will be asked to update.",
    version: "Version",
    build: "Build",
    channel: "Channel",
    released: "Released",
    rollout: "Rollout",
    status: "Status",
    actions: "Actions",
    stable: "Stable",
    beta: "Beta",
    draft: "Draft",
    live: "Live",
    rolledBack: "Rolled back",
    publish: "Publish",
    rollback: "Roll back",
    releasesLabel: "Releases",
    empty: "No releases yet.",
    minTag: "Min",
  },
  ar: {
    pillAvailable: "تحديث متاح",
    pillDownloading: "جارٍ التنزيل {percent}%",
    pillReady: "أعد التشغيل للتحديث",
    pillError: "فشل التحديث",
    pillHint: "الإصدار {version}",
    sheetTitle: "الإصدار {version} جاهز",
    sheetDescription: "النسخة {build}",
    whatsNew: "الجديد",
    noNotes: "إصلاحات وتحسينات.",
    typeNew: "جديد",
    typeImproved: "تحسين",
    typeFixed: "إصلاح",
    download: "تنزيل التحديث",
    downloading: "جارٍ تنزيل التحديث",
    speed: "السرعة",
    remaining: "متبقية",
    size: "الحجم",
    restart: "أعد التشغيل الآن",
    later: "لاحقاً",
    retry: "حاول مرة أخرى",
    readyNote: "تم تنزيل التحديث. إعادة التشغيل تستغرق ثوانٍ ولا تفقدك عملك.",
    errorNote: "لم يكتمل التنزيل. تحقق من اتصالك وحاول مرة أخرى.",
    forcedTitle: "يرجى التحديث للمتابعة",
    forcedBody: "هذا الإصدار لم يعد مدعوماً. حدّث التطبيق لتواصل استخدامه.",
    forcedVersions: "لديك النسخة {current}. أقدم نسخة مدعومة هي {min}.",
    managerTitle: "الإصدارات",
    managerDescription: "انشر النسخ، وأطلقها تدريجياً، وحدد أقدم نسخة يُسمح لها بالعمل.",
    minBuild: "أدنى نسخة مدعومة",
    minBuildHint: "النسخ الأقدم من هذا الرقم تتوقف ويجب أن تُحدَّث.",
    save: "حفظ",
    saved: "تم الحفظ",
    invalid: "أدخل رقماً صحيحاً، صفراً أو أكثر.",
    tooHigh: "هذا الرقم أحدث من آخر إصدار.",
    blocked: "{count} مستخدماً على نسخة أقدم من هذا الرقم وسيُطلب منهم التحديث.",
    version: "الإصدار",
    build: "النسخة",
    channel: "القناة",
    released: "تاريخ الإصدار",
    rollout: "الإطلاق",
    status: "الحالة",
    actions: "الإجراءات",
    stable: "مستقر",
    beta: "تجريبي",
    draft: "مسودة",
    live: "منشور",
    rolledBack: "تم التراجع",
    publish: "نشر",
    rollback: "تراجع",
    releasesLabel: "الإصدارات",
    empty: "لا توجد إصدارات بعد.",
    minTag: "الأدنى",
  },
};

export type AppUpdateLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<AppUpdateLabels>) {
  const nasaq = useOptionalNasaq();
  const ar = nasaq?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar, locale: nasaq?.locale ?? "en" };
}

const fill = (text: string, values: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

/* ------------------------------------------------------------------ pill */

export interface UpdatePillProps extends Omit<ComponentProps<"button">, "children" | "type"> {
  status: UpdateStatus;
  /** 0 to 100, while `downloading`. */
  progress?: number;
  version?: string;
  labels?: Partial<AppUpdateLabels>;
}

/**
 * A small pill for a title bar or header. It says an update is available, shows the download as it runs, and turns
 * into "Restart to update" when it is ready. Pressing it opens your `UpdateSheet` or starts the restart.
 */
export function UpdatePill({ status, progress = 0, version, labels, className, ...props }: UpdatePillProps) {
  const { t } = useLabels(labels);
  const percent = Math.round(clampUpdatePercent(progress));
  const text = {
    available: t.pillAvailable,
    downloading: fill(t.pillDownloading, { percent }),
    ready: t.pillReady,
    error: t.pillError,
  }[status];
  const Icon = { available: ArrowDownToLine, downloading: RefreshCw, ready: CircleCheck, error: CircleAlert }[status];
  return (
    <button
      type="button"
      data-slot="update-pill"
      data-status={status}
      title={version ? fill(t.pillHint, { version }) : undefined}
      className={cn(
        "relative inline-flex h-control-sm items-center gap-1.5 overflow-hidden rounded-full border px-3 text-label outline-none focus-visible:outline-2 focus-visible:outline-nq-focus",
        status === "ready" && "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
        status === "error" && "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
        (status === "available" || status === "downloading") && "border-border bg-card text-foreground hover:bg-nq-hover",
        className,
      )}
      {...props}
    >
      {status === "downloading" ? (
        <span
          aria-hidden
          data-slot="update-pill-fill"
          className="absolute inset-y-0 start-0 bg-primary/15 transition-[inline-size] duration-300 ease-nq motion-reduce:transition-none"
          style={{ inlineSize: `${percent}%` }}
        />
      ) : null}
      <Icon aria-hidden className={cn("relative size-3.5", status === "downloading" && "motion-safe:animate-spin")} />
      <span className="relative" aria-live="polite">
        {text}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ notes + progress */

function NoteType({ type, t }: { type: ReleaseNote["type"]; t: AppUpdateLabels }) {
  const map = {
    new: ["info", t.typeNew],
    improved: ["accent", t.typeImproved],
    fixed: ["success", t.typeFixed],
  } as const;
  const [variant, label] = map[type];
  return (
    <Badge variant={variant} className="mt-0.5 shrink-0">
      {label}
    </Badge>
  );
}

function ReleaseNotes({ notes, t, className }: { notes?: readonly ReleaseNote[]; t: AppUpdateLabels; className?: string }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className={cn("flex flex-col gap-2", className)}>
      <h3 id={headingId} className="text-label text-foreground">
        {t.whatsNew}
      </h3>
      {notes?.length ? (
        <ul className="flex flex-col gap-2">
          {notes.map((n, i) => (
            <li key={i} className="flex items-start gap-2 text-body-sm text-nq-fg-body">
              <NoteType type={n.type} t={t} />
              <span dir="auto">{n.text}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-muted-foreground">{t.noNotes}</p>
      )}
    </section>
  );
}

function DownloadProgress({
  progress,
  speed,
  totalBytes,
  t,
  locale,
}: {
  progress: number;
  speed?: number;
  totalBytes?: number;
  t: AppUpdateLabels;
  locale: string;
}) {
  const percent = clampUpdatePercent(progress);
  const done = totalBytes ? (totalBytes * percent) / 100 : 0;
  const left = totalBytes && speed ? secondsLeft(totalBytes, done, speed) : null;
  return (
    <div data-slot="update-progress" className="flex flex-col gap-1.5">
      <Progress value={percent} label={t.downloading} />
      <p className="flex items-center justify-between text-caption text-muted-foreground tabular-nums">
        <span dir="ltr">{speed ? formatUpdateSpeed(speed, locale) : null}</span>
        <span dir="ltr">{left !== null ? `${formatUpdateTime(left)} ${t.remaining}` : null}</span>
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ sheet */

export interface UpdateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  release: AppRelease;
  status: UpdateStatus;
  /** 0 to 100 while downloading. */
  progress?: number;
  /** Bytes per second while downloading. */
  speed?: number;
  /** Starts the download from `available`, and again after an `error`. */
  onDownload?: () => void;
  /** Restarts into the new version from `ready`. */
  onRestart?: () => void;
  /** "Later". Closes the sheet by default. */
  onLater?: () => void;
  side?: "end" | "start" | "bottom";
  labels?: Partial<AppUpdateLabels>;
}

/**
 * The update details in a side sheet: release notes, size, then the download with speed and time left, then Restart or
 * Later. It is controlled, and it never downloads or restarts by itself: you drive `status` and `progress`.
 */
export function UpdateSheet({ open, onOpenChange, release, status, progress = 0, speed, onDownload, onRestart, onLater, side = "end", labels }: UpdateSheetProps) {
  const { t, locale } = useLabels(labels);
  const later = () => {
    onLater?.();
    onOpenChange(false);
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={side} data-slot="update-sheet" data-status={status}>
        <SheetHeader>
          <SheetTitle className="text-h3">{fill(t.sheetTitle, { version: release.version })}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-2">
            <span>{fill(t.sheetDescription, { build: release.build })}</span>
            {release.date !== undefined ? <DateTime value={release.date} format={{ dateStyle: "medium" }} /> : null}
            {release.channel === "beta" ? <Badge variant="warning">{t.beta}</Badge> : null}
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-5 p-4">
          <ReleaseNotes notes={release.notes} t={t} />
          {release.size ? (
            <p className="flex items-center justify-between text-body-sm">
              <span className="text-muted-foreground">{t.size}</span>
              <span dir="ltr" className="tabular-nums">
                {formatUpdateSize(release.size, locale)}
              </span>
            </p>
          ) : null}
          {status === "downloading" ? <DownloadProgress progress={progress} speed={speed} totalBytes={release.size} t={t} locale={locale} /> : null}
          {status === "ready" ? (
            <Alert tone="success" icon={CircleCheck}>
              {t.readyNote}
            </Alert>
          ) : null}
          {status === "error" ? <Alert tone="danger">{t.errorNote}</Alert> : null}
        </SheetBody>
        <SheetFooter className="justify-end">
          <Button variant="ghost" onClick={later}>
            {t.later}
          </Button>
          {status === "ready" ? (
            <Button variant="primary" onClick={onRestart}>
              <RotateCw aria-hidden />
              {t.restart}
            </Button>
          ) : (
            <Button variant="primary" loading={status === "downloading"} onClick={onDownload}>
              {status === "error" ? t.retry : t.download}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ forced update gate */

export interface ForcedUpdateGateProps extends Omit<ComponentProps<"main">, "children"> {
  /** The build running now. */
  currentBuild: number;
  /** The oldest build the server still supports. Below it, the gate blocks. */
  minSupportedBuild: number | null | undefined;
  /** The release to update to. */
  release: AppRelease;
  status: UpdateStatus;
  progress?: number;
  speed?: number;
  onDownload?: () => void;
  onRestart?: () => void;
  /** Your logo. Defaults to the provider brand. */
  logo?: ReactNode;
  /** The app, shown when the build is supported. */
  children?: ReactNode;
  labels?: Partial<AppUpdateLabels>;
}

/**
 * Wraps the app. While the running build is at or above `minSupportedBuild` it renders `children`. Below it, it
 * renders a full screen with no way to dismiss: the only path is to download and restart.
 */
export function ForcedUpdateGate({
  currentBuild,
  minSupportedBuild,
  release,
  status,
  progress = 0,
  speed,
  onDownload,
  onRestart,
  logo,
  children,
  labels,
  className,
  ...props
}: ForcedUpdateGateProps) {
  const { t, locale } = useLabels(labels);
  if (!isUpdateRequired(currentBuild, minSupportedBuild)) return <>{children}</>;
  return (
    <main
      data-slot="forced-update-gate"
      data-status={status}
      className={cn("flex min-h-dvh flex-col items-center justify-center gap-8 bg-background p-6 text-center text-foreground", className)}
      {...props}
    >
      {logo === undefined ? <ProductLogo size={24} /> : logo}
      <div className="flex w-full max-w-md flex-col items-center gap-5">
        <span aria-hidden className="inline-flex size-12 items-center justify-center rounded-card border border-border bg-card text-nq-warning-text">
          <Sparkles className="size-6" />
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-h2">{t.forcedTitle}</h1>
          <p className="text-body text-muted-foreground">{t.forcedBody}</p>
          <p className="text-caption text-muted-foreground">
            {fill(t.forcedVersions, { current: currentBuild, min: minSupportedBuild ?? "" })}
          </p>
        </div>
        <div className="w-full rounded-card border border-border bg-card p-4 text-start">
          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="text-label">{fill(t.sheetTitle, { version: release.version })}</span>
            {release.size ? (
              <span dir="ltr" className="text-caption text-muted-foreground tabular-nums">
                {formatUpdateSize(release.size, locale)}
              </span>
            ) : null}
          </div>
          <ReleaseNotes notes={release.notes?.slice(0, 3)} t={t} />
          {status === "downloading" ? <DownloadProgress progress={progress} speed={speed} totalBytes={release.size} t={t} locale={locale} /> : null}
          {status === "error" ? <Alert tone="danger" className="mt-3">{t.errorNote}</Alert> : null}
        </div>
        {status === "ready" ? (
          <Button variant="primary" size="lg" onClick={onRestart}>
            <RotateCw aria-hidden />
            {t.restart}
          </Button>
        ) : (
          <Button variant="primary" size="lg" loading={status === "downloading"} onClick={onDownload}>
            {status === "error" ? t.retry : t.download}
          </Button>
        )}
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ release manager */

export type ReleaseStatus = "draft" | "live" | "rolled-back";

export interface ManagedRelease extends AppRelease {
  id: string;
  status: ReleaseStatus;
  /** Percent of people who can receive it, 0 to 100. */
  rollout?: number;
}

export interface ReleaseManagerProps extends Omit<ComponentProps<"section">, "children"> {
  releases: readonly ManagedRelease[];
  minSupportedBuild: number;
  /** Optional: how many people run each build, to warn before raising the minimum. */
  usage?: readonly { build: number; users: number }[];
  onSetMinSupportedBuild: (build: number) => Promise<void | { error?: string }>;
  onPublish?: (id: string) => Promise<void | { error?: string }>;
  onRollback?: (id: string) => Promise<void | { error?: string }>;
  labels?: Partial<AppUpdateLabels>;
}

/**
 * The admin view of releases: the list with channel, rollout and status, publish and roll back per row, and the
 * minimum supported build that drives `ForcedUpdateGate`. Raising the minimum warns how many people it will block.
 */
export function ReleaseManager({ releases, minSupportedBuild, usage, onSetMinSupportedBuild, onPublish, onRollback, labels, className, ...props }: ReleaseManagerProps) {
  const { t, locale } = useLabels(labels);
  const [draft, setDraft] = useState(String(minSupportedBuild));
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const inputId = useId();
  const latest = releases.reduce((m, r) => Math.max(m, r.build), 0);
  const value = draft.trim() === "" ? Number.NaN : Number(draft);
  const problem = minBuildProblem(value, latest);
  const blocked = usage && !problem ? countBelow(usage, value) : 0;
  const changed = value !== minSupportedBuild;
  const statusBadge = (s: ReleaseStatus) =>
    s === "live" ? <Badge variant="success">{t.live}</Badge> : s === "draft" ? <Badge variant="neutral">{t.draft}</Badge> : <Badge variant="warning">{t.rolledBack}</Badge>;

  const save = async () => {
    if (problem) return;
    setSaving(true);
    setNotice(null);
    try {
      const result = await onSetMinSupportedBuild(value);
      setNotice(result && "error" in result && result.error ? result.error : t.saved);
    } finally {
      setSaving(false);
    }
  };
  const act = async (key: string, fn?: (id: string) => Promise<void | { error?: string }>, id?: string) => {
    if (!fn || !id) return;
    setPending(key);
    try {
      await fn(id);
    } finally {
      setPending(null);
    }
  };

  return (
    <section data-slot="release-manager" className={cn("flex w-full flex-col gap-5 rounded-card border border-border bg-card p-4", className)} {...props}>
      <header className="flex flex-col gap-1">
        <h2 className="text-h3">{t.managerTitle}</h2>
        <p className="text-body-sm text-muted-foreground">{t.managerDescription}</p>
      </header>
      <div className="flex flex-col gap-2">
        <label htmlFor={inputId} className="text-label">
          {t.minBuild}
        </label>
        <div className="flex items-start gap-2">
          <Input id={inputId} ltr inputMode="numeric" value={draft} onChange={(e) => setDraft(e.target.value)} aria-invalid={problem ? true : undefined} className="w-32" />
          <Button variant="primary" loading={saving} disabled={Boolean(problem) || !changed} onClick={save}>
            {t.save}
          </Button>
        </div>
        <p className={cn("text-caption", problem ? "text-nq-danger-text" : "text-muted-foreground")}>
          {problem === "invalid" ? t.invalid : problem === "too-high" ? t.tooHigh : t.minBuildHint}
        </p>
        {blocked > 0 && changed ? (
          <Alert tone="warning" icon={Wrench}>
            {fill(t.blocked, { count: new Intl.NumberFormat(locale, { numberingSystem: "latn" }).format(blocked) })}
          </Alert>
        ) : null}
        {notice ? (
          <p role="status" className="text-caption text-nq-success-text">
            {notice}
          </p>
        ) : null}
      </div>
      <Table label={t.releasesLabel}>
        <TableHeader>
          <TableRow>
            <TableHead>{t.version}</TableHead>
            <TableHead>{t.build}</TableHead>
            <TableHead>{t.channel}</TableHead>
            <TableHead>{t.released}</TableHead>
            <TableHead>{t.rollout}</TableHead>
            <TableHead>{t.status}</TableHead>
            <TableHead className="text-end">{t.actions}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {releases.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-6 text-center text-muted-foreground">
                {t.empty}
              </TableCell>
            </TableRow>
          ) : (
            releases.map((r) => (
              <TableRow key={r.id}>
                <TableCell dir="ltr" className="text-start font-mono">
                  {r.version}
                </TableCell>
                <TableCell dir="ltr" className="text-start font-mono">
                  {r.build}
                  {r.build === minSupportedBuild ? <Badge variant="outline" className="ms-2">{t.minTag}</Badge> : null}
                </TableCell>
                <TableCell>{r.channel === "beta" ? <Badge variant="warning">{t.beta}</Badge> : <Badge variant="neutral">{t.stable}</Badge>}</TableCell>
                <TableCell>{r.date !== undefined ? <DateTime value={r.date} format={{ dateStyle: "medium" }} /> : null}</TableCell>
                <TableCell dir="ltr" className="text-start tabular-nums">
                  {r.rollout !== undefined ? `${r.rollout}%` : "—"}
                </TableCell>
                <TableCell>{statusBadge(r.status)}</TableCell>
                <TableCell className="text-end">
                  {r.status === "live" && onRollback ? (
                    <Button size="sm" variant="ghost" loading={pending === `rb-${r.id}`} onClick={() => act(`rb-${r.id}`, onRollback, r.id)}>
                      {t.rollback}
                    </Button>
                  ) : null}
                  {r.status !== "live" && onPublish ? (
                    <Button size="sm" variant="secondary" loading={pending === `pub-${r.id}`} onClick={() => act(`pub-${r.id}`, onPublish, r.id)}>
                      {t.publish}
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </section>
  );
}
