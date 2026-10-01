"use client";

import { ExternalLink, FlaskConical, Play, RotateCcw, Square } from "lucide-react";
import { type ComponentProps, type ElementType, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { CodeBlock } from "../code-block";
import { formatNumber } from "../numeric";
import { Spinner } from "../spinner";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import {
  formatTestRunDuration,
  type TestRunResult,
  type TestRunState,
  type TestRunStep,
  testRunCounts,
  settleTestRunSteps,
  testRunStepStatus,
  upsertTestRunStep,
} from "./test-run-stream-logic";

export * from "./test-run-stream-logic";

const STRINGS = {
  en: {
    title: "Test run",
    description: "Runs once without publishing anything, and shows each step as it happens.",
    run: "Run test",
    runAgain: "Run again",
    stop: "Stop",
    clear: "Clear",
    idleTitle: "No test run yet",
    idleBody: "Run a test to watch each step as it happens.",
    steps: "Steps",
    results: "Saved",
    running: "Running",
    stepsCount: "{n} steps",
    finished: "Finished in {time}",
    stopped: "Stopped after {time}",
    failed: "Failed after {time}",
    waiting: "Waiting for the first step…",
    status: { running: "Running", ok: "Passed", error: "Failed", skipped: "Skipped" },
    summary: { ok: "{n} passed", error: "{n} failed", skipped: "{n} skipped" },
    items: "{n} items",
    untitled: "Untitled",
    opensNewTab: "(opens in a new tab)",
    showRaw: "Show raw data",
    hideRaw: "Hide raw data",
    raw: "Raw data",
    noResults: "Nothing was saved.",
  },
  ar: {
    title: "تشغيل تجريبي",
    description: "يعمل مرة واحدة دون نشر أي شيء، ويعرض كل خطوة لحظة حدوثها.",
    run: "تشغيل الاختبار",
    runAgain: "تشغيل مرة أخرى",
    stop: "إيقاف",
    clear: "مسح",
    idleTitle: "لا يوجد تشغيل تجريبي بعد",
    idleBody: "شغّل اختبارًا لمتابعة كل خطوة لحظة حدوثها.",
    steps: "الخطوات",
    results: "المحفوظ",
    running: "قيد التشغيل",
    stepsCount: "{n} خطوات",
    finished: "انتهى خلال {time}",
    stopped: "توقف بعد {time}",
    failed: "فشل بعد {time}",
    waiting: "في انتظار الخطوة الأولى…",
    status: { running: "قيد التشغيل", ok: "نجحت", error: "فشلت", skipped: "تخطّي" },
    summary: { ok: "{n} نجحت", error: "{n} فشلت", skipped: "{n} تخطّي" },
    items: "{n} عناصر",
    untitled: "بلا عنوان",
    opensNewTab: "(يفتح في علامة تبويب جديدة)",
    showRaw: "عرض البيانات الخام",
    hideRaw: "إخفاء البيانات الخام",
    raw: "البيانات الخام",
    noResults: "لم يُحفظ شيء.",
  },
};

export type TestRunStreamLabels = (typeof STRINGS)["en"];

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

/** What `run` gets to report progress with. Calls after the run ended or was stopped are ignored. */
export interface TestRunHandlers {
  /** A new step, or an update to one with the same id or name. */
  step: (step: TestRunStep) => void;
  /** Something the run kept. */
  result: (result: TestRunResult) => void;
  /** The run finished. Steps still running are marked skipped. */
  done: () => void;
  /** The run failed as a whole. */
  fail: (error: string) => void;
}

export interface TestRunStreamProps extends Omit<ComponentProps<"section">, "title"> {
  /**
   * Starts a run, e.g. opening an event stream. Report through `handlers`; stop when `signal` aborts.
   * Returning a promise also works: resolving finishes the run, rejecting fails it.
   */
  run: (handlers: TestRunHandlers, signal: AbortSignal) => void | Promise<unknown>;
  /** Run options next to the button, e.g. how many items to save. */
  controls?: ReactNode;
  /** Blocks starting a run, e.g. while the settings have problems. */
  disabled?: boolean;
  /** `null` hides the heading. */
  title?: ReactNode;
  description?: ReactNode;
  headingAs?: ElementType;
  /** Called whenever the run state changes. */
  onStateChange?: (state: TestRunState) => void;
  labels?: Partial<TestRunStreamLabels>;
}

const toneOf: Record<"ok" | "error" | "skipped", StatusTone> = { ok: "success", error: "danger", skipped: "neutral" };

function ResultItem({ result, t }: { result: TestRunResult; t: TestRunStreamLabels }) {
  const [open, setOpen] = useState(false);
  const rawId = useId();
  const title = result.title || result.url || t.untitled;
  return (
    <li data-slot="test-run-result" data-result={result.id} className="flex flex-col gap-1.5 p-3">
      <div className="flex min-w-0 items-start gap-2">
        {result.url ? (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            dir="auto"
            className="min-w-0 flex-1 truncate text-label text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current"
          >
            {title}
            <ExternalLink aria-hidden className="ms-1 inline size-3.5 align-[-2px] text-muted-foreground" />
            <span className="sr-only"> {t.opensNewTab}</span>
          </a>
        ) : (
          <span dir="auto" className="min-w-0 flex-1 truncate text-label text-foreground">
            {title}
          </span>
        )}
      </div>
      {result.meta?.length ? (
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-caption text-muted-foreground">
          {result.meta.map((m, i) => (
            <bdi key={i}>{m}</bdi>
          ))}
        </div>
      ) : null}
      {result.body ? (
        <p dir="auto" className="line-clamp-3 text-body-sm text-muted-foreground">
          {result.body}
        </p>
      ) : null}
      {result.raw !== undefined ? (
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="link" aria-expanded={open} aria-controls={rawId} onClick={() => setOpen((v) => !v)} className="w-fit">
            {open ? t.hideRaw : t.showRaw}
          </Button>
          {open ? (
            <div id={rawId}>
              <CodeBlock code={JSON.stringify(result.raw, null, 2)} language="json" filename={t.raw} preClassName="max-h-64" />
            </div>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/**
 * A test run that streams: Run and Stop, each step appearing and updating as the server reports it, a live
 * elapsed time and summary, and what the run saved, with its raw data behind a toggle.
 */
export function TestRunStream({
  run,
  controls,
  disabled = false,
  title,
  description,
  headingAs: Heading = "h3",
  onStateChange,
  labels,
  className,
  ...props
}: TestRunStreamProps) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t: TestRunStreamLabels = { ...base, ...labels, status: { ...base.status, ...labels?.status }, summary: { ...base.summary, ...labels?.summary } };
  const id = useId();

  const [state, setState] = useState<TestRunState>("idle");
  const [steps, setSteps] = useState<TestRunStep[]>([]);
  const [results, setResults] = useState<TestRunResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const controller = useRef<AbortController | null>(null);
  const token = useRef(0);
  const stateCb = useRef(onStateChange);
  stateCb.current = onStateChange;

  useEffect(() => {
    stateCb.current?.(state);
  }, [state]);

  useEffect(() => {
    if (state !== "running") return;
    const timer = setInterval(() => setElapsed(Date.now() - startedAt), 100);
    return () => clearInterval(timer);
  }, [state, startedAt]);

  // Stop a run that is still going when the panel goes away.
  useEffect(() => () => controller.current?.abort(), []);

  const startedAtRef = useRef(0);

  const finish = (mine: number, next: TestRunState, message?: string) => {
    if (token.current !== mine) return;
    token.current += 1;
    controller.current = null;
    setSteps((list) => settleTestRunSteps(list));
    setElapsed((e) => Math.max(e, Date.now() - startedAtRef.current));
    if (message !== undefined) setError(message);
    setState(next);
  };

  const start = () => {
    controller.current?.abort();
    const ac = new AbortController();
    controller.current = ac;
    token.current += 1;
    const mine = token.current;
    const now = Date.now();
    startedAtRef.current = now;
    setStartedAt(now);
    setElapsed(0);
    setSteps([]);
    setResults([]);
    setError(null);
    setState("running");
    const live = () => token.current === mine;
    const handlers: TestRunHandlers = {
      step: (step) => live() && setSteps((list) => upsertTestRunStep(list, step)),
      result: (result) => live() && setResults((list) => (list.some((r) => r.id === result.id) ? list.map((r) => (r.id === result.id ? result : r)) : [...list, result])),
      done: () => finish(mine, "done"),
      fail: (message) => finish(mine, "error", message),
    };
    try {
      const out = run(handlers, ac.signal);
      if (out && typeof (out as Promise<unknown>).then === "function") {
        (out as Promise<unknown>).then(
          () => finish(mine, "done"),
          (e: unknown) => {
            if (!ac.signal.aborted) finish(mine, "error", e instanceof Error ? e.message : String(e));
          },
        );
      }
    } catch (e) {
      finish(mine, "error", e instanceof Error ? e.message : String(e));
    }
  };

  const stop = () => {
    const mine = token.current;
    controller.current?.abort();
    finish(mine, "stopped");
  };

  const clear = () => {
    setState("idle");
    setSteps([]);
    setResults([]);
    setError(null);
    setElapsed(0);
  };

  const counts = testRunCounts(steps);
  const time = formatTestRunDuration(elapsed);
  const parts = (["ok", "error", "skipped"] as const).filter((k) => counts[k] > 0).map((k) => fill(t.summary[k], { n: formatNumber(counts[k], locale) }));
  const line =
    state === "running"
      ? `${t.running} · ${fill(t.stepsCount, { n: formatNumber(counts.total, locale) })} · ${time}`
      : state === "done"
        ? [fill(t.finished, { time }), ...parts].join(" · ")
        : state === "stopped"
          ? [fill(t.stopped, { time }), ...parts].join(" · ")
          : state === "error"
            ? fill(t.failed, { time })
            : "";

  const heading = title === undefined ? t.title : title;
  const sub = description === undefined ? t.description : description;

  return (
    <section
      data-slot="test-run-stream"
      data-state={state}
      aria-labelledby={heading ? `${id}-title` : undefined}
      className={cn("flex flex-col rounded-card border border-border bg-card", className)}
      {...props}
    >
      <header className="flex flex-wrap items-start gap-3 border-b border-border px-5 py-4">
        {heading || sub ? (
          <div className="flex min-w-48 flex-1 flex-col gap-1">
            {heading ? (
              <Heading id={`${id}-title`} className="text-h4 text-foreground">
                {heading}
              </Heading>
            ) : null}
            {sub ? <p className="text-body-sm text-muted-foreground">{sub}</p> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2">
          {controls}
          {state === "running" ? (
            <Button onClick={stop} data-action="stop">
              <Square aria-hidden />
              {t.stop}
            </Button>
          ) : (
            <>
              {state !== "idle" ? (
                <Button variant="ghost" onClick={clear}>
                  <RotateCcw aria-hidden />
                  {t.clear}
                </Button>
              ) : null}
              <Button variant="primary" onClick={start} disabled={disabled} data-action="run">
                <Play aria-hidden />
                {state === "idle" ? t.run : t.runAgain}
              </Button>
            </>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-4 px-5 py-4">
        <p role="status" data-slot="test-run-summary" className={cn("text-body-sm tabular-nums", state === "idle" ? "sr-only" : "text-muted-foreground")}>
          {line}
        </p>

        {error ? (
          <p role="alert" dir="auto" className="rounded-control bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
            {error}
          </p>
        ) : null}

        {state === "idle" ? (
          <EmptyState icon={FlaskConical} title={t.idleTitle} description={t.idleBody} />
        ) : (
          <>
            <div className="flex flex-col gap-2">
              <h4 id={`${id}-steps`} className="text-caption text-muted-foreground">
                {t.steps}
              </h4>
              {steps.length ? (
                <ol aria-labelledby={`${id}-steps`} className="divide-y divide-border rounded-control border border-border">
                  {steps.map((step, i) => {
                    const s = testRunStepStatus(step.status);
                    return (
                      <li key={step.id ?? step.name} data-slot="test-run-step" data-status={s} className="flex items-start gap-3 px-3 py-2.5">
                        <span aria-hidden className="mt-0.5 flex size-5 shrink-0 items-center justify-center">
                          {s === "running" ? <Spinner /> : <Status tone={toneOf[s]} />}
                        </span>
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="text-caption text-muted-foreground tabular-nums">{formatNumber(i + 1, locale)}.</span>
                            <span dir="auto" className="text-label text-foreground">
                              {step.name}
                            </span>
                            {typeof step.count === "number" && step.count > 0 ? (
                              <Badge variant="neutral">{fill(t.items, { n: formatNumber(step.count, locale) })}</Badge>
                            ) : null}
                          </div>
                          {step.detail ? (
                            <p dir="auto" className="text-caption text-muted-foreground">
                              {step.detail}
                            </p>
                          ) : null}
                          {step.error ? (
                            <p dir="auto" className="text-caption text-nq-danger-text">
                              {step.error}
                            </p>
                          ) : null}
                        </div>
                        <span className="flex shrink-0 flex-col items-end gap-0.5">
                          <span className={cn("text-caption", s === "error" ? "text-nq-danger-text" : "text-muted-foreground")}>{t.status[s]}</span>
                          {typeof step.durationMs === "number" ? (
                            <bdi dir="ltr" className="text-caption text-muted-foreground tabular-nums">
                              {formatTestRunDuration(step.durationMs)}
                            </bdi>
                          ) : null}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              ) : state === "running" ? (
                <p className="flex items-center gap-2 rounded-control border border-dashed border-border px-3 py-2.5 text-body-sm text-muted-foreground">
                  <Spinner aria-hidden />
                  {t.waiting}
                </p>
              ) : null}
            </div>

            {results.length || state === "done" ? (
              <div className="flex flex-col gap-2">
                <h4 id={`${id}-results`} className="flex items-center gap-2 text-caption text-muted-foreground">
                  {t.results}
                  <Badge variant="neutral">{formatNumber(results.length, locale)}</Badge>
                </h4>
                {results.length ? (
                  <ul aria-labelledby={`${id}-results`} className="divide-y divide-border rounded-control border border-border">
                    {results.map((r) => (
                      <ResultItem key={r.id} result={r} t={t} />
                    ))}
                  </ul>
                ) : (
                  <p className="text-body-sm text-muted-foreground">{t.noResults}</p>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
