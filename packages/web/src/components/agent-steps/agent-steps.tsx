"use client";

import { Ban, Check, ChevronDown, CircleDashed, FilePlus2, FileX2, Pencil, ShieldAlert, ShieldQuestion, TriangleAlert } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge, type BadgeProps } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { CodeBlock } from "../code-block";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "../collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldError, FieldLabel, Textarea } from "../field";
import { Num } from "../numeric";
import { Spinner } from "../spinner";
import { diffLines, diffStats, foldDiff } from "../version-history";
import {
  type AgentChange,
  type AgentRisk,
  type AgentStep,
  type AgentStepStatus,
  agentRunState,
  agentStepCounts,
  agentChangeKind,
  currentStep,
  agentHighestRisk,
  resultLanguage,
  selectedChangeIds,
  stringifyArgs,
  toggleId,
  totalDurationMs,
} from "./agent-steps-logic";

export {
  AGENT_MASK,
  agentRunState,
  agentStepCounts,
  agentChangeKind,
  currentStep,
  agentHighestRisk,
  redactDeep,
  resultLanguage,
  selectedChangeIds,
  stringifyArgs,
  toggleId,
  totalDurationMs,
  type AgentChange,
  type AgentChangeKind,
  type AgentRisk,
  type AgentRunState,
  type AgentStep,
  type AgentStepCounts,
  type AgentStepStatus,
} from "./agent-steps-logic";

const STRINGS = {
  en: {
    steps: "Agent steps",
    running: "Working",
    stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
    awaiting: "Waiting for your approval",
    failed: "A step failed",
    done: "All steps done",
    idle: "No steps yet",
    pending: "Queued",
    stepRunning: "Running",
    stepAwaiting: "Needs approval",
    stepDone: "Done",
    stepError: "Failed",
    stepSkipped: "Skipped",
    arguments: "Arguments",
    result: "Result",
    error: "Error",
    noDetails: "No details for this step",
    retry: "Retry",
    showDetails: "Show details",
    hideDetails: "Hide details",
    // confirm
    confirmTitle: "Review before applying",
    confirmBody: "The agent wants to make these changes. Nothing changes until you apply them.",
    apply: (n: number) => `Apply ${n}`,
    applyAll: "Apply all",
    reject: "Reject",
    rejectTitle: "Reject these changes",
    rejectBody: "Tell the agent why, so it can try again. The reason is optional.",
    reasonLabel: "Reason",
    reasonPlaceholder: "For example, keep the old retry limit",
    reasonRequired: "Give a reason so the agent can adjust",
    cancel: "Cancel",
    confirmReject: "Reject changes",
    selectChange: (title: string) => `Apply ${title}`,
    selected: (n: number, total: number) => `${n} of ${total} selected`,
    nothingSelected: "Select at least one change to apply",
    viewDiff: "Show changes",
    hideDiff: "Hide changes",
    created: "New",
    edited: "Edit",
    deleted: "Delete",
    added: (n: number) => `${n} added`,
    removed: (n: number) => `${n} removed`,
    lineAdded: "Added line",
    lineRemoved: "Removed line",
    unchanged: (n: number) => `${n} unchanged lines`,
    diffLabel: "Changes",
    noChange: "No differences.",
    riskLow: "Low risk",
    riskMedium: "Medium risk",
    riskHigh: "High risk",
    reviewedRisk: "I reviewed these changes and understand they are hard to undo",
    riskRequired: "Confirm you reviewed the high risk changes",
    applying: "Applying",
    applied: "Changes applied",
    appliedBody: (n: number) => (n === 1 ? "1 change was applied." : `${n} changes were applied.`),
    rejected: "Changes rejected",
    rejectedBody: "The agent was told and nothing changed.",
    failedApply: "Could not apply the changes. Nothing was changed.",
    undo: "Review again",
  },
  ar: {
    steps: "خطوات الوكيل",
    running: "جارٍ العمل",
    stepOf: (n: number, total: number) => `الخطوة ${n} من ${total}`,
    awaiting: "بانتظار موافقتك",
    failed: "فشلت إحدى الخطوات",
    done: "اكتملت كل الخطوات",
    idle: "لا توجد خطوات بعد",
    pending: "في الانتظار",
    stepRunning: "قيد التنفيذ",
    stepAwaiting: "تحتاج موافقة",
    stepDone: "تمّت",
    stepError: "فشلت",
    stepSkipped: "تم التخطي",
    arguments: "المعاملات",
    result: "النتيجة",
    error: "الخطأ",
    noDetails: "لا توجد تفاصيل لهذه الخطوة",
    retry: "إعادة المحاولة",
    showDetails: "عرض التفاصيل",
    hideDetails: "إخفاء التفاصيل",
    confirmTitle: "راجع قبل التطبيق",
    confirmBody: "يريد الوكيل إجراء هذه التغييرات. لن يتغير شيء حتى تطبّقها.",
    apply: (n: number) => `تطبيق ${n}`,
    applyAll: "تطبيق الكل",
    reject: "رفض",
    rejectTitle: "رفض هذه التغييرات",
    rejectBody: "أخبر الوكيل بالسبب ليحاول من جديد. السبب اختياري.",
    reasonLabel: "السبب",
    reasonPlaceholder: "مثلًا، أبقِ حد إعادة المحاولة القديم",
    reasonRequired: "اذكر سببًا ليتمكن الوكيل من التعديل",
    cancel: "إلغاء",
    confirmReject: "رفض التغييرات",
    selectChange: (title: string) => `تطبيق ${title}`,
    selected: (n: number, total: number) => `تم تحديد ${n} من ${total}`,
    nothingSelected: "حدّد تغييرًا واحدًا على الأقل للتطبيق",
    viewDiff: "عرض التغييرات",
    hideDiff: "إخفاء التغييرات",
    created: "جديد",
    edited: "تعديل",
    deleted: "حذف",
    added: (n: number) => `${n} مضاف`,
    removed: (n: number) => `${n} محذوف`,
    lineAdded: "سطر مضاف",
    lineRemoved: "سطر محذوف",
    unchanged: (n: number) => `${n} أسطر دون تغيير`,
    diffLabel: "التغييرات",
    noChange: "لا اختلافات.",
    riskLow: "خطورة منخفضة",
    riskMedium: "خطورة متوسطة",
    riskHigh: "خطورة عالية",
    reviewedRisk: "راجعت هذه التغييرات وأدرك أن التراجع عنها صعب",
    riskRequired: "أكّد أنك راجعت التغييرات عالية الخطورة",
    applying: "جارٍ التطبيق",
    applied: "تم تطبيق التغييرات",
    appliedBody: (n: number) => (n === 1 ? "تم تطبيق تغيير واحد." : n === 2 ? "تم تطبيق تغييرين." : `تم تطبيق ${n} تغييرات.`),
    rejected: "تم رفض التغييرات",
    rejectedBody: "أُبلغ الوكيل ولم يتغير شيء.",
    failedApply: "تعذّر تطبيق التغييرات. لم يتغير شيء.",
    undo: "مراجعة مرة أخرى",
  },
};

export type AgentStepsLabels = (typeof STRINGS)["en"];

function useLabels(labels?: Partial<AgentStepsLabels>): AgentStepsLabels {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { ...STRINGS[ar ? "ar" : "en"], ...labels };
}

type Result = void | { error?: string };

/* ------------------------------------------------------------------ steps */

const STEP_BADGE: Record<AgentStepStatus, BadgeProps["variant"]> = {
  pending: "outline",
  running: "info",
  awaiting: "warning",
  done: "success",
  error: "danger",
  skipped: "neutral",
};

function StepIcon({ status }: { status: AgentStepStatus }) {
  const base = "size-4";
  switch (status) {
    case "running":
      return <Spinner className={base} />;
    case "awaiting":
      return <ShieldQuestion aria-hidden className={cn(base, "text-nq-warning-text")} />;
    case "done":
      return <Check aria-hidden className={cn(base, "text-nq-success-text")} />;
    case "error":
      return <TriangleAlert aria-hidden className={cn(base, "text-nq-danger-text")} />;
    case "skipped":
      return <Ban aria-hidden className={cn(base, "text-muted-foreground")} />;
    default:
      return <CircleDashed aria-hidden className={cn(base, "text-muted-foreground")} />;
  }
}

export interface AgentStepsProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  steps: readonly AgentStep[];
  /** Heading above the list. Default "Agent steps". */
  title?: string;
  /** Argument keys whose values are masked in the details, at any depth: `["password", "token"]`. */
  redactKeys?: readonly string[];
  /** Rendered under a step that is `awaiting`, open by default. Pass an `AgentConfirm` here. */
  renderConfirm?: (step: AgentStep) => ReactNode;
  /** Runs a failed step again. Omit to hide the button. */
  onRetry?: (stepId: string) => void;
  /** Step ids whose details start open. */
  defaultOpenIds?: readonly string[];
  labels?: Partial<AgentStepsLabels>;
}

/**
 * The tool calls an agent made, planned or is waiting to make, in order. A summary line says where the run stands
 * (working, waiting for you, failed, done). Each step opens to its arguments and result. A step that needs a person
 * shows your `renderConfirm` content, so the run and the decision sit together.
 */
export function AgentSteps({ steps, title, redactKeys = [], renderConfirm, onRetry, defaultOpenIds = [], labels, className, ...props }: AgentStepsProps) {
  const t = useLabels(labels);
  const uid = useId();
  const state = agentRunState(steps);
  const counts = agentStepCounts(steps);
  const current = currentStep(steps);
  const currentIndex = current ? steps.indexOf(current) + 1 : 0;
  const total = totalDurationMs(steps);
  const summary =
    state === "awaiting" ? t.awaiting : state === "error" ? t.failed : state === "done" ? t.done : state === "running" ? `${t.running}. ${t.stepOf(currentIndex, counts.total)}` : t.idle;
  return (
    <section data-slot="agent-steps" data-state={state} aria-labelledby={`${uid}-h`} className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${uid}-h`} className="text-body-sm font-semibold text-foreground">
          {title ?? t.steps}
        </h3>
        <p role="status" className="flex items-center gap-2 text-caption text-muted-foreground">
          {state === "running" ? <Spinner className="size-3.5" /> : null}
          <span className={cn(state === "awaiting" && "text-nq-warning-text", state === "error" && "text-nq-danger-text", state === "done" && "text-nq-success-text")}>{summary}</span>
          {state === "done" && total > 0 ? <Num value={total / 1000} format={{ style: "unit", unit: "second", unitDisplay: "narrow", maximumFractionDigits: 1 }} /> : null}
        </p>
      </header>
      <ol className="flex flex-col">
        {steps.map((s, i) => (
          <StepRow key={s.id} step={s} last={i === steps.length - 1} redactKeys={redactKeys} confirm={s.status === "awaiting" ? renderConfirm?.(s) : undefined} onRetry={onRetry} defaultOpen={defaultOpenIds.includes(s.id) || s.status === "awaiting"} t={t} />
        ))}
      </ol>
    </section>
  );
}

function StepRow({
  step,
  last,
  redactKeys,
  confirm,
  onRetry,
  defaultOpen,
  t,
}: {
  step: AgentStep;
  last: boolean;
  redactKeys: readonly string[];
  confirm: ReactNode;
  onRetry?: (id: string) => void;
  defaultOpen: boolean;
  t: AgentStepsLabels;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const args = useMemo(() => stringifyArgs(step.args, redactKeys), [step.args, redactKeys]);
  const hasDetails = args !== "" || Boolean(step.result) || Boolean(step.error);
  const statusText: Record<AgentStepStatus, string> = {
    pending: t.pending,
    running: t.stepRunning,
    awaiting: t.stepAwaiting,
    done: t.stepDone,
    error: t.stepError,
    skipped: t.stepSkipped,
  };
  return (
    <li data-slot="agent-step" data-status={step.status} className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border bg-card">
          <StepIcon status={step.status} />
        </span>
        {!last ? <span aria-hidden className="my-1 w-px flex-1 bg-border" /> : null}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", !last && "pb-4")}>
        <Collapsible open={open} onOpenChange={setOpen}>
          <div className="flex min-h-6 flex-wrap items-center gap-x-2 gap-y-1">
            <span dir="auto" className={cn("text-body-sm text-foreground", step.status === "pending" && "text-muted-foreground")}>
              {step.label}
            </span>
            {step.tool ? (
              <code dir="ltr" className="rounded-sm bg-secondary px-1 font-mono text-[0.85em] text-muted-foreground">
                {step.tool}
              </code>
            ) : null}
            <Badge variant={STEP_BADGE[step.status]}>{statusText[step.status]}</Badge>
            {step.durationMs !== undefined && step.status !== "pending" ? (
              <span className="text-caption text-muted-foreground">
                <Num value={step.durationMs < 1000 ? step.durationMs : step.durationMs / 1000} format={{ style: "unit", unit: step.durationMs < 1000 ? "millisecond" : "second", unitDisplay: "narrow", maximumFractionDigits: 1 }} />
              </span>
            ) : null}
            <span className="flex-1" />
            {step.status === "error" && onRetry ? (
              <Button size="sm" variant="secondary" onClick={() => onRetry(step.id)}>
                {t.retry}
              </Button>
            ) : null}
            {hasDetails ? (
              <CollapsibleTrigger
                aria-label={open ? t.hideDetails : t.showDetails}
                className="grid size-6 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
              >
                <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-150 ease-nq", open && "rotate-180")} />
              </CollapsibleTrigger>
            ) : null}
          </div>
          {hasDetails ? (
            <CollapsiblePanel>
              <div className="mt-2 flex flex-col gap-2">
                {step.error ? (
                  <Alert tone="danger" title={t.error}>
                    <span dir="auto">{step.error}</span>
                  </Alert>
                ) : null}
                {args ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-caption text-muted-foreground">{t.arguments}</span>
                    <CodeBlock code={args} language="json" label={t.arguments} preClassName="max-h-48" />
                  </div>
                ) : null}
                {step.result ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-caption text-muted-foreground">{t.result}</span>
                    <CodeBlock code={step.result} language={resultLanguage(step)} label={t.result} preClassName="max-h-48" />
                  </div>
                ) : null}
              </div>
            </CollapsiblePanel>
          ) : null}
        </Collapsible>
        {confirm}
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ diff */

export interface AgentDiffProps extends Omit<ComponentProps<"div">, "children"> {
  before?: string;
  after?: string;
  /** Unchanged lines kept around each change. Default 2. */
  context?: number;
  labels?: Partial<AgentStepsLabels>;
}

/** Line diff of two texts: numbers, plus and minus marks, runs of unchanged lines folded. Always left to right. */
export function AgentDiff({ before = "", after = "", context = 2, labels, className, ...props }: AgentDiffProps) {
  const t = useLabels(labels);
  const lines = useMemo(() => diffLines(before, after), [before, after]);
  const items = useMemo(() => foldDiff(lines, context), [lines, context]);
  if (!diffStats(lines).changed) {
    return (
      <p data-slot="agent-diff" className={cn("text-caption text-muted-foreground", className)}>
        {t.noChange}
      </p>
    );
  }
  return (
    <div dir="ltr" role="table" aria-label={t.diffLabel} data-slot="agent-diff" className={cn("overflow-x-auto rounded-control border border-border font-mono text-code", className)} {...props}>
      {items.map((it, i) =>
        it.type === "gap" ? (
          <div role="row" key={`g${i}`} dir="auto" className="bg-nq-surface-soft px-3 py-1 text-center text-caption text-muted-foreground">
            {t.unchanged(it.count)}
          </div>
        ) : (
          <div key={`${it.oldLine ?? "-"}:${it.newLine ?? "-"}:${i}`} role="row" data-diff={it.type} className={cn("flex min-w-max", it.type === "add" && "bg-nq-success-soft", it.type === "del" && "bg-nq-danger-soft")}>
            <span role="cell" aria-hidden className="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground">
              {it.oldLine ?? ""}
            </span>
            <span role="cell" aria-hidden className="w-9 shrink-0 select-none px-2 text-end tabular-nums text-muted-foreground">
              {it.newLine ?? ""}
            </span>
            <span role="cell" aria-label={it.type === "add" ? t.lineAdded : it.type === "del" ? t.lineRemoved : undefined} className="w-5 shrink-0 select-none text-center font-semibold">
              {it.type === "add" ? "+" : it.type === "del" ? "−" : ""}
            </span>
            <span role="cell" className="whitespace-pre pe-3 text-foreground">
              {it.text || " "}
            </span>
          </div>
        ),
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ confirm */

const RISK_VARIANT: Record<AgentRisk, BadgeProps["variant"]> = { low: "neutral", medium: "warning", high: "danger" };
const KIND_ICON = { create: FilePlus2, edit: Pencil, delete: FileX2 } as const;

export interface AgentConfirmProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  changes: readonly AgentChange[];
  /** Apply the ticked changes. Return `{ error }` or reject to show a failure and keep the choice open. */
  onApply: (ids: string[]) => Promise<Result>;
  /** Reject everything, with the reason if one was given. Return `{ error }` or reject to show a failure. */
  onReject: (reason: string | undefined) => Promise<Result>;
  title?: string;
  /** One line above the changes, in the agent's words: what it wants to do and why. */
  summary?: ReactNode;
  /** Make the reason mandatory when rejecting. Default false. */
  requireReason?: boolean;
  /** Ids of changes that start unticked. Default: all ticked. */
  defaultUnchecked?: readonly string[];
  /** Ids of changes whose diff starts open. Default: the first one. */
  defaultOpenIds?: readonly string[];
  /** Fires after a successful apply or reject. */
  onDecided?: (decision: "applied" | "rejected") => void;
  labels?: Partial<AgentStepsLabels>;
}

type Decision = "applied" | "rejected" | null;

/**
 * Human in the loop before the agent acts: each proposed change with its diff, a tick to leave one out, its risk, and
 * Apply or Reject. Rejecting can ask for a reason. High risk changes need an extra tick before Apply. It never applies
 * anything itself: your `onApply` does, and until it resolves the buttons show a busy state.
 */
export function AgentConfirm({ changes, onApply, onReject, title, summary, requireReason = false, defaultUnchecked = [], defaultOpenIds, onDecided, labels, className, ...props }: AgentConfirmProps) {
  const t = useLabels(labels);
  const uid = useId();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(changes.filter((c) => !defaultUnchecked.includes(c.id)).map((c) => c.id)));
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState<"apply" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision>(null);
  const [appliedCount, setAppliedCount] = useState(0);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);

  const ids = selectedChangeIds(changes, selected);
  const chosen = changes.filter((c) => selected.has(c.id));
  const risk = agentHighestRisk(chosen);
  const needsReview = risk === "high";
  const canApply = ids.length > 0 && (!needsReview || reviewed) && busy === null;
  const riskText = { low: t.riskLow, medium: t.riskMedium, high: t.riskHigh };

  const run = async (kind: "apply" | "reject", fn: () => Promise<Result>) => {
    setBusy(kind);
    setError(null);
    try {
      const r = await fn();
      if (r && r.error) {
        setError(r.error);
        setBusy(null);
        return false;
      }
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failedApply);
      setBusy(null);
      return false;
    }
    setBusy(null);
    return true;
  };

  const apply = async () => {
    if (!canApply) return;
    const count = ids.length;
    if (await run("apply", () => onApply(ids))) {
      setAppliedCount(count);
      setDecision("applied");
      onDecided?.("applied");
    }
  };

  const reject = async () => {
    setTouched(true);
    if (requireReason && reason.trim() === "") return;
    if (await run("reject", () => onReject(reason.trim() === "" ? undefined : reason.trim()))) {
      setRejecting(false);
      setDecision("rejected");
      onDecided?.("rejected");
    }
  };

  if (decision) {
    return (
      <section data-slot="agent-confirm" data-decision={decision} className={cn("min-w-0", className)} {...props}>
        <Alert tone={decision === "applied" ? "success" : "info"} title={decision === "applied" ? t.applied : t.rejected} role="status">
          {decision === "applied" ? t.appliedBody(appliedCount) : t.rejectedBody}
        </Alert>
      </section>
    );
  }

  return (
    <section data-slot="agent-confirm" aria-labelledby={`${uid}-h`} aria-busy={busy !== null} className={cn("flex min-w-0 flex-col gap-3 rounded-floating border border-nq-warning/40 bg-card p-3 sm:p-4", className)} {...props}>
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <ShieldAlert aria-hidden className="size-4 shrink-0 text-nq-warning-text" />
          <h4 id={`${uid}-h`} className="text-body-sm font-semibold text-foreground">
            {title ?? t.confirmTitle}
          </h4>
          <Badge variant={RISK_VARIANT[agentHighestRisk(changes)]}>{riskText[agentHighestRisk(changes)]}</Badge>
        </div>
        <p dir="auto" className="text-body-sm text-muted-foreground">
          {summary ?? t.confirmBody}
        </p>
      </header>
      <ul className="flex flex-col gap-2">
        {changes.map((c, i) => (
          <ChangeRow
            key={c.id}
            change={c}
            checked={selected.has(c.id)}
            onChecked={() => {
              setSelected((s) => toggleId(s, c.id));
              setReviewed(false);
            }}
            defaultOpen={defaultOpenIds ? defaultOpenIds.includes(c.id) : i === 0}
            disabled={busy !== null}
            selectable={changes.length > 1}
            riskText={riskText[c.risk ?? "low"]}
            t={t}
          />
        ))}
      </ul>
      {needsReview ? (
        <label className="flex items-start gap-2 text-body-sm text-foreground">
          <Checkbox checked={reviewed} onCheckedChange={(v) => setReviewed(v === true)} disabled={busy !== null} className="mt-0.5" />
          <span dir="auto">{t.reviewedRisk}</span>
        </label>
      ) : null}
      {error ? <Alert tone="danger">{error}</Alert> : null}
      <footer className="flex flex-wrap items-center justify-between gap-2">
        <span role="status" className="text-caption text-muted-foreground">
          {ids.length === 0 ? t.nothingSelected : changes.length > 1 ? t.selected(ids.length, changes.length) : ""}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" onClick={() => { setRejecting(true); setTouched(false); setError(null); }} disabled={busy !== null}>
            {t.reject}
          </Button>
          <Button variant="primary" onClick={() => void apply()} loading={busy === "apply"} disabled={!canApply} aria-describedby={needsReview && !reviewed ? `${uid}-risk` : undefined}>
            {changes.length > 1 && ids.length !== changes.length ? t.apply(ids.length) : t.applyAll}
          </Button>
        </div>
        {needsReview && !reviewed ? (
          <span id={`${uid}-risk`} className="sr-only">
            {t.riskRequired}
          </span>
        ) : null}
      </footer>
      <Dialog open={rejecting} onOpenChange={(o) => !o && busy === null && setRejecting(false)}>
        <DialogContent data-slot="agent-confirm-reject">
          <DialogHeader>
            <DialogTitle>{t.rejectTitle}</DialogTitle>
            <DialogDescription>{t.rejectBody}</DialogDescription>
          </DialogHeader>
          <Field invalid={requireReason && touched && reason.trim() === ""}>
            <FieldLabel>{t.reasonLabel}</FieldLabel>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t.reasonPlaceholder} rows={3} />
            {requireReason && touched && reason.trim() === "" ? <FieldError match>{t.reasonRequired}</FieldError> : null}
          </Field>
          {error && rejecting ? <Alert tone="danger">{error}</Alert> : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejecting(false)} disabled={busy !== null}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy === "reject"} onClick={() => void reject()}>
              {t.confirmReject}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function ChangeRow({
  change,
  checked,
  onChecked,
  defaultOpen,
  disabled,
  selectable,
  riskText,
  t,
}: {
  change: AgentChange;
  checked: boolean;
  onChecked: () => void;
  defaultOpen: boolean;
  disabled: boolean;
  selectable: boolean;
  riskText: string;
  t: AgentStepsLabels;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const kind = agentChangeKind(change);
  const KindIcon = KIND_ICON[kind];
  const stats = useMemo(() => diffStats(diffLines(change.before ?? "", change.after ?? "")), [change.before, change.after]);
  const kindText = { create: t.created, edit: t.edited, delete: t.deleted }[kind];
  return (
    <li data-slot="agent-change" data-kind={kind} data-checked={checked ? "" : undefined} className={cn("rounded-control border border-border bg-background transition-opacity duration-150 ease-nq", !checked && selectable && "opacity-60")}>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div className="flex items-start gap-3 p-3">
          {selectable ? <Checkbox checked={checked} onCheckedChange={onChecked} disabled={disabled} aria-label={t.selectChange(change.title)} className="mt-1" /> : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <KindIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              <span dir="auto" className="text-body-sm font-medium text-foreground">
                {change.title}
              </span>
              <Badge variant="outline">{kindText}</Badge>
              {change.risk && change.risk !== "low" ? <Badge variant={RISK_VARIANT[change.risk]}>{riskText}</Badge> : null}
            </div>
            {change.target ? (
              <bdi dir="ltr" className="truncate font-mono text-caption text-muted-foreground">
                {change.target}
              </bdi>
            ) : null}
            {change.description ? (
              <p dir="auto" className="text-caption text-muted-foreground">
                {change.description}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="flex flex-col items-end text-caption tabular-nums sm:flex-row sm:gap-2">
              <span className="text-nq-success-text">
                <span aria-hidden>+</span>
                <Num value={stats.added} />
                <span className="sr-only"> {t.added(stats.added)}</span>
              </span>
              <span className="text-nq-danger-text">
                <span aria-hidden>−</span>
                <Num value={stats.removed} />
                <span className="sr-only"> {t.removed(stats.removed)}</span>
              </span>
            </span>
            <CollapsibleTrigger
              aria-label={open ? t.hideDiff : t.viewDiff}
              className="grid size-7 place-items-center rounded-control text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
            >
              <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-150 ease-nq", open && "rotate-180")} />
            </CollapsibleTrigger>
          </div>
        </div>
        <CollapsiblePanel>
          <div className="border-t border-border p-3">
            <AgentDiff before={change.before} after={change.after} labels={t} />
          </div>
        </CollapsiblePanel>
      </Collapsible>
    </li>
  );
}
