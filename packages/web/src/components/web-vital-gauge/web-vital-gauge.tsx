"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { changeRatio, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Card } from "../card";
import { formatNumber, Num } from "../numeric";
import { Status, type StatusTone } from "../status";
import {
  gaugeFraction,
  rateVital,
  VITAL_THRESHOLDS,
  type VitalDistribution,
  type VitalRating,
  vitalBands,
  vitalDisplay,
  type WebVitalId,
  normalizeDistribution,
} from "./web-vitals-math";

export * from "./web-vitals-math";

const STRINGS = {
  en: {
    names: {
      LCP: "Largest Contentful Paint",
      INP: "Interaction to Next Paint",
      CLS: "Cumulative Layout Shift",
      FCP: "First Contentful Paint",
      TTFB: "Time to First Byte",
    } as Record<WebVitalId, string>,
    hints: {
      LCP: "How fast the main content appears",
      INP: "How quickly the page responds to input",
      CLS: "How much the layout jumps while loading",
      FCP: "How fast anything first appears",
      TTFB: "How fast the server starts to answer",
    } as Record<WebVitalId, string>,
    rating: { good: "Good", "needs-improvement": "Needs improvement", poor: "Poor" } as Record<VitalRating, string>,
    p75: "75th percentile",
    core: "Core",
    good: "Good",
    needs: "Needs improvement",
    poorLabel: "Poor",
    distribution: "Page loads by rating",
    band: (from: string, to: string) => `${from} to ${to}`,
    atMost: (v: string) => `up to ${v}`,
    over: (v: string) => `over ${v}`,
    vsPrevious: "vs previous period",
    noData: "No data",
    gaugeLabel: (name: string, value: string, rating: string) => `${name}: ${value}, ${rating}`,
  },
  ar: {
    names: {
      LCP: "رسم أكبر محتوى",
      INP: "التفاعل حتى الرسم التالي",
      CLS: "الإزاحة التراكمية للتخطيط",
      FCP: "أول رسم للمحتوى",
      TTFB: "زمن وصول أول بايت",
    } as Record<WebVitalId, string>,
    hints: {
      LCP: "سرعة ظهور المحتوى الرئيسي",
      INP: "سرعة استجابة الصفحة للإدخال",
      CLS: "مقدار قفز التخطيط أثناء التحميل",
      FCP: "سرعة ظهور أي محتوى أولًا",
      TTFB: "سرعة بدء الخادم في الرد",
    } as Record<WebVitalId, string>,
    rating: { good: "جيد", "needs-improvement": "يحتاج تحسينًا", poor: "ضعيف" } as Record<VitalRating, string>,
    p75: "المئين 75",
    core: "أساسي",
    good: "جيد",
    needs: "يحتاج تحسينًا",
    poorLabel: "ضعيف",
    distribution: "تحميلات الصفحة حسب التقييم",
    band: (from: string, to: string) => `من ${from} إلى ${to}`,
    atMost: (v: string) => `حتى ${v}`,
    over: (v: string) => `أكثر من ${v}`,
    vsPrevious: "مقارنة بالفترة السابقة",
    noData: "لا بيانات",
    gaugeLabel: (name: string, value: string, rating: string) => `${name}: ${value}، ${rating}`,
  },
};

export type WebVitalGaugeLabels = typeof STRINGS.en;

const ratingTone: Record<VitalRating, StatusTone> = { good: "success", "needs-improvement": "warning", poor: "danger" };
const ratingVar: Record<VitalRating, string> = { good: "var(--nq-success)", "needs-improvement": "var(--nq-warning)", poor: "var(--nq-danger)" };

const CX = 100;
const CY = 100;
const R = 80;

/** A point on the gauge arc: 0 is the left end, 1 the right end. */
function point(f: number, r = R) {
  const angle = Math.PI * (1 - f);
  return { x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) };
}

function arc(from: number, to: number) {
  const a = point(from);
  const b = point(to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

/** The value as text with its unit, in the given locale: "2.4 s", "180 ms", "0.08". */
export function formatVital(metric: WebVitalId, value: number, locale: string): string {
  const d = vitalDisplay(metric, value);
  const n = formatNumber(d.value, locale, { minimumFractionDigits: 0, maximumFractionDigits: d.fractionDigits });
  if (!d.unit) return n;
  const ar = locale.startsWith("ar");
  const unit = d.unit === "s" ? (ar ? "ث" : "s") : ar ? "مللي ث" : "ms";
  return `${n} ${unit}`;
}

export interface WebVitalGaugeProps {
  metric: WebVitalId;
  /** The 75th percentile of the metric, in milliseconds (unitless for CLS). Omit for "No data". */
  value?: number;
  /** The previous period's 75th percentile. Adds the change; lower is better. */
  previous?: number;
  /** Share of page loads that rated good, needs improvement and poor. Counts or fractions. */
  distribution?: VitalDistribution;
  /** Make the gauge a button that selects this metric (drives a trend chart). */
  onSelect?: (metric: WebVitalId) => void;
  selected?: boolean;
  className?: string;
  labels?: Partial<WebVitalGaugeLabels>;
}

/**
 * A semicircle gauge for one Web Vital against Google's thresholds: a green good band, an amber needs-improvement band
 * and a red poor band, a marker at the 75th percentile, the value with its rating (icon and word, not colour alone),
 * the thresholds in words, and an optional distribution of page loads across the three ratings.
 */
export function WebVitalGauge({ metric, value, previous, distribution, onSelect, selected, className, labels }: WebVitalGaugeProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const threshold = VITAL_THRESHOLDS[metric];
  const bands = vitalBands(metric);
  const hasValue = value !== undefined && Number.isFinite(value);
  const rating = hasValue ? rateVital(metric, value) : undefined;
  const marker = hasValue ? point(gaugeFraction(metric, value)) : undefined;
  const text = (v: number) => formatVital(metric, v, locale);
  const delta = hasValue ? changeRatio(value, previous) : undefined;
  const dist = distribution ? normalizeDistribution(distribution) : undefined;
  const pct = (f: number) => formatNumber(f, locale, { style: "percent", maximumFractionDigits: 0 });

  const card = (
    <Card
      data-slot="web-vital-gauge"
      data-metric={metric}
      data-rating={rating}
      className={cn("h-full gap-3 px-4 py-4", onSelect && selected && "border-primary ring-1 ring-primary", className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="text-label text-foreground" dir="ltr">
              {metric}
            </span>
            {threshold.core ? <span className="rounded-control bg-secondary px-1.5 py-0.5 text-caption text-muted-foreground">{t.core}</span> : null}
          </div>
          <span className="truncate text-caption text-muted-foreground">{t.names[metric]}</span>
        </div>
        {rating ? (
          <Status tone={ratingTone[rating]} tinted className="shrink-0 text-caption">
            {t.rating[rating]}
          </Status>
        ) : null}
      </div>

      <div className="relative mx-auto w-full max-w-56">
        <svg
          viewBox="0 0 200 116"
          role="img"
          aria-label={hasValue && rating ? t.gaugeLabel(t.names[metric], text(value), t.rating[rating]) : `${t.names[metric]}: ${t.noData}`}
          className="block w-full rtl:-scale-x-100"
        >
          <path d={arc(0, 1)} fill="none" stroke="var(--nq-surface-soft)" strokeWidth={16} strokeLinecap="butt" />
          <path d={arc(0, bands.good)} fill="none" stroke={ratingVar.good} strokeWidth={14} />
          <path d={arc(bands.good, bands.poor)} fill="none" stroke={ratingVar["needs-improvement"]} strokeWidth={14} />
          <path d={arc(bands.poor, 1)} fill="none" stroke={ratingVar.poor} strokeWidth={14} />
          {marker ? (
            <g>
              <circle cx={marker.x} cy={marker.y} r={9} fill="var(--card)" stroke="var(--foreground)" strokeWidth={2.5} />
              <circle cx={marker.x} cy={marker.y} r={3} fill={ratingVar[rating ?? "good"]} />
            </g>
          ) : null}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center leading-tight">
          <span data-slot="web-vital-value" className="text-h2 text-foreground tabular-nums" dir="ltr">
            {hasValue ? text(value) : "–"}
          </span>
          <span className="text-caption text-muted-foreground">{t.p75}</span>
        </div>
      </div>

      {delta !== undefined ? (
        <p className="flex items-center justify-center gap-1.5 text-caption">
          {delta < 0 ? <TrendingDown aria-hidden className="size-3.5 text-nq-success-text rtl:-scale-x-100" /> : delta > 0 ? <TrendingUp aria-hidden className="size-3.5 text-nq-danger-text rtl:-scale-x-100" /> : null}
          <Num
            value={delta}
            format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }}
            className={cn("text-label", delta < 0 ? "text-nq-success-text" : delta > 0 ? "text-nq-danger-text" : "text-muted-foreground")}
          />
          <span className="text-muted-foreground">{t.vsPrevious}</span>
        </p>
      ) : null}

      <ul className="grid gap-1 text-caption text-muted-foreground" aria-label={t.hints[metric]}>
        <li className="flex items-center justify-between gap-2">
          <Status tone="success" className="shrink-0 whitespace-nowrap">{t.good}</Status>
          <bdi dir="ltr" className="text-end">{t.atMost(text(threshold.good))}</bdi>
        </li>
        <li className="flex items-center justify-between gap-2">
          <Status tone="warning" className="shrink-0 whitespace-nowrap">{t.needs}</Status>
          <bdi dir="ltr" className="text-end">{t.band(text(threshold.good), text(threshold.poor))}</bdi>
        </li>
        <li className="flex items-center justify-between gap-2">
          <Status tone="danger" className="shrink-0 whitespace-nowrap">{t.poorLabel}</Status>
          <bdi dir="ltr" className="text-end">{t.over(text(threshold.poor))}</bdi>
        </li>
      </ul>

      {dist ? (
        <div data-slot="web-vital-distribution" className="flex flex-col gap-1.5">
          <span className="text-caption text-muted-foreground">{t.distribution}</span>
          <div
            role="img"
            aria-label={`${t.distribution}: ${t.good} ${pct(dist.good)}, ${t.needs} ${pct(dist.needsImprovement)}, ${t.poorLabel} ${pct(dist.poor)}`}
            className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full"
          >
            {dist.good > 0 ? <span className="block h-full bg-nq-success" style={{ width: `${dist.good * 100}%` }} /> : null}
            {dist.needsImprovement > 0 ? <span className="block h-full bg-nq-warning" style={{ width: `${dist.needsImprovement * 100}%` }} /> : null}
            {dist.poor > 0 ? <span className="block h-full bg-nq-danger" style={{ width: `${dist.poor * 100}%` }} /> : null}
          </div>
          <div className="flex justify-between text-caption tabular-nums text-muted-foreground">
            <bdi>{pct(dist.good)}</bdi>
            <bdi>{pct(dist.needsImprovement)}</bdi>
            <bdi>{pct(dist.poor)}</bdi>
          </div>
        </div>
      ) : null}
    </Card>
  );

  if (!onSelect) return card;
  return (
    <button
      type="button"
      aria-pressed={!!selected}
      onClick={() => onSelect(metric)}
      className="rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus"
    >
      {card}
    </button>
  );
}

/** Lay out several gauges: as many columns as fit, each at least 15rem. */
export function WebVitalGaugeGrid({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div data-slot="web-vital-gauge-grid" className={cn("grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3", className)}>
      {children}
    </div>
  );
}
