"use client";

import { ArrowDown, ArrowUp, Minus, TriangleAlert } from "lucide-react";
import type { ComponentProps, CSSProperties, ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { CHART_COLORS, MiniBar, Sparkline } from "../chart";
import { biggestDropIndex, funnelRows, overallConversion, type FunnelStepInput } from "../funnel-chart/funnel-math";
import { type FormatNumberOptions, Num, useFormatNumber } from "../numeric";
import { type RingTone, funnelBarShare, ringFraction, ringGeometry, ringToneFor, segmentShares } from "./chart-extras-math";

const STRINGS = {
  en: {
    total: "Total",
    remaining: "Remaining",
    segments: (parts: string) => `Breakdown: ${parts}`,
    ring: (pct: string) => `${pct} complete`,
    funnel: "Funnel steps",
    entered: "Entered",
    overall: "Overall conversion",
    continued: (pct: string) => `${pct} continued`,
    left: (n: string) => `${n} left`,
    biggest: "Biggest drop",
    ofFirst: (pct: string) => `${pct} of the first step`,
    stepOf: (i: number, n: number) => `Step ${i} of ${n}`,
    up: "up",
    down: "down",
    flat: "no change",
  },
  ar: {
    total: "الإجمالي",
    remaining: "المتبقي",
    segments: (parts: string) => `التوزيع: ${parts}`,
    ring: (pct: string) => `اكتمل ${pct}`,
    funnel: "خطوات القمع",
    entered: "دخلوا",
    overall: "التحويل الإجمالي",
    continued: (pct: string) => `تابع ${pct}`,
    left: (n: string) => `غادر ${n}`,
    biggest: "أكبر تسرّب",
    ofFirst: (pct: string) => `${pct} من الخطوة الأولى`,
    stepOf: (i: number, n: number) => `الخطوة ${i} من ${n}`,
    up: "ارتفاع",
    down: "انخفاض",
    flat: "بلا تغيّر",
  },
};

export type ChartExtrasLabels = typeof STRINGS.en;

const PERCENT: FormatNumberOptions = { style: "percent", maximumFractionDigits: 1 };
const PERCENT_WHOLE: FormatNumberOptions = { style: "percent", maximumFractionDigits: 0 };

/* Four hatch patterns laid over a fill, so a segment can be told apart without its colour. */
const PATTERNS = [
  undefined,
  "repeating-linear-gradient(135deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)",
  "repeating-linear-gradient(45deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)",
  "radial-gradient(color-mix(in oklab, var(--card) 65%, transparent) 1.2px, transparent 1.6px) 0 0 / 6px 6px",
] as const;

/* ------------------------------------------------------------------------------------------------ SegmentBar */

export interface SegmentBarSegment {
  id: string;
  /** Name shown in the legend. Localise it. */
  label: ReactNode;
  value: number;
  /** Any CSS colour, normally a token. Default: the chart palette entry for the position. */
  color?: string;
}

export interface SegmentBarProps extends Omit<ComponentProps<"div">, "children"> {
  segments: readonly SegmentBarSegment[];
  /** Total the bar is measured against. Larger than the sum leaves the rest as an empty track (6 of 10 seats). */
  total?: number;
  /** Intl options for the values in the legend. */
  format?: FormatNumberOptions;
  /** Legend under the bar with each segment's value and share. Default true. */
  legend?: boolean;
  /** Put the share inside segments wide enough to hold it. Default true. */
  inlineLabels?: boolean;
  /** Overlay hatch patterns so segments differ by more than colour. Default false; the legend already names every segment. */
  patterned?: boolean;
  size?: "sm" | "md" | "lg";
  /** Screen-reader summary of the bar. Default: the segments and their shares. */
  label?: string;
  /** Legend text for the empty track. */
  restLabel?: ReactNode;
  labels?: Partial<ChartExtrasLabels>;
}

const barHeight = { sm: "h-2", md: "h-4", lg: "h-7" } as const;

/**
 * One bar cut into proportional segments with a legend that carries the values, so nothing depends on colour alone.
 * Segments grow from the inline start: the bar reads right to left in Arabic.
 */
export function SegmentBar({ segments, total, format, legend = true, inlineLabels = true, patterned = false, size = "md", label, restLabel, labels, className, ...props }: SegmentBarProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const fmt = useFormatNumber();
  const { shares, rest } = segmentShares(segments, total);
  const summary = label ?? t.segments(segments.map((s, i) => `${typeof s.label === "string" ? s.label : s.id} ${fmt(shares[i]!.share, PERCENT_WHOLE)}`).join(", "));
  const colorOf = (s: SegmentBarSegment, i: number) => s.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
  return (
    <div data-slot="segment-bar" className={cn("flex min-w-0 flex-col gap-3", className)} {...props}>
      <div role="img" aria-label={summary} className={cn("flex w-full gap-0.5 overflow-hidden rounded-full bg-nq-surface-soft", barHeight[size])}>
        {segments.map((s, i) => {
          const share = shares[i]!.share;
          if (share <= 0) return null;
          const pattern = patterned ? PATTERNS[i % PATTERNS.length] : undefined;
          const style: CSSProperties = { flexGrow: shares[i]!.value, flexBasis: 0, backgroundColor: colorOf(s, i), backgroundImage: pattern };
          return (
            <span
              key={s.id}
              data-slot="segment-bar-segment"
              title={`${typeof s.label === "string" ? s.label : s.id}: ${fmt(shares[i]!.value, format)} (${fmt(share, PERCENT)})`}
              style={style}
              className="flex min-w-1 items-center justify-center overflow-hidden text-caption text-primary-foreground first:rounded-s-full last:rounded-e-full"
            >
              {inlineLabels && size !== "sm" && share >= 0.1 ? <span className="px-1 tabular-nums [text-shadow:0_0_2px_rgb(0_0_0/0.35)]">{fmt(share, PERCENT_WHOLE)}</span> : null}
            </span>
          );
        })}
        {rest > 0 ? <span aria-hidden style={{ flexGrow: rest, flexBasis: 0 }} /> : null}
      </div>
      {legend ? (
        <ul data-slot="segment-bar-legend" className="grid gap-x-6 gap-y-1.5 text-body-sm [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
          {segments.map((s, i) => (
            <li key={s.id} className="flex min-w-0 items-center gap-2">
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-[2px]"
                style={{ backgroundColor: colorOf(s, i), backgroundImage: patterned ? PATTERNS[i % PATTERNS.length] : undefined }}
              />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{s.label}</span>
              <span className="tabular-nums text-foreground">
                <Num value={s.value} format={format} />
              </span>
              <span className="w-12 text-end tabular-nums text-muted-foreground">
                <Num value={shares[i]!.share} format={PERCENT_WHOLE} />
              </span>
            </li>
          ))}
          {rest > 0 && restLabel ? (
            <li className="flex min-w-0 items-center gap-2">
              <span aria-hidden className="size-2.5 shrink-0 rounded-[2px] border border-border bg-nq-surface-soft" />
              <span className="min-w-0 flex-1 truncate text-muted-foreground">{restLabel}</span>
              <span className="tabular-nums text-foreground">
                <Num value={rest} format={format} />
              </span>
              <span className="w-12" />
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

/* ---------------------------------------------------------------------------------------------- ProgressRing */

const ringStroke: Record<RingTone, string> = {
  default: "var(--primary)",
  info: "var(--nq-info)",
  success: "var(--nq-success)",
  warning: "var(--nq-warning)",
  danger: "var(--nq-danger)",
};

export interface ProgressRingProps extends Omit<ComponentProps<"div">, "children"> {
  value: number;
  /** Value that fills the ring. Default 100. */
  max?: number;
  min?: number;
  /** Fixed tone, or "auto" to go warning at `warnAt` and danger at `dangerAt` of the range (usage). Default "default". */
  tone?: RingTone | "auto";
  warnAt?: number;
  dangerAt?: number;
  /** Diameter in px. Default 96. */
  size?: number;
  /** Stroke width in a 100 unit box. Default 8. */
  thickness?: number;
  /** Replaces the percentage in the middle: a figure, an icon, "3/5". */
  children?: ReactNode;
  /** Small text under the middle figure. */
  caption?: ReactNode;
  /** Accessible name: what is being measured. */
  label: string;
  /** Text read out with the value, and shown by screen readers only. Default: "<n>% complete". */
  valueText?: string;
  labels?: Partial<ChartExtrasLabels>;
}

/**
 * A ring that fills clockwise (counter-clockwise in RTL) with the figure in its middle. Tone comes with the figure and
 * an optional `caption`, and `tone="auto"` adds a warning icon beyond `warnAt`, so meaning never rests on colour alone.
 */
export function ProgressRing({ value, max = 100, min = 0, tone = "default", warnAt = 0.8, dangerAt = 0.95, size = 96, thickness = 8, children, caption, label, valueText, labels, className, style, ...props }: ProgressRingProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const fmt = useFormatNumber();
  const fraction = ringFraction(value, max, min);
  const resolved: RingTone = tone === "auto" ? ringToneFor(fraction, warnAt, dangerAt) : tone;
  const geo = ringGeometry(fraction, thickness);
  const pct = fmt(fraction, PERCENT_WHOLE);
  return (
    <div
      data-slot="progress-ring"
      data-tone={resolved}
      role="progressbar"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={Math.min(max, Math.max(min, value))}
      aria-valuetext={valueText ?? t.ring(pct)}
      style={{ width: size, height: size, ...style }}
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      {...props}
    >
      <svg viewBox="0 0 100 100" aria-hidden className="absolute inset-0 size-full -rotate-90 rtl:-scale-x-100 rtl:rotate-90">
        <circle cx="50" cy="50" r={geo.radius} fill="none" strokeWidth={thickness} className="stroke-nq-surface-soft" />
        {fraction > 0 ? (
          <circle
            cx="50"
            cy="50"
            r={geo.radius}
            fill="none"
            strokeWidth={thickness}
            strokeLinecap={fraction >= 1 ? "butt" : "round"}
            strokeDasharray={`${geo.dash} ${geo.gap}`}
            style={{ stroke: ringStroke[resolved] }}
            className="transition-[stroke-dasharray] duration-300 ease-nq motion-reduce:transition-none"
          />
        ) : null}
      </svg>
      <div className="relative flex max-w-[70%] flex-col items-center text-center leading-tight">
        <span className="inline-flex items-center gap-1 text-label tabular-nums text-foreground" style={{ fontSize: Math.max(11, size * 0.2) }}>
          {resolved === "danger" || resolved === "warning" ? <TriangleAlert aria-hidden className="size-[0.8em] shrink-0" /> : null}
          {children ?? <Num value={fraction} format={PERCENT_WHOLE} />}
        </span>
        {caption ? <span className="text-caption text-muted-foreground">{caption}</span> : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------ FunnelSteps */

export interface FunnelStepsStep extends FunnelStepInput {
  /** Extra line under the label, kept left-to-right (an event name, a path). */
  detail?: string;
}

export interface FunnelStepsProps extends Omit<ComponentProps<"div">, "children"> {
  steps: readonly FunnelStepsStep[];
  /** Intl options for the counts. */
  format?: FormatNumberOptions;
  /** Show the overall conversion under the last step. Default true. */
  summary?: boolean;
  /** Accessible name of the funnel. Default: the localised "Funnel steps". */
  label?: string;
  labels?: Partial<ChartExtrasLabels>;
}

/**
 * A funnel drawn as centred bars that narrow with each step, with the step-to-step conversion and the people lost written
 * between them. The step with the biggest drop is flagged with an icon and text. For a comparison by source or a list
 * of saved funnels use FunnelChart.
 */
export function FunnelSteps({ steps, format, summary = true, label, labels, className, ...props }: FunnelStepsProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const fmt = useFormatNumber();
  const rows = funnelRows(steps);
  const first = steps[0]?.count ?? 0;
  const worst = biggestDropIndex(steps);
  return (
    <div data-slot="funnel-steps" role="group" aria-label={label ?? t.funnel} className={cn("flex min-w-0 flex-col", className)} {...props}>
      {rows.map((r, i) => {
        const width = funnelBarShare(r.step.count, first);
        return (
          <div key={r.step.id} data-slot="funnel-steps-step" className="flex flex-col">
            {i > 0 ? (
              <div data-slot="funnel-steps-link" className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5 text-caption text-muted-foreground">
                <ArrowDown aria-hidden className="size-3.5 shrink-0" />
                <span className="tabular-nums">{t.continued(fmt(r.fromPrevious, PERCENT))}</span>
                <span aria-hidden>·</span>
                <span className="tabular-nums">{t.left(fmt(r.dropped, format))}</span>
                {i === worst ? (
                  <Badge variant="warning">
                    <TriangleAlert aria-hidden className="size-3" />
                    {t.biggest}
                  </Badge>
                ) : null}
              </div>
            ) : null}
            <div className="flex items-baseline justify-between gap-3 text-body-sm">
              <span className="min-w-0 truncate text-foreground">
                <span className="sr-only">{t.stepOf(i + 1, rows.length)}. </span>
                {r.step.label}
                {r.step.detail ? (
                  <bdi dir="ltr" className="ms-2 text-caption text-muted-foreground">
                    {r.step.detail}
                  </bdi>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-foreground">
                <Num value={r.step.count} format={format} />
                {i > 0 ? (
                  <span className="ms-2 text-caption text-muted-foreground">
                    <Num value={r.fromFirst} format={PERCENT} />
                  </span>
                ) : null}
              </span>
            </div>
            <div className="mt-1 flex h-7 justify-center" aria-hidden>
              <span
                className="h-full rounded-control"
                style={{ width: `${width * 100}%`, backgroundColor: "var(--primary)", opacity: 1 - (i / Math.max(1, rows.length)) * 0.55 }}
              />
            </div>
          </div>
        );
      })}
      {summary && rows.length > 1 ? (
        <p data-slot="funnel-steps-summary" className="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-body-sm">
          <span className="text-muted-foreground">{t.overall}</span>
          <span className="text-label tabular-nums text-foreground">
            <Num value={overallConversion(steps)} format={PERCENT} />
          </span>
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------------------------------------- TrendCell */

export interface TrendCellProps extends Omit<ComponentProps<"div">, "children"> {
  /** The figure for the row. A number is formatted with `format`; pass a node for anything else. */
  value: number | ReactNode;
  format?: FormatNumberOptions;
  /** Values for the small chart, oldest first. */
  data?: readonly number[];
  /** "line" (default) draws a `Sparkline`, "bar" a `MiniBar`. */
  variant?: "line" | "bar";
  /** Change against the previous period as a fraction: 0.124 is +12.4%. */
  delta?: number;
  /** Down is good (costs, errors). */
  invert?: boolean;
  /** Bar index to emphasise (the current period), for `variant="bar"`. */
  highlight?: number;
  /** Screen-reader summary of the small chart. Without it the chart is decorative. */
  chartLabel?: string;
  labels?: Partial<ChartExtrasLabels>;
}

/**
 * A table-row cell: the figure, its change and a small line or bar chart beside it. Built for DataTable columns, so a
 * row can show a trend without a chart of its own. The change is an arrow and a signed number as well as a colour.
 */
export function TrendCell({ value, format, data, variant = "line", delta, invert = false, highlight, chartLabel, labels, className, ...props }: TrendCellProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const dir = delta === undefined || delta === 0 ? "flat" : delta > 0 ? "up" : "down";
  const good = dir === "flat" ? undefined : (dir === "up") !== invert;
  const Icon = dir === "up" ? ArrowUp : dir === "down" ? ArrowDown : Minus;
  const color = good === undefined ? "var(--primary)" : good ? "var(--nq-success)" : "var(--nq-danger)";
  return (
    <div data-slot="trend-cell" data-trend={dir} className={cn("flex items-center justify-end gap-3", className)} {...props}>
      <div className="flex flex-col items-end leading-tight">
        <span className="text-body-sm tabular-nums text-foreground">{typeof value === "number" ? <Num value={value} format={format} /> : value}</span>
        {delta !== undefined ? (
          <span className={cn("inline-flex items-center gap-0.5 text-caption tabular-nums", good === undefined ? "text-muted-foreground" : good ? "text-nq-success-text" : "text-nq-danger-text")}>
            <Icon aria-hidden className="size-3" />
            <span className="sr-only">{t[dir]} </span>
            <Num value={delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} />
          </span>
        ) : null}
      </div>
      {data?.length ? (
        variant === "bar" ? (
          <MiniBar data={data} color={color} highlight={highlight ?? data.length - 1} label={chartLabel} className="h-8 w-20" />
        ) : (
          <Sparkline data={data} color={color} label={chartLabel} className="h-8 w-20" />
        )
      ) : null}
    </div>
  );
}
