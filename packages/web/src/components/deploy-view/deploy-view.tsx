"use client";

import { Ban, ChevronRight, CircleCheck, CircleDashed, CircleMinus, CircleX, type LucideIcon, RotateCcw, Square } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Progress } from "../progress";
import { Spinner } from "../spinner";
import { AnsiText } from "../terminal";
import { useFollowScroll } from "../terminal/follow-scroll";
import {
  completedCount,
  DEFAULT_UNITS,
  type DeployStatus,
  deriveStatus,
  type DurationUnits,
  formatDuration,
  stepDuration,
  tailLines,
  totalDuration,
} from "./deploy-view-format";

export {
  completedCount,
  type DeployStatus,
  deriveStatus,
  type DurationUnits,
  formatDuration,
  stepDuration,
  tailLines,
  totalDuration,
} from "./deploy-view-format";

const STRINGS = {
  en: {
    title: "Deploy",
    steps: "Deploy steps",
    status: {
      pending: "Queued",
      running: "Running",
      success: "Succeeded",
      failed: "Failed",
      skipped: "Skipped",
      cancelled: "Cancelled",
    } as Record<DeployStatus, string>,
    progress: (done: number, total: number) => `${done} of ${total} steps`,
    duration: "Duration",
    cancel: "Cancel deploy",
    retry: "Retry step",
    retryFrom: "Retry from here",
    retrying: "Retrying",
    retryFailed: "Could not retry. Try again.",
    noLogs: "No output for this step.",
    waitingLogs: "Waiting for output...",
    jump: "Jump to latest",
    trimmed: (n: number) => (n === 1 ? "1 earlier line hidden" : `${n} earlier lines hidden`),
    logs: (step: string) => `Logs for ${step}`,
    units: DEFAULT_UNITS,
    stepLabel: (n: number, name: string, status: string) => `Step ${n}: ${name}, ${status}`,
  },
  ar: {
    title: "النشر",
    steps: "خطوات النشر",
    status: {
      pending: "في الانتظار",
      running: "قيد التنفيذ",
      success: "نجح",
      failed: "فشل",
      skipped: "تم تخطيه",
      cancelled: "أُلغي",
    } as Record<DeployStatus, string>,
    progress: (done: number, total: number) => `${done} من ${total} خطوات`,
    duration: "المدة",
    cancel: "إلغاء النشر",
    retry: "إعادة محاولة الخطوة",
    retryFrom: "إعادة المحاولة من هنا",
    retrying: "جارٍ إعادة المحاولة",
    retryFailed: "تعذرت إعادة المحاولة. حاول مرة أخرى.",
    noLogs: "لا توجد مخرجات لهذه الخطوة.",
    waitingLogs: "بانتظار المخرجات...",
    jump: "الانتقال إلى الأحدث",
    trimmed: (n: number) => (n === 1 ? "أُخفي سطر سابق واحد" : `أُخفيت ${n} أسطر سابقة`),
    logs: (step: string) => `سجلات ${step}`,
    units: { ms: "مث", s: "ث", m: "د", h: "س" } as DurationUnits,
    stepLabel: (n: number, name: string, status: string) => `الخطوة ${n}: ${name}، ${status}`,
  },
};

export type DeployViewLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<DeployViewLabels>): DeployViewLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

export interface DeployStep {
  id: string;
  /** Human name: "Install dependencies". */
  name: string;
  /** The command or script this step runs. Shown in monospace, always left-to-right. */
  command?: string;
  status: DeployStatus;
  /** When it started. While `running`, the duration counts up from here. */
  startedAt?: Date | string | number;
  /** How long it took, once finished. */
  durationMs?: number;
  /** Output so far, with ANSI colours allowed. Append while running. */
  logs?: string;
  /** Why it failed, shown above the logs. */
  error?: string;
}

/** What a retry callback returns: nothing on success, or a message to show. */
export type DeployResult = void | { error?: string };

const STATUS_ICON: Record<Exclude<DeployStatus, "running">, LucideIcon> = {
  pending: CircleDashed,
  success: CircleCheck,
  failed: CircleX,
  skipped: CircleMinus,
  cancelled: Ban,
};
const STATUS_TEXT: Record<DeployStatus, string> = {
  pending: "text-muted-foreground",
  running: "text-nq-info-text",
  success: "text-nq-success-text",
  failed: "text-nq-danger-text",
  skipped: "text-muted-foreground",
  cancelled: "text-nq-warning-text",
};
const BADGE: Record<DeployStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  pending: "neutral",
  running: "info",
  success: "success",
  failed: "danger",
  skipped: "neutral",
  cancelled: "warning",
};
const PROGRESS_TONE = { pending: "default", running: "info", success: "success", failed: "danger", skipped: "default", cancelled: "warning" } as const;

/** The status glyph: a spinner while running, otherwise a distinct shape per status so it reads without colour. */
function StatusIcon({ status, className }: { status: DeployStatus; className?: string }) {
  if (status === "running") return <Spinner className={cn("size-4", STATUS_TEXT.running, className)} />;
  const Glyph = STATUS_ICON[status];
  return <Glyph aria-hidden className={cn("size-4", STATUS_TEXT[status], className)} />;
}

/** Re-renders every second while `active`, so running durations tick. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export interface DeployViewProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  /** What is being deployed: "Deploy api to production". */
  title?: ReactNode;
  /** Commit, branch, who started it. Shown under the title. */
  meta?: ReactNode;
  /** Ordered steps. Update their status, duration and logs as the deploy advances. */
  steps: readonly DeployStep[];
  /** Overall status. Default: derived from the steps. */
  status?: DeployStatus;
  /** Cancel the running deploy. The button shows only while the run is running. */
  onCancel?: () => Promise<DeployResult> | DeployResult;
  /** Retry one failed step. Resolve with `{ error }` to show a message; the step stays failed. */
  onRetry?: (stepId: string) => Promise<DeployResult>;
  /** Step ids open at the start. Default: failed and running steps. */
  defaultExpanded?: readonly string[];
  /** Keep at most this many log lines per step. Default 500. */
  maxLogLines?: number;
  /** Height of each step's log area. Default 14rem. */
  logHeight?: string;
  labels?: Partial<DeployViewLabels>;
}

/**
 * A deploy run: ordered steps with status, live durations, expandable ANSI logs that follow the output while
 * a step runs, and retry for failed steps. Presentational; your callbacks talk to the pipeline.
 */
export function DeployView({
  title,
  meta,
  steps,
  status: statusProp,
  onCancel,
  onRetry,
  defaultExpanded,
  maxLogLines = 500,
  logHeight = "14rem",
  labels,
  className,
  ...props
}: DeployViewProps) {
  const t = useLabels(labels);
  const status = statusProp ?? deriveStatus(steps);
  const now = useNow(steps.some((s) => s.status === "running"));
  const done = completedCount(steps);
  const total = totalDuration(steps, now);
  const [toggled, setToggled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries((defaultExpanded ?? steps.filter((s) => s.status === "failed" || s.status === "running").map((s) => s.id)).map((id) => [id, true])),
  );
  const [cancelling, setCancelling] = useState(false);
  const isOpen = (s: DeployStep) => toggled[s.id] ?? false;

  return (
    <section
      data-slot="deploy-view"
      data-status={status}
      aria-label={typeof title === "string" ? title : t.title}
      className={cn("flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card text-start", className)}
      {...props}
    >
      <header className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-h3 text-foreground">{title ?? t.title}</h3>
              <Badge variant={BADGE[status]} data-slot="deploy-status">
                <StatusIcon status={status} className="size-3" />
                {t.status[status]}
              </Badge>
            </div>
            {meta ? <div className="text-body-sm text-muted-foreground">{meta}</div> : null}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-body-sm text-muted-foreground">
              {t.duration} <bdi dir="ltr" className="font-mono text-foreground tabular-nums">{formatDuration(total, t.units)}</bdi>
            </span>
            {onCancel && status === "running" ? (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                loading={cancelling}
                onClick={async () => {
                  setCancelling(true);
                  try {
                    await onCancel();
                  } finally {
                    setCancelling(false);
                  }
                }}
              >
                <Square aria-hidden />
                {t.cancel}
              </Button>
            ) : null}
          </div>
        </div>
        <Progress
          value={steps.length ? (done / steps.length) * 100 : 0}
          tone={PROGRESS_TONE[status]}
          size="sm"
          aria-label={t.progress(done, steps.length)}
          valueText={t.progress(done, steps.length)}
          label={t.progress(done, steps.length)}
          showValue={false}
        />
      </header>

      <ol aria-label={t.steps} className="m-0 flex list-none flex-col p-0">
        {steps.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            now={now}
            open={isOpen(step)}
            onOpenChange={(open) => setToggled((s) => ({ ...s, [step.id]: open }))}
            onRetry={onRetry}
            maxLogLines={maxLogLines}
            logHeight={logHeight}
            t={t}
          />
        ))}
      </ol>
    </section>
  );
}

function StepRow({
  step,
  index,
  now,
  open,
  onOpenChange,
  onRetry,
  maxLogLines,
  logHeight,
  t,
}: {
  step: DeployStep;
  index: number;
  now: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: DeployViewProps["onRetry"];
  maxLogLines: number;
  logHeight: string;
  t: DeployViewLabels;
}) {
  const duration = stepDuration(step, now);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | undefined>();
  const logs = useMemo(() => (step.logs ? tailLines(step.logs, maxLogLines) : null), [step.logs, maxLogLines]);
  const running = step.status === "running";
  const { ref, following, setFollowing, onScroll } = useFollowScroll<HTMLPreElement>(logs?.text.length ?? 0, true);

  const retry = async () => {
    if (!onRetry) return;
    setRetrying(true);
    setRetryError(undefined);
    try {
      const result = await onRetry(step.id);
      if (result && "error" in result && result.error) setRetryError(result.error);
    } catch {
      setRetryError(t.retryFailed);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <li data-slot="deploy-step" data-status={step.status} className="border-b border-border last:border-b-0">
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex items-center gap-1 pe-2">
          <CollapsibleTrigger
            aria-label={t.stepLabel(index + 1, step.name, t.status[step.status])}
            className={cn(
              "group/step flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus",
            )}
          >
            <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground transition-transform duration-150 group-data-[panel-open]/step:rotate-90 rtl:-scale-x-100 rtl:group-data-[panel-open]/step:-rotate-90" />
            <StatusIcon status={step.status} className="shrink-0" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label text-foreground">{step.name}</span>
              {step.command ? (
                <bdi dir="ltr" className="truncate text-start font-mono text-caption text-muted-foreground">
                  {step.command}
                </bdi>
              ) : null}
            </span>
            <span className="hidden shrink-0 text-caption text-muted-foreground sm:inline">{t.status[step.status]}</span>
            <bdi dir="ltr" className="w-16 shrink-0 text-end font-mono text-caption text-muted-foreground tabular-nums">
              {duration === undefined ? "" : formatDuration(duration, t.units)}
            </bdi>
          </CollapsibleTrigger>
          {onRetry && (step.status === "failed" || step.status === "cancelled") ? (
            <Button type="button" size="sm" variant="secondary" loading={retrying} onClick={retry}>
              <RotateCcw aria-hidden className="rtl:-scale-x-100" />
              {t.retry}
            </Button>
          ) : null}
        </div>
        <CollapsiblePanel>
          <div className="flex flex-col gap-2 px-4 pb-4 ps-11">
            {step.error || retryError ? (
              <Alert tone="danger" role="alert">
                {retryError ?? step.error}
              </Alert>
            ) : null}
            <div className="relative overflow-hidden rounded-control border border-border bg-nq-surface-soft" dir="ltr">
              {logs?.hidden ? <p className="border-b border-border px-3 py-1 text-caption text-muted-foreground">{t.trimmed(logs.hidden)}</p> : null}
              <pre
                ref={ref}
                onScroll={onScroll}
                role="log"
                aria-label={t.logs(step.name)}
                aria-live="off"
                tabIndex={0}
                style={{ maxHeight: logHeight }}
                className="m-0 overflow-auto p-3 font-mono text-code text-nq-fg-body outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus"
              >
                {logs ? (
                  <code className="block w-max min-w-full">
                    <AnsiText text={logs.text} />
                  </code>
                ) : (
                  <span className="text-muted-foreground">{running ? t.waitingLogs : t.noLogs}</span>
                )}
              </pre>
              {running && !following ? (
                <Button type="button" size="sm" variant="secondary" className="absolute end-2 bottom-2" onClick={() => setFollowing(true)}>
                  {t.jump}
                </Button>
              ) : null}
            </div>
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </li>
  );
}
