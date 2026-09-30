"use client";

import { useId, useMemo, useState, type ReactNode } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from "recharts";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { aggregate, changeRatio, parseAnalyticsDay, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { type FormatDateOptions, type FormatNumberOptions, formatDate, formatNumber, Num } from "../numeric";
import { ErrorState, Skeleton } from "../states";
import { Switch } from "../switch";
import { Toggle, ToggleGroup } from "../toggle-group";

const STRINGS = {
  en: {
    metric: "Metric",
    compare: "Compare with previous period",
    previousPeriod: "Previous period",
    total: "Total",
    average: "Average",
    empty: "No data for this period",
    chart: (metric: string, from: string, to: string) => `${metric}, ${from} to ${to}`,
    loadError: "The chart could not be loaded.",
    retry: "Try again",
    period: "Period",
    lastDays: (n: number) => `${n} days`,
  },
  ar: {
    metric: "المؤشر",
    compare: "مقارنة بالفترة السابقة",
    previousPeriod: "الفترة السابقة",
    total: "الإجمالي",
    average: "المتوسط",
    empty: "لا بيانات لهذه الفترة",
    chart: (metric: string, from: string, to: string) => `${metric}، من ${from} إلى ${to}`,
    loadError: "تعذّر تحميل الرسم البياني.",
    retry: "حاول مرة أخرى",
    period: "الفترة",
    lastDays: (n: number) => `${n} يومًا`,
  },
};

export type TimeSeriesPanelLabels = typeof STRINGS.en;

export interface TimeSeriesMetric {
  id: string;
  /** Localised name. */
  label: string;
  /** Intl options for tooltip and total. Default: plain number. */
  format?: FormatNumberOptions;
  /** Token colour such as `var(--nq-tag-teal)`. Default: the brand colour. */
  color?: string;
  /** "sum" (default) for counts, "avg" for rates and positions. */
  aggregate?: "sum" | "avg";
  /** Lower is better, so the axis runs top-down (average position) and a fall reads as an improvement. */
  lowerIsBetter?: boolean;
}

/** One row per day (or hour): `date` plus a number for each metric id. */
export interface TimeSeriesPoint {
  date: string;
  [metric: string]: number | string;
}

export interface TimeSeriesReferenceLine {
  value: number;
  label: string;
  tone?: "success" | "warning" | "danger";
}

const lineColor = { success: "var(--nq-success)", warning: "var(--nq-warning)", danger: "var(--nq-danger)" };

export interface TimeSeriesPanelProps {
  metrics: readonly TimeSeriesMetric[];
  /** The current period. */
  data: readonly TimeSeriesPoint[];
  /** The comparison period, index-aligned with `data` (day 1 against day 1). */
  previousData?: readonly TimeSeriesPoint[];
  title?: ReactNode;
  description?: ReactNode;
  /** Selected metric (controlled). */
  metric?: string;
  defaultMetric?: string;
  onMetricChange?: (id: string) => void;
  /** Whether the comparison line shows (controlled). */
  compare?: boolean;
  defaultCompare?: boolean;
  onCompareChange?: (on: boolean) => void;
  /** Horizontal guides such as a service-level objective. */
  referenceLines?: readonly TimeSeriesReferenceLine[];
  /** Options for the X axis and tooltip dates. Default: month and day, plus the hour when `date` has a time. */
  dateFormat?: FormatDateOptions;
  /** Chart height class. Default "h-64". */
  chartClassName?: string;
  /** Extra controls at the inline end of the header, for example a PeriodToggle. */
  action?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<TimeSeriesPanelLabels>;
}

const hasTime = (date: string) => date.includes("T");

/**
 * A time-series chart for one metric at a time with a period comparison: the current period as a filled line, the previous
 * period as a dashed line behind it, a total with its change, and a metric switcher. Rates use the mean, counts the sum.
 */
export function TimeSeriesPanel({
  metrics,
  data,
  previousData,
  title,
  description,
  metric: metricProp,
  defaultMetric,
  onMetricChange,
  compare: compareProp,
  defaultCompare = true,
  onCompareChange,
  referenceLines,
  dateFormat,
  chartClassName = "h-64",
  action,
  loading = false,
  error,
  onRetry,
  className,
  labels,
}: TimeSeriesPanelProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const { xAxis, yAxis } = useChartAxis();
  const id = useId();
  const [metricState, setMetricState] = useState(defaultMetric ?? metrics[0]?.id ?? "");
  const [compareState, setCompareState] = useState(defaultCompare);
  const metricId = metricProp ?? metricState;
  const compare = (compareProp ?? compareState) && !!previousData?.length;
  const active = metrics.find((m) => m.id === metricId) ?? metrics[0];

  const setMetric = (next: string) => {
    if (metricProp === undefined) setMetricState(next);
    onMetricChange?.(next);
  };
  const setCompare = (next: boolean) => {
    if (compareProp === undefined) setCompareState(next);
    onCompareChange?.(next);
  };

  const fmtDate = (date: string, withTime = hasTime(date)) =>
    formatDate(parseAnalyticsDay(date), locale, dateFormat ?? (withTime ? { month: "short", day: "numeric", hour: "numeric" } : { month: "short", day: "numeric" }));

  const rows = useMemo(() => {
    if (!active) return [];
    return data.map((p, i) => ({
      date: p.date,
      current: Number(p[active.id] ?? 0),
      previous: previousData?.[i] ? Number(previousData[i]?.[active.id] ?? 0) : undefined,
    }));
  }, [data, previousData, active]);

  const config: ChartConfig = {
    current: { label: active?.label, color: active?.color ?? "var(--primary)" },
    previous: { label: t.previousPeriod, color: "var(--muted-foreground)" },
  };

  const mode = active?.aggregate ?? "sum";
  const total = aggregate(
    rows.map((r) => r.current),
    mode,
  );
  const previousTotal = compare
    ? aggregate(
        rows.flatMap((r) => (r.previous === undefined ? [] : [r.previous])),
        mode,
      )
    : undefined;
  const delta = previousTotal === undefined ? undefined : changeRatio(total, previousTotal);
  const good = delta === undefined || delta === 0 ? undefined : delta > 0 !== !!active?.lowerIsBetter;
  const compact = (v: number) => formatNumber(v, locale, { notation: "compact", maximumFractionDigits: 1 });

  let body: ReactNode;
  if (error) {
    body = (
      <ErrorState
        title={typeof error === "string" ? error : t.loadError}
        actions={
          onRetry ? (
            <Button size="sm" onClick={onRetry}>
              {t.retry}
            </Button>
          ) : undefined
        }
      />
    );
  } else if (loading) {
    body = <Skeleton className={cn("w-full", chartClassName)} />;
  } else if (rows.length === 0 || !active) {
    body = <div className={cn("grid place-items-center text-body-sm text-muted-foreground", chartClassName)}>{t.empty}</div>;
  } else {
    const first = rows[0]?.date ?? "";
    const last = rows[rows.length - 1]?.date ?? "";
    body = (
      <ChartContainer config={config} label={t.chart(active.label, fmtDate(first, false), fmtDate(last, false))} className={cn("aspect-auto", chartClassName)}>
        <AreaChart data={rows} margin={{ left: 4, right: 4, top: 8 }}>
          <defs>
            <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-current)" stopOpacity={0.28} />
              <stop offset="100%" stopColor="var(--color-current)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} minTickGap={36} tickFormatter={(v: string) => fmtDate(v)} {...xAxis} />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={44}
            reversed={!!active.lowerIsBetter}
            domain={active.lowerIsBetter ? ["dataMin - 1", "dataMax + 1"] : [0, "auto"]}
            tickFormatter={(v: number) => (active.format?.style === "percent" ? formatNumber(v, locale, { style: "percent", maximumFractionDigits: 1 }) : compact(v))}
            {...yAxis}
          />
          <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={active.format} labelFormatter={(l) => fmtDate(String(l))} />} />
          {referenceLines?.map((r) => (
            <ReferenceLine
              key={r.label}
              y={r.value}
              stroke={lineColor[r.tone ?? "warning"]}
              strokeDasharray="2 4"
              label={{ value: r.label, position: "insideTopRight", fontSize: 11, fill: lineColor[r.tone ?? "warning"] }}
            />
          ))}
          {compare ? <Area dataKey="previous" type="monotone" stroke="var(--color-previous)" strokeDasharray="4 4" strokeWidth={1.5} fill="none" dot={false} isAnimationActive={false} /> : null}
          <Area dataKey="current" type="monotone" stroke="var(--color-current)" strokeWidth={2} fill={`url(#${id}-fill)`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ChartContainer>
    );
  }

  return (
    <Card data-slot="time-series-panel" aria-busy={loading || undefined} className={className}>
      <CardHeader>
        {title ? <CardTitle as="h3">{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {metrics.length > 1 ? (
            <div className="max-w-full overflow-x-auto">
              <ToggleGroup aria-label={t.metric} value={[active?.id ?? ""]} onValueChange={(v) => v[0] && setMetric(v[0])}>
                {metrics.map((m) => (
                  <Toggle key={m.id} value={m.id}>
                    {m.label}
                  </Toggle>
                ))}
              </ToggleGroup>
            </div>
          ) : null}
          {previousData?.length ? (
            <label className="flex items-center gap-2 text-body-sm text-muted-foreground">
              <Switch checked={compare} onCheckedChange={setCompare} />
              {t.compare}
            </label>
          ) : null}
        </div>
        {!loading && !error && active && rows.length > 0 ? (
          <div data-slot="time-series-total" className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-caption text-muted-foreground">{mode === "avg" ? t.average : t.total}</span>
            <span className="text-h2 text-foreground tabular-nums">
              <Num value={total} format={active.format ?? { maximumFractionDigits: 1 }} />
            </span>
            {delta !== undefined ? (
              <span className={cn("text-label", good === undefined ? "text-muted-foreground" : good ? "text-nq-success-text" : "text-nq-danger-text")}>
                <Num value={delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} />
              </span>
            ) : null}
          </div>
        ) : null}
        {body}
      </CardContent>
    </Card>
  );
}

export interface PeriodToggleProps {
  /** Period lengths in days. Default 7, 28, 90. */
  options?: readonly number[];
  value: number;
  onValueChange: (days: number) => void;
  className?: string;
  labels?: Partial<Pick<TimeSeriesPanelLabels, "period" | "lastDays">>;
}

/** Segmented "7 days / 28 days / 90 days" control that pages use to set the reporting period. */
export function PeriodToggle({ options = [7, 28, 90], value, onValueChange, className, labels }: PeriodToggleProps) {
  const t = useAnalyticsLabels(STRINGS, labels as Partial<TimeSeriesPanelLabels>);
  return (
    <ToggleGroup aria-label={t.period} className={className} value={[String(value)]} onValueChange={(v) => v[0] && onValueChange(Number(v[0]))}>
      {options.map((n) => (
        <Toggle key={n} value={String(n)}>
          {t.lastDays(n)}
        </Toggle>
      ))}
    </ToggleGroup>
  );
}
