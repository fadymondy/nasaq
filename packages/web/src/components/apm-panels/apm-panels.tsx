"use client";

import { AlertTriangle } from "lucide-react";
import { type CSSProperties, type ReactNode, useMemo, useState } from "react";
import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis, Area, AreaChart } from "recharts";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { changeRatio, formatMillis, parseAnalyticsDay, useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "../card";
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, useChartAxis } from "../chart";
import { type DataTableColumn, DataTable, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DateTime, type FormatDateOptions, formatDate, formatNumber, Num } from "../numeric";
import { ErrorState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { errorRate, percentile, spanDepths, statusClass, traceExtent } from "./apm-math";

export * from "./apm-math";

const STRINGS = {
  en: {
    latency: "Latency",
    latencyDescription: "Response time percentiles",
    p50: "p50",
    p95: "p95",
    p99: "p99",
    median: "Median",
    slowest5: "Slowest 5%",
    slowest1: "Slowest 1%",
    target: "Target",
    vsPrevious: "vs previous period",
    errorRate: "Error rate",
    errorDescription: "Failed requests as a share of all requests",
    errors: "Errors",
    requests: "Requests",
    slo: "Error budget",
    withinSlo: "Within target",
    overSlo: "Over target",
    topErrors: "Top errors",
    occurrences: (n: number) => (n === 1 ? "1 time" : `${n} times`),
    lastSeen: "Last seen",
    noErrors: "No errors in this period",
    empty: "No data for this period",
    loadError: "This panel could not be loaded.",
    retry: "Try again",
    endpoints: "Slowest endpoints",
    endpointsDescription: "Sorted by the 95th percentile by default",
    endpoint: "Endpoint",
    throughput: "Throughput",
    perMinute: "req/min",
    filterEndpoints: "Filter endpoints…",
    slow: "Slow",
    traces: "Traces",
    tracesDescription: "Recent requests, slowest first",
    trace: "Trace",
    duration: "Duration",
    status: "Status",
    started: "Started",
    spans: (n: number) => (n === 1 ? "1 span" : `${n} spans`),
    services: "Service",
    waterfall: "Span waterfall",
    waterfallOf: (name: string) => `Spans of ${name}`,
    span: "Span",
    close: "Close",
    noTraces: "No traces match",
    failed: "Failed",
    chartLatency: "Latency percentiles over time",
    chartErrors: "Error rate over time",
    selectTrace: (name: string) => `Show spans for ${name}`,
  },
  ar: {
    latency: "زمن الاستجابة",
    latencyDescription: "نسب زمن الاستجابة المئوية",
    p50: "p50",
    p95: "p95",
    p99: "p99",
    median: "الوسيط",
    slowest5: "أبطأ 5%",
    slowest1: "أبطأ 1%",
    target: "الهدف",
    vsPrevious: "مقارنة بالفترة السابقة",
    errorRate: "معدل الأخطاء",
    errorDescription: "الطلبات الفاشلة كنسبة من كل الطلبات",
    errors: "الأخطاء",
    requests: "الطلبات",
    slo: "ميزانية الأخطاء",
    withinSlo: "ضمن الهدف",
    overSlo: "فوق الهدف",
    topErrors: "أكثر الأخطاء",
    occurrences: (n: number) => (n === 1 ? "مرة واحدة" : `${n} مرات`),
    lastSeen: "آخر ظهور",
    noErrors: "لا أخطاء في هذه الفترة",
    empty: "لا بيانات لهذه الفترة",
    loadError: "تعذّر تحميل هذه اللوحة.",
    retry: "حاول مرة أخرى",
    endpoints: "أبطأ نقاط النهاية",
    endpointsDescription: "مرتبة افتراضيًا حسب المئين 95",
    endpoint: "نقطة النهاية",
    throughput: "معدل الطلبات",
    perMinute: "طلب/دقيقة",
    filterEndpoints: "تصفية نقاط النهاية…",
    slow: "بطيء",
    traces: "التتبعات",
    tracesDescription: "أحدث الطلبات، الأبطأ أولًا",
    trace: "التتبع",
    duration: "المدة",
    status: "الحالة",
    started: "البدء",
    spans: (n: number) => (n === 1 ? "مقطع واحد" : `${n} مقاطع`),
    services: "الخدمة",
    waterfall: "شلال المقاطع",
    waterfallOf: (name: string) => `مقاطع ${name}`,
    span: "المقطع",
    close: "إغلاق",
    noTraces: "لا تتبعات مطابقة",
    failed: "فشل",
    chartLatency: "نسب زمن الاستجابة عبر الوقت",
    chartErrors: "معدل الأخطاء عبر الوقت",
    selectTrace: (name: string) => `عرض مقاطع ${name}`,
  },
};

export type ApmPanelsLabels = typeof STRINGS.en;

const timeFormat: FormatDateOptions = { hour: "numeric", minute: "2-digit" };

/* ------------------------------------------------------------------------------------------------ latency */

export interface LatencyPoint {
  /** ISO time of the bucket, e.g. "2026-09-29T10:15". */
  time: string;
  /** Milliseconds. */
  p50: number;
  p95: number;
  p99: number;
}

export interface LatencySummary {
  p50: number;
  p95: number;
  p99: number;
}

export interface LatencyPercentilesProps {
  data: readonly LatencyPoint[];
  /** The percentiles over the whole period. Default: the 50th, 95th and 99th percentile of the buckets shown. */
  summary?: LatencySummary;
  /** The same for the previous period, for the change. Lower is better. */
  previous?: LatencySummary;
  /** A latency target in milliseconds for p95, drawn as a guide line. */
  targetMs?: number;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<ApmPanelsLabels>;
}

const latencyConfig = (t: ApmPanelsLabels): ChartConfig => ({
  p50: { label: t.p50, color: "var(--nq-tag-teal)" },
  p95: { label: t.p95, color: "var(--nq-tag-amber)" },
  p99: { label: t.p99, color: "var(--nq-tag-pink)" },
});

function PanelBody({ error, loading, empty, onRetry, t, height, children }: { error?: ReactNode; loading?: boolean; empty?: boolean; onRetry?: () => void; t: ApmPanelsLabels; height: string; children: ReactNode }) {
  if (error) {
    return (
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
  }
  if (loading) return <Skeleton className={cn("w-full", height)} />;
  if (empty) return <div className={cn("grid place-items-center text-body-sm text-muted-foreground", height)}>{t.empty}</div>;
  return <>{children}</>;
}

/**
 * The p50, p95 and p99 response time as three headline figures (with the change against the previous period, lower is
 * better) and one line chart over time, with an optional p95 target guide.
 */
export function LatencyPercentiles({ data, summary, previous, targetMs, title, description, action, loading, error, onRetry, className, labels }: LatencyPercentilesProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const locale = useOptionalNasaq()?.locale ?? "en";
  const { xAxis, yAxis } = useChartAxis();
  const config = latencyConfig(t);
  const figures = useMemo<LatencySummary>(
    () =>
      summary ?? {
        p50: percentile(data.map((d) => d.p50), 50),
        p95: percentile(data.map((d) => d.p95), 95),
        p99: percentile(data.map((d) => d.p99), 99),
      },
    [summary, data],
  );
  const items = [
    { id: "p50", label: t.p50, hint: t.median, value: figures.p50, prev: previous?.p50 },
    { id: "p95", label: t.p95, hint: t.slowest5, value: figures.p95, prev: previous?.p95 },
    { id: "p99", label: t.p99, hint: t.slowest1, value: figures.p99, prev: previous?.p99 },
  ] as const;
  const fmtTime = (v: string) => formatDate(parseAnalyticsDay(v), locale, timeFormat);

  return (
    <Card data-slot="latency-percentiles" aria-busy={loading || undefined} className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.latency}</CardTitle>
        <CardDescription>{description ?? t.latencyDescription}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-3 gap-3">
          {items.map((i) => {
            const d = changeRatio(i.value, i.prev);
            return (
              <div key={i.id} data-percentile={i.id} className="flex min-w-0 flex-col gap-0.5 rounded-control border border-border px-3 py-2">
                <dt className="flex items-center gap-1.5 text-caption text-muted-foreground">
                  <span aria-hidden className="size-2 rounded-full" style={{ background: config[i.id]?.color }} />
                  <bdi dir="ltr" className="text-label text-foreground">
                    {i.label}
                  </bdi>
                  <span className="hidden truncate sm:inline">{i.hint}</span>
                </dt>
                <dd className="text-h3 text-foreground tabular-nums" dir="ltr">
                  {formatMillis(i.value, ar)}
                </dd>
                {d !== undefined ? (
                  <dd className={cn("text-caption", d === 0 ? "text-muted-foreground" : d < 0 ? "text-nq-success-text" : "text-nq-danger-text")}>
                    <Num value={d} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} /> <span className="text-muted-foreground">{t.vsPrevious}</span>
                  </dd>
                ) : null}
              </div>
            );
          })}
        </dl>
        <PanelBody error={error} loading={loading} empty={data.length === 0} onRetry={onRetry} t={t} height="h-64">
          <ChartContainer config={config} label={t.chartLatency} className="aspect-auto h-64">
            <LineChart data={[...data]} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={fmtTime} {...xAxis} />
              <YAxis tickLine={false} axisLine={false} width={48} tickFormatter={(v: number) => formatNumber(v, locale, { notation: "compact" })} {...yAxis} />
              <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={{ maximumFractionDigits: 0 }} labelFormatter={(l) => fmtTime(String(l))} />} />
              {targetMs ? <ReferenceLine y={targetMs} stroke="var(--nq-warning)" strokeDasharray="2 4" label={{ value: `${t.target} ${t.p95} ${targetMs}`, position: "insideTopRight", fontSize: 11, fill: "var(--nq-warning)" }} /> : null}
              <Line dataKey="p50" type="monotone" stroke="var(--color-p50)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="p95" type="monotone" stroke="var(--color-p95)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="p99" type="monotone" stroke="var(--color-p99)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ChartContainer>
        </PanelBody>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ errors */

export interface ErrorRatePoint {
  time: string;
  requests: number;
  errors: number;
}

export interface TopError {
  id: string;
  /** The error message or class. Shown as code, left-to-right. */
  message: string;
  count: number;
  /** Where it happens: "POST /api/checkout". */
  endpoint?: string;
  lastSeenAt?: number | Date | string;
}

export interface ErrorRatePanelProps {
  data: readonly ErrorRatePoint[];
  /** The previous period's overall rate as a fraction, for the change. */
  previousRate?: number;
  /** Error-rate objective as a fraction, for example 0.01 for 1%. Drawn as a guide, and the headline says within or over. */
  slo?: number;
  topErrors?: readonly TopError[];
  onErrorClick?: (error: TopError) => void;
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<ApmPanelsLabels>;
}

/**
 * Error rate over time with the overall rate as a headline (toned against an optional objective, with an icon and a word),
 * the total errors and requests, and the most frequent errors.
 */
export function ErrorRatePanel({ data, previousRate, slo, topErrors, onErrorClick, title, description, action, loading, error, onRetry, className, labels }: ErrorRatePanelProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const locale = useOptionalNasaq()?.locale ?? "en";
  const { xAxis, yAxis } = useChartAxis();
  const totals = useMemo(() => data.reduce((a, d) => ({ requests: a.requests + d.requests, errors: a.errors + d.errors }), { requests: 0, errors: 0 }), [data]);
  const overall = errorRate(totals.errors, totals.requests);
  const rows = useMemo(() => data.map((d) => ({ time: d.time, rate: errorRate(d.errors, d.requests) })), [data]);
  const delta = changeRatio(overall, previousRate);
  const over = slo !== undefined && overall > slo;
  const config: ChartConfig = { rate: { label: t.errorRate, color: "var(--nq-danger)" } };
  const fmtTime = (v: string) => formatDate(parseAnalyticsDay(v), locale, timeFormat);
  const pct = { style: "percent", maximumFractionDigits: 2 } as const;

  return (
    <Card data-slot="error-rate-panel" data-over-slo={slo === undefined ? undefined : over} aria-busy={loading || undefined} className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.errorRate}</CardTitle>
        <CardDescription>{description ?? t.errorDescription}</CardDescription>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {!loading && !error && data.length > 0 ? (
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className="text-h1 text-foreground tabular-nums">
                <Num value={overall} format={pct} />
              </span>
              {delta !== undefined ? (
                <span className={cn("text-label", delta === 0 ? "text-muted-foreground" : delta < 0 ? "text-nq-success-text" : "text-nq-danger-text")}>
                  <Num value={delta} format={{ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero" }} /> <span className="font-normal text-muted-foreground">{t.vsPrevious}</span>
                </span>
              ) : null}
              {slo !== undefined ? (
                <Status tone={over ? "danger" : "success"} tinted>
                  {over ? t.overSlo : t.withinSlo}
                </Status>
              ) : null}
            </div>
            <dl className="flex gap-5 text-caption text-muted-foreground">
              <div>
                <dt>{t.errors}</dt>
                <dd className="text-body-sm text-foreground tabular-nums">
                  <Num value={totals.errors} />
                </dd>
              </div>
              <div>
                <dt>{t.requests}</dt>
                <dd className="text-body-sm text-foreground tabular-nums">
                  <Num value={totals.requests} />
                </dd>
              </div>
            </dl>
          </div>
        ) : null}
        <PanelBody error={error} loading={loading} empty={data.length === 0} onRetry={onRetry} t={t} height="h-52">
          <ChartContainer config={config} label={t.chartErrors} className="aspect-auto h-52">
            <AreaChart data={rows} margin={{ left: 4, right: 4, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="time" tickLine={false} axisLine={false} tickMargin={8} minTickGap={40} tickFormatter={fmtTime} {...xAxis} />
              <YAxis tickLine={false} axisLine={false} width={44} domain={[0, "auto"]} tickFormatter={(v: number) => formatNumber(v, locale, { style: "percent", maximumFractionDigits: 1 })} {...yAxis} />
              <ChartTooltip content={<ChartTooltipContent config={config} valueFormat={pct} labelFormatter={(l) => fmtTime(String(l))} />} />
              {slo !== undefined ? <ReferenceLine y={slo} stroke="var(--nq-warning)" strokeDasharray="2 4" label={{ value: t.slo, position: "insideTopRight", fontSize: 11, fill: "var(--nq-warning)" }} /> : null}
              <Area dataKey="rate" type="monotone" stroke="var(--color-rate)" fill="var(--color-rate)" fillOpacity={0.14} strokeWidth={2} dot={false} isAnimationActive={false} />
            </AreaChart>
          </ChartContainer>
        </PanelBody>
        {topErrors ? (
          <section aria-label={t.topErrors} className="flex flex-col gap-2">
            <h4 className="text-label text-muted-foreground">{t.topErrors}</h4>
            {topErrors.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">{t.noErrors}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
                {topErrors.map((e) => {
                  const inner = (
                    <>
                      <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-nq-danger-text" />
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                        <bdi dir="ltr" className="truncate font-mono text-code text-foreground">
                          {e.message}
                        </bdi>
                        <span className="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                          {e.endpoint ? <bdi dir="ltr">{e.endpoint}</bdi> : null}
                          {e.lastSeenAt !== undefined ? (
                            <span>
                              {t.lastSeen} <DateTime value={e.lastSeenAt} relative />
                            </span>
                          ) : null}
                        </span>
                      </span>
                      <Badge variant="danger">{t.occurrences(e.count)}</Badge>
                    </>
                  );
                  return (
                    <li key={e.id}>
                      {onErrorClick ? (
                        <button type="button" onClick={() => onErrorClick(e)} className="flex w-full items-start gap-2.5 px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-nq-focus">
                          {inner}
                        </button>
                      ) : (
                        <div className="flex items-start gap-2.5 px-3 py-2">{inner}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ endpoints */

export interface EndpointRow {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | (string & {});
  /** Route pattern: "/api/orders/:id". */
  route: string;
  requests: number;
  /** Requests per minute. */
  throughput?: number;
  p50: number;
  p95: number;
  /** Fraction of requests that failed. */
  errorRate: number;
}

export interface EndpointTableProps {
  rows: readonly EndpointRow[];
  /** Milliseconds; endpoints with a p95 above this are flagged Slow. Default 1000. */
  slowMs?: number;
  onRowClick?: (row: EndpointRow) => void;
  title?: ReactNode;
  description?: ReactNode;
  pageSize?: number;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<ApmPanelsLabels>;
}

/** Endpoints with request count, p50, p95 and error rate, sortable and searchable, the slowest first; slow ones are flagged. */
export function EndpointTable({ rows, slowMs = 1000, onRowClick, title, description, pageSize = 8, loading, error, onRetry, className, labels }: EndpointTableProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const columns = useMemo<DataTableColumn<EndpointRow>[]>(
    () => [
      {
        id: "route",
        header: t.endpoint,
        label: t.endpoint,
        sortValue: (r) => r.route,
        searchValue: (r) => `${r.method} ${r.route}`,
        cell: (r) => (
          <bdi dir="ltr" className="flex max-w-[30ch] items-center gap-2 sm:max-w-[44ch]">
            <Badge variant="outline" className="font-mono">
              {r.method}
            </Badge>
            <span className="truncate font-mono text-code">{r.route}</span>
          </bdi>
        ),
      },
      { id: "requests", header: t.requests, label: t.requests, align: "end", sortValue: (r) => r.requests, cell: (r) => <Num value={r.requests} format={{ notation: "compact", maximumFractionDigits: 1 }} /> },
      { id: "p50", header: t.p50, label: t.p50, align: "end", sortValue: (r) => r.p50, cell: (r) => <bdi dir="ltr">{formatMillis(r.p50, ar)}</bdi> },
      {
        id: "p95",
        header: t.p95,
        label: t.p95,
        align: "end",
        sortValue: (r) => r.p95,
        cell: (r) => (
          <span className="inline-flex items-center justify-end gap-2">
            {r.p95 > slowMs ? <Status tone="warning" tinted className="text-caption">{t.slow}</Status> : null}
            <bdi dir="ltr">{formatMillis(r.p95, ar)}</bdi>
          </span>
        ),
      },
      {
        id: "errorRate",
        header: t.errorRate,
        label: t.errorRate,
        align: "end",
        sortValue: (r) => r.errorRate,
        cell: (r) => <Num value={r.errorRate} format={{ style: "percent", maximumFractionDigits: 2 }} className={r.errorRate >= 0.05 ? "text-nq-danger-text" : undefined} />,
      },
    ],
    [t, ar, slowMs],
  );
  const table = useDataTable({ data: [...rows], columns, getRowId: (r) => r.id, pageSize, defaultSort: { id: "p95", direction: "desc" } });
  return (
    <Card data-slot="endpoint-table" className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.endpoints}</CardTitle>
        <CardDescription>{description ?? t.endpointsDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <DataTableToolbar>
          <DataTableSearch table={table} placeholder={t.filterEndpoints} />
        </DataTableToolbar>
        <DataTable table={table} label={t.endpoints} loading={loading} error={error} onRetry={onRetry} empty={t.empty} onRowClick={onRowClick} />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------------------------------------ traces */

export interface TraceSpan {
  id: string;
  parentId?: string;
  name: string;
  /** Service that ran it: "api", "postgres", "redis". */
  service: string;
  /** Milliseconds from the start of the trace. */
  startMs: number;
  durationMs: number;
  error?: boolean;
}

export interface TraceSummary {
  id: string;
  method: string;
  /** Route or operation name: "/api/checkout". */
  name: string;
  /** HTTP status of the root request. */
  status: number;
  durationMs: number;
  startedAt: number | Date | string;
  service?: string;
  spans?: readonly TraceSpan[];
}

export interface TraceListProps {
  traces: readonly TraceSummary[];
  /** Selected trace id (controlled). Selecting a trace with `spans` shows its waterfall. */
  selectedId?: string | null;
  defaultSelectedId?: string | null;
  onSelect?: (trace: TraceSummary | null) => void;
  /** Milliseconds above which a trace's bar is toned as slow. Default 1000. */
  slowMs?: number;
  title?: ReactNode;
  description?: ReactNode;
  loading?: boolean;
  error?: ReactNode;
  onRetry?: () => void;
  className?: string;
  labels?: Partial<ApmPanelsLabels>;
}

const classTone: Record<ReturnType<typeof statusClass>, StatusTone> = { "2xx": "success", "3xx": "info", "4xx": "warning", "5xx": "danger", other: "neutral" };

/** The waterfall of one trace: each span is a bar placed by start time and sized by duration, indented under its parent. */
function TraceWaterfall({ trace, t, ar }: { trace: TraceSummary; t: ApmPanelsLabels; ar: boolean }) {
  const spans = [...(trace.spans ?? [])].sort((a, b) => a.startMs - b.startMs);
  const depths = spanDepths(spans);
  const origin = spans.length ? Math.min(...spans.map((s) => s.startMs)) : 0;
  const extent = Math.max(1, traceExtent(spans));
  return (
    <section data-slot="trace-waterfall" aria-label={t.waterfallOf(trace.name)} className="flex flex-col gap-2 rounded-control border border-border p-3">
      <h4 className="text-label text-foreground">{t.waterfall}</h4>
      <ul className="flex flex-col gap-1.5">
        {spans.map((s) => {
          const left = ((s.startMs - origin) / extent) * 100;
          const width = Math.max(0.8, (s.durationMs / extent) * 100);
          return (
            <li key={s.id} className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 sm:grid-cols-[minmax(0,14rem)_1fr]" style={{ "--depth": depths.get(s.id) ?? 0 } as CSSProperties}>
              <div className="min-w-0 ps-[calc(var(--depth)*0.75rem)]">
                <bdi dir="ltr" className="block truncate font-mono text-code text-foreground">
                  {s.name}
                </bdi>
                <span className="block truncate text-caption text-muted-foreground" dir="ltr">
                  {s.service}
                </span>
              </div>
              <div className="relative h-5 rounded-control bg-nq-surface-soft" role="img" aria-label={`${s.name}, ${formatMillis(s.durationMs, ar)}${s.error ? `, ${t.failed}` : ""}`}>
                <span
                  className={cn("absolute inset-y-0.5 flex items-center rounded-[3px] px-1 text-caption", s.error ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground")}
                  style={{ insetInlineStart: `${left}%`, width: `${Math.min(width, 100 - left)}%` }}
                />
                <span className="absolute inset-y-0 flex items-center text-caption text-foreground tabular-nums" style={{ insetInlineStart: `${Math.min(left + width + 1, 82)}%` }} dir="ltr">
                  {formatMillis(s.durationMs, ar)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/**
 * Recent requests as rows: method, route, status (class word, not colour alone), duration with a bar sized against the
 * slowest, and when it started. Choosing a trace that carries spans opens its waterfall under the list.
 */
export function TraceList({ traces, selectedId: selectedProp, defaultSelectedId = null, onSelect, slowMs = 1000, title, description, loading, error, onRetry, className, labels }: TraceListProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const [selectedState, setSelectedState] = useState<string | null>(defaultSelectedId);
  const selectedId = selectedProp === undefined ? selectedState : selectedProp;
  const selected = traces.find((x) => x.id === selectedId) ?? null;
  const sorted = useMemo(() => [...traces].sort((a, b) => b.durationMs - a.durationMs), [traces]);
  const max = sorted[0]?.durationMs ?? 0;

  const choose = (trace: TraceSummary) => {
    const next = trace.id === selectedId ? null : trace;
    if (selectedProp === undefined) setSelectedState(next?.id ?? null);
    onSelect?.(next);
  };

  return (
    <Card data-slot="trace-list" aria-busy={loading || undefined} className={className}>
      <CardHeader>
        <CardTitle as="h3">{title ?? t.traces}</CardTitle>
        <CardDescription>{description ?? t.tracesDescription}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <PanelBody error={error} loading={loading} empty={traces.length === 0} onRetry={onRetry} t={t} height="h-40">
          <ul className="flex flex-col divide-y divide-border rounded-control border border-border">
            {sorted.map((trace) => {
              const cls = statusClass(trace.status);
              const open = trace.id === selectedId;
              const slow = trace.durationMs > slowMs;
              return (
                <li key={trace.id}>
                  <button
                    type="button"
                    aria-pressed={open}
                    aria-label={t.selectTrace(`${trace.method} ${trace.name}`)}
                    onClick={() => choose(trace)}
                    className={cn("grid w-full grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-3 py-2 text-start outline-none hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus sm:grid-cols-[minmax(0,1fr)_10rem_auto]", open && "bg-muted")}
                  >
                    <span className="flex min-w-0 flex-col gap-1">
                      <bdi dir="ltr" className="flex min-w-0 items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          {trace.method}
                        </Badge>
                        <span className="truncate font-mono text-code text-foreground">{trace.name}</span>
                      </bdi>
                      <span className="flex flex-wrap items-center gap-x-3 text-caption text-muted-foreground">
                        <Status tone={classTone[cls]} className="text-caption">
                          <bdi dir="ltr">{trace.status}</bdi>
                        </Status>
                        <DateTime value={trace.startedAt} relative />
                        {trace.spans ? <span>{t.spans(trace.spans.length)}</span> : null}
                        {trace.service ? <bdi dir="ltr">{trace.service}</bdi> : null}
                      </span>
                    </span>
                    <span className="hidden sm:block" aria-hidden>
                      <span className="block h-2 rounded-full bg-nq-surface-soft">
                        <span className={cn("block h-full rounded-full", cls === "5xx" ? "bg-nq-danger" : slow ? "bg-nq-warning" : "bg-primary")} style={{ width: `${max > 0 ? Math.max(3, (trace.durationMs / max) * 100) : 0}%` }} />
                      </span>
                    </span>
                    <span className={cn("text-label tabular-nums", slow ? "text-nq-warning-text" : "text-foreground")} dir="ltr">
                      {formatMillis(trace.durationMs, ar)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </PanelBody>
        {selected?.spans?.length ? <TraceWaterfall trace={selected} t={t} ar={ar} /> : null}
      </CardContent>
    </Card>
  );
}
