"use client";

import { ArrowLeft, ChevronRight, CircleAlert, ListChecks, RotateCcw, Search, Square } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "../dialog";
import { Input } from "../field";
import { DateTime } from "../numeric";
import { EmptyState, Skeleton } from "../states";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { Toggle, ToggleGroup } from "../toggle-group";
import { useCanvasLabels } from "../workflow-canvas/canvas-labels";
import { StatusGlyph } from "../workflow-canvas/status-glyph";
import {
  countRuns,
  failingStep,
  filterRuns,
  formatRunDuration,
  orderSpans,
  rawRun,
  type RunFilter,
  RUN_FILTERS,
  type RunRecord,
  type RunScreenshot,
  type RunSpan,
  type RunStep,
  runLength,
  stepBars,
} from "./run-model";

const STRINGS = {
  en: {
    runs: "Runs",
    search: "Search runs",
    filters: "Filter by status",
    filterNames: { all: "All", failed: "Failed", success: "Succeeded", running: "Running" } satisfies Record<RunFilter, string>,
    none: "No runs match",
    noneBody: "Change the filter or the search.",
    pick: "Choose a run",
    pickBody: "Pick a run on the left to see its steps, timing and output.",
    back: "Back to runs",
    unnamed: "Run",
    started: "Started",
    duration: "Duration",
    trigger: "Trigger",
    retry: "Run again",
    cancel: "Cancel run",
    steps: "Steps",
    trace: "Trace",
    raw: "Raw",
    stepsNone: "This run recorded no steps.",
    failedHere: "Failed here",
    skippedNote: "Skipped",
    failure: (step: string) => `Failed at ${step}`,
    failureRun: "This run failed",
    showStep: "Show the step",
    attempt: (n: string) => `Attempt ${n}`,
    input: "Input",
    output: "Output",
    error: "Error",
    logs: "Logs",
    shots: "Screenshots",
    openShot: (name: string) => `Enlarge: ${name}`,
    expand: (name: string) => `Show details of ${name}`,
    collapse: (name: string) => `Hide details of ${name}`,
    noDetail: "No input, output or logs were recorded for this step.",
    waterfall: "Spans",
    spanDetail: "Span details",
    spanName: "Name",
    spanService: "Service",
    spanStart: "Starts at",
    spanDuration: "Duration",
    spanAttrs: "Attributes",
    spanNoAttrs: "No attributes.",
    spanFailed: "Failed",
    pickSpan: "Choose a span to see its attributes.",
    traceNone: "No trace was recorded for this run.",
    rawLabel: "Raw run data",
    stepCount: (n: string) => `${n} steps`,
  },
  ar: {
    runs: "التشغيلات",
    search: "ابحث في التشغيلات",
    filters: "التصفية بالحالة",
    filterNames: { all: "الكل", failed: "الفاشلة", success: "الناجحة", running: "الجارية" } satisfies Record<RunFilter, string>,
    none: "لا تشغيلات مطابقة",
    noneBody: "غيّر التصفية أو البحث.",
    pick: "اختر تشغيلًا",
    pickBody: "اختر تشغيلًا من القائمة لترى خطواته وتوقيته ومخرجاته.",
    back: "العودة إلى التشغيلات",
    unnamed: "تشغيل",
    started: "بدأ",
    duration: "المدة",
    trigger: "المشغّل",
    retry: "أعد التشغيل",
    cancel: "إلغاء التشغيل",
    steps: "الخطوات",
    trace: "التتبع",
    raw: "الخام",
    stepsNone: "لم يسجّل هذا التشغيل أي خطوات.",
    failedHere: "فشل هنا",
    skippedNote: "تم تخطيها",
    failure: (step: string) => `فشل عند ${step}`,
    failureRun: "فشل هذا التشغيل",
    showStep: "اعرض الخطوة",
    attempt: (n: string) => `المحاولة ${n}`,
    input: "المُدخل",
    output: "المخرج",
    error: "الخطأ",
    logs: "السجل",
    shots: "لقطات الشاشة",
    openShot: (name: string) => `تكبير: ${name}`,
    expand: (name: string) => `عرض تفاصيل ${name}`,
    collapse: (name: string) => `إخفاء تفاصيل ${name}`,
    noDetail: "لم يُسجَّل مُدخل أو مخرج أو سجل لهذه الخطوة.",
    waterfall: "المقاطع الزمنية",
    spanDetail: "تفاصيل المقطع",
    spanName: "الاسم",
    spanService: "الخدمة",
    spanStart: "يبدأ عند",
    spanDuration: "المدة",
    spanAttrs: "الخصائص",
    spanNoAttrs: "لا خصائص.",
    spanFailed: "فشل",
    pickSpan: "اختر مقطعًا لترى خصائصه.",
    traceNone: "لم يُسجَّل تتبع لهذا التشغيل.",
    rawLabel: "بيانات التشغيل الخام",
    stepCount: (n: string) => `${n} خطوات`,
  },
};

export type RunHistoryLabels = (typeof STRINGS)["en"];

function useRunLabels(labels?: Partial<RunHistoryLabels>) {
  const ar = useOptionalNasaq()?.locale.startsWith("ar") ?? false;
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels } as RunHistoryLabels, ar };
}

const json = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v, null, 2));

/* ------------------------------------------------------------------ steps */

function Screenshots({ shots, t }: { shots: RunScreenshot[]; t: RunHistoryLabels }) {
  const [open, setOpen] = useState<RunScreenshot | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <p className="text-label text-foreground">{t.shots}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {shots.map((s) => (
          <li key={s.src}>
            <button type="button" onClick={() => setOpen(s)} aria-label={t.openShot(s.alt)} className="block w-full overflow-hidden rounded-control border border-border outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
              <img src={s.src} alt={s.alt} loading="lazy" className="aspect-video w-full object-cover" />
            </button>
            {s.caption ? <p className="mt-1 truncate text-caption text-muted-foreground">{s.caption}</p> : null}
          </li>
        ))}
      </ul>
      <Dialog open={open !== null} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{open?.alt}</DialogTitle>
            {open?.caption ? <DialogDescription>{open.caption}</DialogDescription> : <DialogDescription className="sr-only">{open?.alt}</DialogDescription>}
          </DialogHeader>
          {open ? <img src={open.src} alt={open.alt} className="max-h-[70dvh] w-full rounded-control border border-border object-contain" /> : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StepRow({ step, bar, open, onToggle, failing, total, t, ar, status }: { step: RunStep; bar: { left: number; width: number }; open: boolean; onToggle: () => void; failing: boolean; total: number; t: RunHistoryLabels; ar: boolean; status: string }) {
  const id = useId();
  const has = step.input !== undefined || step.output !== undefined || step.error || step.logs?.length || step.screenshots?.length;
  return (
    <li data-step={step.id} data-failing={failing || undefined} className={cn("scroll-mt-4", failing && "bg-nq-danger-soft/40")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-body`}
        aria-label={open ? t.collapse(step.name) : t.expand(step.name)}
        onClick={onToggle}
        className="grid w-full grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[auto_auto_minmax(0,14rem)_minmax(0,1fr)_auto]"
        style={{ paddingInlineStart: `calc(0.75rem + ${(step.depth ?? 0) * 1}rem)` }}
      >
        <ChevronRight aria-hidden className={cn("size-4 text-muted-foreground transition-transform rtl:-scale-x-100", open && "rotate-90 rtl:rotate-90")} />
        <StatusGlyph status={step.status} label={status} className="size-5" />
        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-label text-foreground">{step.name}</span>
          {failing ? <Badge variant="danger">{t.failedHere}</Badge> : null}
          {step.status === "skipped" ? <Badge variant="outline">{t.skippedNote}</Badge> : null}
          {step.attempt && step.attempt > 1 ? <Badge variant="warning">{t.attempt(String(step.attempt))}</Badge> : null}
        </span>
        <span aria-hidden className="col-span-full hidden h-2 rounded-full bg-nq-surface-soft sm:col-span-1 sm:block">
          <span
            className={cn("relative block h-full rounded-full", step.status === "error" ? "bg-nq-danger" : step.status === "skipped" ? "bg-nq-line-strong" : "bg-primary")}
            style={{ marginInlineStart: `${bar.left}%`, width: `${bar.width}%` }}
          />
        </span>
        <span className="hidden text-caption text-muted-foreground tabular-nums sm:block" dir="ltr">
          {step.durationMs !== undefined ? formatRunDuration(step.durationMs, ar) : total > 0 ? "" : ""}
        </span>
      </button>
      {open ? (
        <div id={`${id}-body`} className="flex flex-col gap-3 border-t border-border px-4 py-3" style={{ paddingInlineStart: `calc(1rem + ${(step.depth ?? 0) * 1}rem)` }}>
          {step.error ? (
            <div role="alert" className="rounded-control border border-nq-danger/40 bg-nq-danger-soft p-3 text-body-sm text-nq-danger-text">
              <p className="font-medium">{t.error}</p>
              <p dir="auto">{step.error}</p>
            </div>
          ) : null}
          {step.input !== undefined ? <CodeBlock code={json(step.input)} language="json" label={t.input} filename={t.input} preClassName="max-h-64" /> : null}
          {step.output !== undefined ? <CodeBlock code={json(step.output)} language="json" label={t.output} filename={t.output} preClassName="max-h-64" /> : null}
          {step.logs?.length ? <CodeBlock code={step.logs.join("\n")} language="text" label={t.logs} filename={t.logs} preClassName="max-h-48" /> : null}
          {step.screenshots?.length ? <Screenshots shots={step.screenshots} t={t} /> : null}
          {!has ? <p className="text-body-sm text-muted-foreground">{t.noDetail}</p> : null}
        </div>
      ) : null}
    </li>
  );
}

/* ------------------------------------------------------------------ trace */

function SpanTimeline({ spans, t, ar }: { spans: RunSpan[]; t: RunHistoryLabels; ar: boolean }) {
  const ordered = useMemo(() => orderSpans(spans), [spans]);
  const [selected, setSelected] = useState<string | null>(null);
  const origin = Math.min(...spans.map((s) => s.startMs));
  const extent = Math.max(1, Math.max(...spans.map((s) => s.startMs + s.durationMs)) - origin);
  const chosen = spans.find((s) => s.id === selected);
  return (
    <div className="flex flex-col gap-3">
      <section aria-label={t.waterfall} data-slot="run-trace" className="rounded-control border border-border p-3">
        <ul className="flex flex-col gap-1">
          {ordered.map(({ span: s, depth }) => {
            const left = ((s.startMs - origin) / extent) * 100;
            const width = Math.max(0.8, (s.durationMs / extent) * 100);
            const on = s.id === selected;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => setSelected(on ? null : s.id)}
                  className={cn("grid w-full grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 rounded-control px-1 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,14rem)_1fr]", on && "bg-nq-selected")}
                >
                  <span className="min-w-0" style={{ paddingInlineStart: `${depth * 0.75}rem` }}>
                    <bdi dir="ltr" className="block truncate font-mono text-code text-foreground">
                      {s.error ? <CircleAlert aria-hidden className="me-1 inline size-3.5 text-nq-danger-text" /> : null}
                      {s.name}
                    </bdi>
                    {s.service ? (
                      <span dir="ltr" className="block truncate text-caption text-muted-foreground">
                        {s.service}
                      </span>
                    ) : null}
                  </span>
                  <span className="relative h-5 rounded-control bg-nq-surface-soft" role="img" aria-label={`${s.name}, ${formatRunDuration(s.durationMs, ar)}${s.error ? `, ${t.spanFailed}` : ""}`}>
                    <span className={cn("absolute inset-y-0.5 rounded-[3px]", s.error ? "bg-destructive" : "bg-primary")} style={{ insetInlineStart: `${left}%`, width: `${Math.min(width, 100 - left)}%` }} />
                    <span className="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" style={{ insetInlineStart: `${Math.min(left + width + 1, 78)}%` }} dir="ltr">
                      {formatRunDuration(s.durationMs, ar)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
      <section aria-label={t.spanDetail} aria-live="polite" data-slot="run-span-detail" className="rounded-control border border-border p-3">
        {chosen ? (
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-body-sm">
              <dt className="text-muted-foreground">{t.spanName}</dt>
              <dd dir="ltr" className="font-mono text-code">
                {chosen.name}
              </dd>
              {chosen.service ? (
                <>
                  <dt className="text-muted-foreground">{t.spanService}</dt>
                  <dd dir="ltr">{chosen.service}</dd>
                </>
              ) : null}
              <dt className="text-muted-foreground">{t.spanStart}</dt>
              <dd dir="ltr">{formatRunDuration(chosen.startMs, ar)}</dd>
              <dt className="text-muted-foreground">{t.spanDuration}</dt>
              <dd dir="ltr">{formatRunDuration(chosen.durationMs, ar)}</dd>
              {chosen.error ? (
                <>
                  <dt className="text-muted-foreground">{t.error}</dt>
                  <dd className="text-nq-danger-text">{t.spanFailed}</dd>
                </>
              ) : null}
            </dl>
            <div>
              <p className="mb-1 text-label text-foreground">{t.spanAttrs}</p>
              {chosen.attributes && Object.keys(chosen.attributes).length ? (
                <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 rounded-control bg-nq-surface-soft p-2 text-code" dir="ltr">
                  {Object.entries(chosen.attributes).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="font-mono text-muted-foreground">{k}</dt>
                      <dd className="min-w-0 break-words font-mono text-foreground">{String(v)}</dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-body-sm text-muted-foreground">{t.spanNoAttrs}</p>
              )}
            </div>
          </div>
        ) : (
          <p className="text-body-sm text-muted-foreground">{t.pickSpan}</p>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ detail */

export interface RunDetailProps extends Omit<ComponentProps<"div">, "children"> {
  run: RunRecord;
  /** Shows "Run again" on a finished run. */
  onRetry?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Shows "Cancel run" on a running one. */
  onCancel?: (run: RunRecord) => Promise<void | { error?: string }>;
  /** Tab shown first. Default "steps". */
  defaultTab?: "steps" | "trace" | "raw";
  /** Leading content in the header, such as a back button on small screens. */
  leading?: ReactNode;
  labels?: Partial<RunHistoryLabels>;
}

/**
 * One run: its status and timing, the step that failed and why, every step with its input, output, logs and screenshots
 * on a shared time axis, the span trace with attributes, and the raw data.
 */
export function RunDetail({ run, onRetry, onCancel, defaultTab = "steps", leading, labels, className, ...rest }: RunDetailProps) {
  const { t, ar } = useRunLabels(labels);
  const { t: c } = useCanvasLabels();
  const failing = useMemo(() => failingStep(run), [run]);
  const bars = useMemo(() => stepBars(run.steps), [run.steps]);
  const total = runLength(run);
  const [tab, setTab] = useState<string>(defaultTab);
  const [open, setOpen] = useState<Set<string>>(() => new Set(failing ? [failing.id] : []));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const raw = useMemo(() => rawRun(run), [run]);
  useEffect(() => {
    setOpen(new Set(failing ? [failing.id] : []));
    setError(null);
  }, [run.id, failing]);

  const toggle = (id: string) =>
    setOpen((cur) => {
      const next = new Set(cur);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  async function act(fn: () => Promise<void | { error?: string }>) {
    setBusy(true);
    setError(null);
    const res = await fn();
    setBusy(false);
    if (res && res.error) setError(res.error);
  }

  function showFailing() {
    if (!failing) return;
    setTab("steps");
    setOpen((cur) => new Set(cur).add(failing.id));
    requestAnimationFrame(() => document.querySelector(`[data-step="${CSS.escape(failing.id)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  return (
    <div data-slot="run-detail" className={cn("flex min-w-0 flex-col gap-4", className)} {...rest}>
      <header className="flex flex-wrap items-start gap-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusGlyph status={run.status} label={c.status[run.status]} className="size-5" />
            <h2 className="text-h4 text-foreground">{run.name ?? t.unnamed}</h2>
            <Badge variant={run.status === "error" ? "danger" : run.status === "success" ? "success" : run.status === "running" ? "info" : "neutral"}>{c.status[run.status]}</Badge>
          </div>
          <dl className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1 text-body-sm text-muted-foreground">
            <div className="flex gap-1.5">
              <dt>{t.started}</dt>
              <dd className="text-foreground">
                <DateTime value={run.startedAt} format={{ dateStyle: "medium", timeStyle: "medium" }} />
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt>{t.duration}</dt>
              <dd className="text-foreground" dir="ltr">
                {formatRunDuration(total, ar)}
              </dd>
            </div>
            {run.trigger ? (
              <div className="flex gap-1.5">
                <dt>{t.trigger}</dt>
                <dd className="text-foreground">{run.trigger}</dd>
              </div>
            ) : null}
            <div className="flex gap-1.5">
              <dt className="sr-only">ID</dt>
              <dd dir="ltr" className="font-mono text-code">
                {run.id}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex items-center gap-2">
          {onRetry && run.status !== "running" && run.status !== "waiting" ? (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => void act(() => onRetry(run))}>
              <RotateCcw aria-hidden />
              {t.retry}
            </Button>
          ) : null}
          {onCancel && (run.status === "running" || run.status === "waiting") ? (
            <Button variant="secondary" size="sm" loading={busy} onClick={() => void act(() => onCancel(run))}>
              <Square aria-hidden />
              {t.cancel}
            </Button>
          ) : null}
        </div>
      </header>

      {error ? (
        <p role="alert" className="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}

      {run.status === "error" || failing ? (
        <Alert
          tone="danger"
          title={failing ? t.failure(failing.name) : t.failureRun}
          action={
            failing ? (
              <Button variant="secondary" size="sm" onClick={showFailing}>
                {t.showStep}
              </Button>
            ) : undefined
          }
        >
          <span dir="auto">{failing?.error ?? run.error}</span>
        </Alert>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setTab(v as string)}>
        <TabsList variant="underline">
          <TabsTab value="steps">
            {t.steps} <span className="ms-1 text-caption text-muted-foreground tabular-nums">{run.steps.length}</span>
          </TabsTab>
          <TabsTab value="trace">{t.trace}</TabsTab>
          <TabsTab value="raw">{t.raw}</TabsTab>
        </TabsList>
        <TabsPanel value="steps">
          {run.steps.length === 0 ? (
            <p className="text-body-sm text-muted-foreground">{t.stepsNone}</p>
          ) : (
            <ol className="divide-y divide-border rounded-control border border-border">
              {run.steps.map((s, i) => (
                <StepRow key={s.id} step={s} bar={bars[i] as { left: number; width: number }} open={open.has(s.id)} onToggle={() => toggle(s.id)} failing={failing?.id === s.id} total={total} t={t} ar={ar} status={c.status[s.status]} />
              ))}
            </ol>
          )}
        </TabsPanel>
        <TabsPanel value="trace">{run.spans?.length ? <SpanTimeline spans={run.spans} t={t} ar={ar} /> : <p className="text-body-sm text-muted-foreground">{t.traceNone}</p>}</TabsPanel>
        <TabsPanel value="raw">
          <CodeBlock code={raw} language="json" label={t.rawLabel} filename="run.json" preClassName="max-h-[28rem]" />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

/* ------------------------------------------------------------------ list + detail */

export interface RunHistoryProps extends Omit<ComponentProps<"div">, "children" | "onSelect"> {
  runs: readonly RunRecord[];
  /** Selected run id. Controlled. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (run: RunRecord | null) => void;
  onRetry?: (run: RunRecord) => Promise<void | { error?: string }>;
  onCancel?: (run: RunRecord) => Promise<void | { error?: string }>;
  loading?: boolean;
  labels?: Partial<RunHistoryLabels>;
}

/**
 * Runs newest first with a status filter and search, and the chosen run's detail beside it (below on a phone, with a
 * back button): steps with timings, input, output, logs and screenshots, the failing step called out, the span trace
 * with attributes, and the raw payload. It has no backend: pass `runs` and handle `onRetry` and `onCancel`.
 */
export function RunHistory({ runs, selectedId: selectedProp, defaultSelectedId = null, onSelect, onRetry, onCancel, loading, labels, className, ...rest }: RunHistoryProps) {
  const { t, ar } = useRunLabels(labels);
  const { t: c } = useCanvasLabels();
  const [selectedState, setSelectedState] = useState<string | null>(defaultSelectedId);
  const selectedId = selectedProp === undefined ? selectedState : selectedProp;
  const [filter, setFilter] = useState<RunFilter>("all");
  const [query, setQuery] = useState("");
  const counts = useMemo(() => countRuns(runs), [runs]);
  const shown = useMemo(() => filterRuns(runs, filter, query), [runs, filter, query]);
  const selected = runs.find((r) => r.id === selectedId) ?? null;
  const choose = (r: RunRecord | null) => {
    if (selectedProp === undefined) setSelectedState(r?.id ?? null);
    onSelect?.(r);
  };

  return (
    <div data-slot="run-history" aria-busy={loading || undefined} className={cn("grid min-w-0 gap-4 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start", className)} {...rest}>
      <section aria-label={t.runs} className={cn("flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-3", selected && "hidden lg:flex")}>
        <div className="relative">
          <Search aria-hidden className="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
          <Input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search} aria-label={t.search} className="ps-9" />
        </div>
        <ToggleGroup value={[filter]} onValueChange={(v) => v[0] && setFilter(v[0] as RunFilter)} aria-label={t.filters} className="flex-wrap">
          {RUN_FILTERS.map((f) => (
            <Toggle key={f} value={f}>
              {t.filterNames[f]}
              <span className="ms-1 text-caption text-muted-foreground tabular-nums">{counts[f]}</span>
            </Toggle>
          ))}
        </ToggleGroup>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14" />
            ))}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState icon={ListChecks} title={t.none} description={t.noneBody} />
        ) : (
          <ol className="flex max-h-[40rem] flex-col divide-y divide-border overflow-y-auto rounded-control border border-border">
            {shown.map((r) => {
              const on = r.id === selectedId;
              return (
                <li key={r.id} data-run-row={r.id} className={cn(on && "bg-nq-selected")}>
                  <button type="button" aria-pressed={on} onClick={() => choose(on ? null : r)} className="flex w-full items-center gap-3 px-3 py-2.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus">
                    <StatusGlyph status={r.status} label={c.status[r.status]} className="size-5" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-label text-foreground">{r.name ?? t.unnamed}</span>
                      <span className="block truncate text-caption text-muted-foreground">
                        <DateTime value={r.startedAt} relative />
                        {r.trigger ? <> · {r.trigger}</> : null}
                      </span>
                    </span>
                    <span className="shrink-0 text-caption text-muted-foreground tabular-nums" dir="ltr">
                      {formatRunDuration(runLength(r), ar)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <section aria-label={selected ? (selected.name ?? t.unnamed) : t.pick} className={cn("min-w-0 rounded-card border border-border bg-card p-4", !selected && "hidden lg:block")}>
        {selected ? (
          <RunDetail
            run={selected}
            onRetry={onRetry}
            onCancel={onCancel}
            labels={labels}
            leading={
              <Button variant="ghost" size="icon-sm" className="lg:hidden" aria-label={t.back} title={t.back} onClick={() => choose(null)}>
                <ArrowLeft aria-hidden className="rtl:-scale-x-100" />
              </Button>
            }
          />
        ) : (
          <EmptyState icon={ListChecks} title={t.pick} description={t.pickBody} />
        )}
      </section>
    </div>
  );
}
