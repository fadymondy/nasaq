"use client";

import { ExternalLink, Sparkles } from "lucide-react";
import { type ComponentProps, type ReactNode, useId } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { AiConfidenceMeter, AiGeneratedLabel } from "../ai-states";
import { Badge } from "../badge";
import { Num } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Progress, type ProgressTone } from "../progress";
import {
  type ScoreExplainerBand,
  clampScore,
  scoreDimensionFill,
  scoreExplainerBand,
  scoreRemainder,
  sortScoreDimensions,
} from "./score-explainer-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    score: "Score",
    outOf: (max: string) => `out of ${max}`,
    bands: { high: "High", medium: "Medium", low: "Low" } as Record<ScoreExplainerBand, string>,
    why: "Why this score",
    showWhy: "Show why",
    ariaBadge: (score: string, max: string, band: string) => `Score ${score} of ${max}, ${band}. Show why`,
    inferred: "Inferred",
    inferredHint: "Worked out by the model from other signals. No source states it directly.",
    sources: "Sources",
    matched: "Matched",
    points: (n: string, max: string) => `${n} of ${max} points`,
    pointsNoMax: (n: string) => `${n} points`,
    other: "Other factors",
    otherReason: "Points that no single signal above accounts for.",
    noDimensions: "No reasons were recorded for this score.",
    opensNewTab: "opens in a new tab",
    dimensionConfidence: "Confidence",
  },
  ar: {
    score: "الدرجة",
    outOf: (max: string) => `من ${max}`,
    bands: { high: "مرتفعة", medium: "متوسطة", low: "منخفضة" } as Record<ScoreExplainerBand, string>,
    why: "سبب هذه الدرجة",
    showWhy: "عرض السبب",
    ariaBadge: (score: string, max: string, band: string) => `الدرجة ${score} من ${max}، ${band}. عرض السبب`,
    inferred: "مستنتج",
    inferredHint: "استنتجه النموذج من إشارات أخرى. لا يذكره أي مصدر صراحةً.",
    sources: "المصادر",
    matched: "المطابق",
    points: (n: string, max: string) => `${n} من ${max} نقطة`,
    pointsNoMax: (n: string) => `${n} نقطة`,
    other: "عوامل أخرى",
    otherReason: "نقاط لا تفسرها إشارة واحدة من الإشارات أعلاه.",
    noDimensions: "لم تُسجَّل أسباب لهذه الدرجة.",
    opensNewTab: "يفتح في تبويب جديد",
    dimensionConfidence: "الثقة",
  },
};
export type ScoreExplainerLabels = typeof STRINGS.en;

function useStrings(labels?: Partial<ScoreExplainerLabels>) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  return { locale, t: { ...base, ...labels, bands: { ...base.bands, ...labels?.bands } } as ScoreExplainerLabels };
}

/* ------------------------------------------------------------------ types */

export interface ScoreSource {
  label: string;
  /** Where the evidence lives. With a URL the chip is a link. */
  url?: string;
  /** Shown before the label, e.g. "LinkedIn" or "CRM". Brand names are kept as written. */
  kind?: string;
  /** This particular fact was inferred, not read from the source. */
  inferred?: boolean;
}

export interface ScoreDimension {
  id: string;
  /** "Role fit", "Engagement". */
  label: string;
  /** Points this dimension adds to the score. */
  points: number;
  /** The most it could add. Drives the bar; without it the bar is relative to the whole score. */
  maxPoints?: number;
  /** One sentence in plain words: "Profile keywords found: operations (in title)." */
  reason: string;
  /** The words, tags or values that matched. */
  matched?: string[];
  sources?: ScoreSource[];
  /** The model worked this out; no source states it. */
  inferred?: boolean;
  /** 0 to 1. */
  confidence?: number;
}

export interface ScoreExplainerProps extends Omit<ComponentProps<"section">, "children" | "title"> {
  /** The total, from 0 to `max`. */
  score: number;
  /** Default 100. */
  max?: number;
  dimensions: ScoreDimension[];
  /** One line above the reasons: "Strong fit, recently active." */
  summary?: ReactNode;
  /** Overall confidence, 0 to 1. */
  confidence?: number;
  /** The whole score was produced by a model. Shows "AI generated". */
  model?: string;
  /** Set when the score is AI generated, with or without a model name. */
  aiGenerated?: boolean;
  /** Hides matched words and per-dimension confidence, for a small popover. */
  compact?: boolean;
  /** Called when a source chip without a URL is pressed. */
  onSourceClick?: (source: ScoreSource, dimension: ScoreDimension) => void;
  labels?: Partial<ScoreExplainerLabels>;
}

const BAND_TONE: Record<ScoreExplainerBand, ProgressTone> = { high: "success", medium: "warning", low: "danger" };
const BAND_BADGE = { high: "success", medium: "warning", low: "danger" } as const;

/* ------------------------------------------------------------------ pieces */

/** The "Inferred" mark: a dashed chip, so it never depends on colour. */
export function ScoreInferredMark({ className, labels }: { className?: string; labels?: Partial<ScoreExplainerLabels> }) {
  const { t } = useStrings(labels);
  return (
    <span
      data-slot="score-inferred"
      title={t.inferredHint}
      className={cn("inline-flex h-5 items-center gap-1 rounded-[4px] border border-dashed border-nq-line-strong px-1.5 text-caption text-muted-foreground [&_svg]:size-3", className)}
    >
      <Sparkles aria-hidden />
      {t.inferred}
    </span>
  );
}

const chipClass = "inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-caption outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus";

/** A source of evidence. A link when it has a URL, a button when the host handles it, plain text otherwise. */
export function ScoreSourceChip({ source, onClick, labels }: { source: ScoreSource; onClick?: () => void; labels?: Partial<ScoreExplainerLabels> }) {
  const { t } = useStrings(labels);
  const tone = source.inferred ? "border-dashed border-nq-line-strong text-muted-foreground" : "border-border bg-secondary text-foreground";
  const body = (
    <>
      {source.kind ? <span className="text-muted-foreground">{source.kind}</span> : null}
      <span dir="auto" className="truncate">
        {source.label}
      </span>
      {source.inferred ? <Sparkles aria-hidden className="size-3 shrink-0 text-muted-foreground" /> : null}
    </>
  );
  if (source.url)
    return (
      <a data-slot="score-source" href={source.url} target="_blank" rel="noopener noreferrer" className={cn(chipClass, tone, "hover:bg-nq-hover")} title={source.inferred ? t.inferredHint : undefined}>
        {body}
        <ExternalLink aria-hidden className="size-3 shrink-0 text-muted-foreground rtl:-scale-x-100" />
        <span className="sr-only">{t.opensNewTab}</span>
      </a>
    );
  if (onClick)
    return (
      <button data-slot="score-source" type="button" onClick={onClick} className={cn(chipClass, tone, "cursor-pointer hover:bg-nq-hover")} title={source.inferred ? t.inferredHint : undefined}>
        {body}
      </button>
    );
  return (
    <span data-slot="score-source" className={cn(chipClass, tone)} title={source.inferred ? t.inferredHint : undefined}>
      {body}
    </span>
  );
}

/* ------------------------------------------------------------------ explainer */

/**
 * The reasons behind a score: the total with its band and confidence, then one row per dimension with the points it
 * adds, a plain sentence, what matched, and source chips. Anything a model worked out rather than read is marked
 * "Inferred". The rows always add up to the score: a gap shows as "Other factors".
 */
export function ScoreExplainer({
  score,
  max = 100,
  dimensions,
  summary,
  confidence,
  model,
  aiGenerated,
  compact = false,
  onSourceClick,
  labels,
  className,
  ...props
}: ScoreExplainerProps) {
  const { t } = useStrings(labels);
  const id = useId();
  const shown = clampScore(score, max);
  const band = scoreExplainerBand(shown, max);
  const rows = sortScoreDimensions(dimensions);
  const remainder = scoreRemainder(shown, dimensions);

  return (
    <section data-slot="score-explainer" data-band={band} aria-labelledby={`${id}-title`} className={cn("flex min-w-0 flex-col gap-4", className)} {...props}>
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-1.5">
          <span className="text-display-sm tabular-nums text-foreground" aria-hidden>
            <Num value={Math.round(shown)} />
          </span>
          <span className="text-body-sm text-muted-foreground">{t.outOf(String(max))}</span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 id={`${id}-title`} className="text-title-sm text-foreground">
              {t.why}
            </h3>
            <Badge variant={BAND_BADGE[band]}>{t.bands[band]}</Badge>
            {aiGenerated || model ? <AiGeneratedLabel model={model} /> : null}
          </div>
          {summary ? <p className="text-body-sm text-muted-foreground">{summary}</p> : null}
        </div>
      </header>
      {confidence != null ? <AiConfidenceMeter value={confidence} /> : null}

      {rows.length === 0 && remainder === 0 ? <p className="text-body-sm text-muted-foreground">{t.noDimensions}</p> : null}
      <ul data-slot="score-dimensions" className="flex flex-col gap-4">
        {rows.map((d) => (
          <li key={d.id} data-slot="score-dimension" className="flex min-w-0 flex-col gap-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-label text-foreground">
                <span dir="auto">{d.label}</span>
                {d.inferred ? <ScoreInferredMark labels={labels} /> : null}
              </span>
              <span className="shrink-0 text-body-sm text-muted-foreground">
                {d.maxPoints ? t.points(String(Math.round(d.points * 10) / 10), String(d.maxPoints)) : t.pointsNoMax(String(Math.round(d.points * 10) / 10))}
              </span>
            </div>
            <Progress value={scoreDimensionFill(d, max) * 100} size="sm" tone={BAND_TONE[scoreExplainerBand(scoreDimensionFill(d, max) * 100)]} aria-label={d.label} />
            <p dir="auto" className="text-body-sm text-muted-foreground">
              {d.reason}
            </p>
            {!compact && d.matched?.length ? (
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-caption text-muted-foreground">{t.matched}</span>
                {d.matched.map((m) => (
                  <Badge key={m} variant="outline" dir="auto">
                    {m}
                  </Badge>
                ))}
              </div>
            ) : null}
            {d.sources?.length ? (
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`${t.sources}: ${d.label}`}>
                {d.sources.map((s) => (
                  <ScoreSourceChip key={`${s.kind ?? ""}${s.label}`} source={s} labels={labels} onClick={onSourceClick ? () => onSourceClick(s, d) : undefined} />
                ))}
              </div>
            ) : null}
            {!compact && d.confidence != null ? <AiConfidenceMeter value={d.confidence} /> : null}
          </li>
        ))}
        {remainder !== 0 ? (
          <li data-slot="score-dimension" className="flex min-w-0 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-label text-foreground">{t.other}</span>
              <span className="text-body-sm text-muted-foreground">{t.pointsNoMax(`${remainder > 0 ? "+" : ""}${remainder}`)}</span>
            </div>
            <p className="text-body-sm text-muted-foreground">{t.otherReason}</p>
          </li>
        ) : null}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ badge */

export interface ScoreBadgeProps extends Omit<ScoreExplainerProps, "compact" | "className" | "onClick" | "title"> {
  /** Where the popover opens. */
  side?: ComponentProps<typeof PopoverContent>["side"];
  className?: string;
  /** Start open. */
  defaultOpen?: boolean;
}

/**
 * A 0-100 score as a small badge (number and band word, never colour alone). Pressing it opens a popover with
 * the `ScoreExplainer`. A dashed outline and "≈" mark a score the model inferred.
 */
export function ScoreBadge({ side = "bottom", className, defaultOpen, ...explainer }: ScoreBadgeProps) {
  const { t } = useStrings(explainer.labels);
  const { score, max = 100 } = explainer;
  const shown = clampScore(score, max);
  const band = scoreExplainerBand(shown, max);
  const inferred = explainer.aiGenerated || explainer.dimensions.some((d) => d.inferred);
  return (
    <Popover defaultOpen={defaultOpen}>
      <PopoverTrigger
        data-slot="score-badge"
        data-band={band}
        aria-label={t.ariaBadge(String(Math.round(shown)), String(max), t.bands[band])}
        className={cn(
          "inline-flex h-6 cursor-pointer items-center gap-1.5 rounded-full border px-2 text-caption font-medium outline-none",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus hover:bg-nq-hover",
          band === "high" && "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
          band === "medium" && "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
          band === "low" && "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
          inferred && "border-dashed",
          className,
        )}
      >
        {inferred ? <span aria-hidden>≈</span> : null}
        <Num value={Math.round(shown)} className="text-body-sm" />
        <span>{t.bands[band]}</span>
      </PopoverTrigger>
      <PopoverContent side={side} align="start" className="w-[min(26rem,calc(100vw-2rem))] p-4">
        <ScoreExplainer {...explainer} compact />
      </PopoverContent>
    </Popover>
  );
}
