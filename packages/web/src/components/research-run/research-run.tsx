"use client";

import { Check, CircleAlert, CircleDashed, Loader, Microscope, Quote, RotateCcw, Square, X } from "lucide-react";
import { type ComponentProps, type FormEvent, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiConfidenceMeter, AiGeneratedLabel, AiThinking, usePrefersReducedMotion } from "../ai-states";
import { Button } from "../button";
import { CopilotSources, type CopilotSource, hostOf, isSafeUrl } from "../copilot-chat";
import { Textarea } from "../field";
import { DateTime, formatNumber } from "../numeric";
import { citedNumbers, evidenceNumbers, type ResearchStageState, stageProgress, uncitedEvidence } from "./research-run-math";

export type { ResearchStageState } from "./research-run-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    label: "Research run",
    ask: "Ask",
    asking: "Researching",
    placeholder: "What do you want researched?",
    cancel: "Stop research",
    retry: "Try again",
    newQuestion: "New question",
    suggestions: "Try asking",
    queued: "Waiting for a free researcher",
    stages: "Progress",
    checked: (n: string) => `${n} sources checked`,
    read: (n: string) => `${n} read`,
    stageStates: { pending: "Waiting", running: "In progress", done: "Done", failed: "Failed" } as Record<ResearchStageState, string>,
    answer: "Answer",
    evidence: "Evidence",
    evidenceHint: "The passages the answer rests on.",
    citation: (n: string) => `Evidence ${n}`,
    showEvidence: (n: string) => `Show evidence ${n}`,
    openSource: "Open source",
    relevance: (n: string) => `Relevance ${n}`,
    notCited: "Also found",
    sources: "Sources",
    failed: "The research stopped before it had an answer.",
    cancelled: "Research stopped.",
    noAnswer: "No answer was found for this question.",
    finished: "Finished",
  },
  ar: {
    label: "جولة بحث",
    ask: "اسأل",
    asking: "جارٍ البحث",
    placeholder: "ما الذي تريد بحثه؟",
    cancel: "إيقاف البحث",
    retry: "حاول مرة أخرى",
    newQuestion: "سؤال جديد",
    suggestions: "جرّب أن تسأل",
    queued: "بانتظار باحث متاح",
    stages: "التقدم",
    checked: (n: string) => `${n} مصادر تمت مراجعتها`,
    read: (n: string) => `${n} قُرئت`,
    stageStates: { pending: "بالانتظار", running: "قيد التنفيذ", done: "تم", failed: "فشل" } as Record<ResearchStageState, string>,
    answer: "الإجابة",
    evidence: "الأدلة",
    evidenceHint: "المقاطع التي تستند إليها الإجابة.",
    citation: (n: string) => `الدليل ${n}`,
    showEvidence: (n: string) => `إظهار الدليل ${n}`,
    openSource: "فتح المصدر",
    relevance: (n: string) => `الصلة ${n}`,
    notCited: "وُجد أيضًا",
    sources: "المصادر",
    failed: "توقف البحث قبل الوصول إلى إجابة.",
    cancelled: "تم إيقاف البحث.",
    noAnswer: "لم يُعثر على إجابة لهذا السؤال.",
    finished: "اكتمل",
  },
};

export type ResearchRunLabels = Omit<typeof STRINGS.en, "stageStates"> & { stageStates: Record<ResearchStageState, string> };
type LabelOverrides = Partial<Omit<ResearchRunLabels, "stageStates">> & { stageStates?: Partial<ResearchRunLabels["stageStates"]> };

function useStrings(labels?: LabelOverrides) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { locale, t: { ...base, ...labels, stageStates: { ...base.stageStates, ...labels?.stageStates } } as ResearchRunLabels };
}

/* ------------------------------------------------------------------ types */

export type ResearchStatus = "queued" | "running" | "done" | "failed" | "cancelled";

export interface ResearchStage {
  id: string;
  label: string;
  state: ResearchStageState;
  /** A short note such as "12 pages". */
  detail?: string;
}

export interface ResearchEvidence {
  id: string;
  /** The `CopilotSource` this passage comes from. */
  sourceId: string;
  /** The passage, as found. */
  quote: string;
  /** 0 to 1. */
  relevance?: number;
}

export interface ResearchAnswerBlock {
  id: string;
  /** One paragraph of the answer. */
  text: string;
  /** Ids of the evidence this paragraph rests on. */
  cites?: readonly string[];
}

export interface ResearchRunData {
  id: string;
  question: string;
  status: ResearchStatus;
  stages?: readonly ResearchStage[];
  sourcesChecked?: number;
  sourcesRead?: number;
  answer?: readonly ResearchAnswerBlock[];
  evidence?: readonly ResearchEvidence[];
  /** Cited sources, shown with `CopilotSources`. */
  sources?: readonly CopilotSource[];
  /** 0 to 1. */
  confidence?: number;
  /** The model that wrote the answer. */
  model?: string;
  finishedAt?: Date | string | number;
  /** Why it failed. */
  error?: string;
}

export type ResearchRunResult = void | { error?: string };

export interface ResearchRunProps extends Omit<ComponentProps<"section">, "children" | "onSubmit"> {
  /** The current run, or nothing before the first question. */
  run?: ResearchRunData | null;
  /** Start researching a question. */
  onAsk: (question: string) => Promise<ResearchRunResult> | ResearchRunResult;
  /** Stop a queued or running run. Shows the stop button. */
  onCancel?: (run: ResearchRunData) => void | Promise<void>;
  /** Try the same question again after a failure or a stop. */
  onRetry?: (run: ResearchRunData) => void | Promise<void>;
  /** Example questions shown before the first run. */
  suggestions?: readonly string[];
  defaultQuestion?: string;
  labels?: LabelOverrides;
}

const STAGE_ICON = { pending: CircleDashed, running: Loader, done: Check, failed: X } as const;

/* ------------------------------------------------------------------ pieces */

function Stages({ stages, t, locale, run }: { stages: readonly ResearchStage[]; t: ResearchRunLabels; locale: string; run: ResearchRunData }) {
  const reduced = usePrefersReducedMotion();
  const { done, total, current } = stageProgress(stages);
  const active = stages[current];
  const live = run.status === "running" || run.status === "queued";
  return (
    <div data-slot="research-progress" className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {live ? <AiThinking label={run.status === "queued" ? t.queued : t.asking} steps={active ? [active.label] : undefined} current={0} compact /> : <span className="text-label text-foreground">{t.stages}</span>}
        <span className="text-caption tabular-nums text-muted-foreground">
          {formatNumber(done, locale)} / {formatNumber(total, locale)}
        </span>
      </div>
      <ol aria-label={t.stages} className="flex flex-col gap-2">
        {stages.map((s) => {
          const Icon = STAGE_ICON[s.state];
          return (
            <li key={s.id} data-state={s.state} aria-current={s.state === "running" ? "step" : undefined} className="flex items-center gap-2.5 text-body-sm">
              <Icon
                aria-hidden
                className={cn(
                  "size-4 shrink-0",
                  s.state === "done" && "text-nq-success-text",
                  s.state === "failed" && "text-nq-danger-text",
                  s.state === "running" && cn("text-nq-accent-text", !reduced && "animate-spin"),
                  s.state === "pending" && "text-muted-foreground",
                )}
              />
              <span className={cn("min-w-0 flex-1", s.state === "pending" ? "text-muted-foreground" : "text-foreground")}>{s.label}</span>
              {s.detail ? <span className="text-caption text-muted-foreground">{s.detail}</span> : null}
              <span className="sr-only">{t.stageStates[s.state]}</span>
            </li>
          );
        })}
      </ol>
      {run.sourcesChecked !== undefined ? (
        <p className="text-caption text-muted-foreground">
          {t.checked(formatNumber(run.sourcesChecked, locale))}
          {run.sourcesRead !== undefined ? ` · ${t.read(formatNumber(run.sourcesRead, locale))}` : ""}
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ component */

/**
 * Ask a research question and follow it: an ask box, live progress (stages, sources checked and read, stop), then an
 * answer whose paragraphs cite numbered evidence. Choosing a citation highlights the passage it rests on. Failed and
 * stopped runs say so and offer a retry. It runs nothing itself: you start the run, stream the data in, and it renders it.
 */
export function ResearchRun({ run, onAsk, onCancel, onRetry, suggestions, defaultQuestion = "", labels, className, ...props }: ResearchRunProps) {
  const { locale, t } = useStrings(labels);
  const reduced = usePrefersReducedMotion();
  const rootRef = useRef<HTMLElement>(null);
  const [question, setQuestion] = useState(defaultQuestion);
  const [pending, setPending] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  const live = run?.status === "queued" || run?.status === "running";
  const evidence = run?.evidence ?? [];
  const blocks = run?.answer ?? [];
  const numbers = useMemo(() => evidenceNumbers(evidence), [evidence]);
  const sourceOf = useMemo(() => new Map((run?.sources ?? []).map((s) => [s.id, s])), [run?.sources]);
  const extra = useMemo(() => uncitedEvidence(evidence, blocks), [evidence, blocks]);

  async function submit(e?: FormEvent, text = question) {
    e?.preventDefault();
    const q = text.trim();
    if (!q || pending || live) return;
    setPending(true);
    setProblem(null);
    try {
      const result = await onAsk(q);
      if (result && result.error) setProblem(result.error);
    } catch (err) {
      setProblem(err instanceof Error ? err.message : t.failed);
    } finally {
      setPending(false);
    }
  }

  function focusEvidence(id: string) {
    setActive(id);
    const el = rootRef.current?.querySelector<HTMLElement>(`[data-evidence-id="${CSS.escape(id)}"]`);
    el?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
  }

  const renderEvidence = (e: ResearchEvidence) => {
    const n = numbers.get(e.id) ?? 0;
    const src = sourceOf.get(e.sourceId);
    return (
      <li
        key={e.id}
        data-evidence-id={e.id}
        data-active={active === e.id || undefined}
        className={cn("flex gap-3 px-4 py-3 transition-colors duration-150 ease-nq", active === e.id && "bg-nq-selected")}
      >
        <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-secondary text-[11px] tabular-nums text-muted-foreground">{formatNumber(n, locale)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <blockquote dir="auto" className="flex gap-2 text-body-sm text-foreground">
            <Quote aria-hidden className="mt-0.5 size-3.5 shrink-0 text-muted-foreground rtl:-scale-x-100" />
            <span>{e.quote}</span>
          </blockquote>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
            {src ? (
              isSafeUrl(src.url) ? (
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-w-0 items-center gap-1.5 text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current">
                  <span dir="auto" className="truncate">
                    {src.title}
                  </span>
                  <bdi dir="ltr" className="shrink-0 text-muted-foreground">
                    {hostOf(src.url)}
                  </bdi>
                  <span className="sr-only">{t.openSource}</span>
                </a>
              ) : (
                <span dir="auto" className="truncate text-foreground">
                  {src.title}
                </span>
              )
            ) : null}
            {e.relevance !== undefined ? <span>{t.relevance(formatNumber(e.relevance, locale, { style: "percent", maximumFractionDigits: 0 }))}</span> : null}
          </p>
        </div>
      </li>
    );
  };

  return (
    <section ref={rootRef} data-slot="research-run" aria-label={t.label} className={cn("flex min-w-0 flex-col gap-5", className)} {...props}>
      <form className="flex flex-col gap-2" onSubmit={(e) => void submit(e)}>
        <Textarea
          dir="auto"
          rows={2}
          value={question}
          placeholder={t.placeholder}
          aria-label={t.placeholder}
          disabled={live || pending}
          className="min-h-16 resize-none"
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submit();
          }}
        />
        <div className="flex flex-wrap items-center gap-2">
          {live && run && onCancel ? (
            <Button type="button" variant="secondary" onClick={() => void onCancel(run)}>
              <Square aria-hidden />
              {t.cancel}
            </Button>
          ) : null}
          <Button type="submit" variant="primary" className="ms-auto" loading={pending || live} disabled={!question.trim()}>
            <Microscope aria-hidden />
            {pending || live ? t.asking : t.ask}
          </Button>
        </div>
        <p role="alert" className="min-h-4 text-caption text-nq-danger-text">
          {problem ?? ""}
        </p>
      </form>

      {!run && suggestions && suggestions.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-caption text-muted-foreground">{t.suggestions}</span>
          <ul className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <li key={s}>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  dir="auto"
                  onClick={() => {
                    setQuestion(s);
                    void submit(undefined, s);
                  }}
                >
                  {s}
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {run ? (
        <div data-status={run.status} className="flex min-w-0 flex-col gap-4">
          {run.stages && run.stages.length > 0 && (live || run.status !== "done") ? <Stages stages={run.stages} t={t} locale={locale} run={run} /> : null}
          {live && (!run.stages || run.stages.length === 0) ? (
            <div role="status" className="rounded-card border border-border bg-card p-4">
              <AiThinking label={run.status === "queued" ? t.queued : t.asking} />
            </div>
          ) : null}

          {run.status === "failed" || run.status === "cancelled" ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border border-border bg-card p-4">
              <CircleAlert aria-hidden className={cn("size-4 shrink-0", run.status === "failed" ? "text-nq-danger-text" : "text-muted-foreground")} />
              <p dir="auto" className="min-w-0 flex-1 text-body-sm text-foreground">
                {run.status === "failed" ? (run.error ?? t.failed) : t.cancelled}
              </p>
              {onRetry ? (
                <Button size="sm" onClick={() => void onRetry(run)}>
                  <RotateCcw aria-hidden />
                  {t.retry}
                </Button>
              ) : null}
            </div>
          ) : null}

          {run.status === "done" ? (
            <>
              <article data-slot="research-answer" aria-label={t.answer} className="flex flex-col gap-3 rounded-card border border-border bg-card p-5">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 className="text-label text-foreground">{t.answer}</h3>
                  <AiGeneratedLabel model={run.model} />
                  {run.confidence !== undefined ? <AiConfidenceMeter value={run.confidence} className="ms-auto" /> : null}
                </header>
                {blocks.length === 0 ? (
                  <p className="text-body-sm text-muted-foreground">{t.noAnswer}</p>
                ) : (
                  blocks.map((b) => (
                    <p key={b.id} dir="auto" className="text-body text-nq-fg-body">
                      {b.text}
                      {citedNumbers(b.cites, numbers).map(({ id, n }) => (
                        <button
                          key={id}
                          type="button"
                          aria-label={t.showEvidence(String(n))}
                          aria-pressed={active === id}
                          onClick={() => focusEvidence(id)}
                          className={cn(
                            "ms-1 inline-grid size-5 -translate-y-0.5 place-items-center rounded-full border border-border align-baseline text-[11px] tabular-nums outline-none",
                            "transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
                            active === id ? "border-primary bg-nq-selected text-foreground" : "bg-secondary text-muted-foreground",
                          )}
                        >
                          {formatNumber(n, locale)}
                        </button>
                      ))}
                    </p>
                  ))
                )}
                {run.finishedAt ? (
                  <p className="text-caption text-muted-foreground">
                    {t.finished} <DateTime value={run.finishedAt} relative />
                  </p>
                ) : null}
              </article>

              {evidence.length > 0 ? (
                <div className="flex flex-col gap-2">
                  <div>
                    <h3 className="text-label text-foreground">{t.evidence}</h3>
                    <p className="text-caption text-muted-foreground">{t.evidenceHint}</p>
                  </div>
                  <ol aria-label={t.evidence} className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
                    {evidence.filter((e) => !extra.includes(e)).map(renderEvidence)}
                  </ol>
                  {extra.length > 0 ? (
                    <>
                      <p className="text-caption text-muted-foreground">{t.notCited}</p>
                      <ol aria-label={t.notCited} className="flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-card">
                        {extra.map(renderEvidence)}
                      </ol>
                    </>
                  ) : null}
                </div>
              ) : null}

              {run.sources && run.sources.length > 0 ? <CopilotSources sources={run.sources} labels={{ sources: t.sources }} /> : null}
            </>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
