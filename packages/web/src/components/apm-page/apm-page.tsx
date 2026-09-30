"use client";

import { useState } from "react";
import { Activity, AlertTriangle, Gauge, Timer } from "lucide-react";
import { AnalyticsPageFrame, type AnalyticsPageBaseProps, type AnalyticsPageFrameLabels } from "../analytics-connect";
import {
  type EndpointRow,
  EndpointTable,
  ErrorRatePanel,
  type ErrorRatePoint,
  LatencyPercentiles,
  type LatencyPoint,
  type LatencySummary,
  type TopError,
  TraceList,
  type TraceSummary,
} from "../apm-panels";
import { MetricTiles, type MetricTileData, formatMillis } from "../metric-tiles";
import { useAnalyticsAr, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { PeriodToggle, TimeSeriesPanel, type TimeSeriesPoint } from "../time-series-panel";

const STRINGS = {
  en: {
    title: "Application performance",
    description: (app: string) => `Latency, errors and traces for ${app}`,
    requests: "Requests",
    throughput: "Throughput (req/min)",
    p95: "p95 latency",
    errorRate: "Error rate",
    throughputTitle: "Throughput",
    throughputDescription: "Requests per minute",
    tabEndpoints: "Slow endpoints",
    tabTraces: "Traces",
    endpointsTitle: "Endpoints",
    endpointsDescription: "Sorted by p95. Slow ones are marked.",
    tracesTitle: "Recent traces",
    hours: (n: number) => (n === 1 ? "1 hour" : `${n} hours`),
    window: "Time window",
    benefits: ["Latency percentiles p50, p95 and p99", "Throughput and error rate", "Slow endpoints and request traces"],
  },
  ar: {
    title: "أداء التطبيق",
    description: (app: string) => `زمن الاستجابة والأخطاء والتتبّعات لـ ${app}`,
    requests: "الطلبات",
    throughput: "معدل الطلبات (في الدقيقة)",
    p95: "زمن الاستجابة p95",
    errorRate: "نسبة الأخطاء",
    throughputTitle: "معدل الطلبات",
    throughputDescription: "الطلبات في الدقيقة",
    tabEndpoints: "النقاط البطيئة",
    tabTraces: "التتبّعات",
    endpointsTitle: "نقاط النهاية",
    endpointsDescription: "مرتبة حسب p95. البطيئة منها معلّمة.",
    tracesTitle: "أحدث التتبّعات",
    hours: (n: number) => (n === 1 ? "ساعة" : n === 2 ? "ساعتان" : n <= 10 ? `${n} ساعات` : `${n} ساعة`),
    window: "النافذة الزمنية",
    benefits: ["نسب زمن الاستجابة p50 وp95 وp99", "معدل الطلبات ونسبة الأخطاء", "النقاط البطيئة وتتبّعات الطلبات"],
  },
};

export type ApmPageLabels = typeof STRINGS.en;

export interface ApmTotal {
  value: number;
  previous?: number;
  trend?: readonly number[];
}

export interface ApmData {
  summary: {
    requests: ApmTotal;
    /** Requests per minute. */
    throughput: ApmTotal;
    /** Milliseconds. */
    p95: ApmTotal;
    /** A fraction, 0.012 for 1.2%. */
    errorRate: ApmTotal;
  };
  latency: readonly LatencyPoint[];
  latencySummary?: LatencySummary;
  previousLatencySummary?: LatencySummary;
  errors: readonly ErrorRatePoint[];
  previousErrorRate?: number;
  topErrors?: readonly TopError[];
  /** One row per bucket with `rpm`. */
  throughput: readonly TimeSeriesPoint[];
  previousThroughput?: readonly TimeSeriesPoint[];
  endpoints: readonly EndpointRow[];
  traces: readonly TraceSummary[];
}

export interface ApmPageProps extends AnalyticsPageBaseProps {
  data?: ApmData;
  /** The application or service, for the subtitle. */
  app?: string;
  /** Latency in ms above which an endpoint or trace counts as slow. Default 1000. */
  slowMs?: number;
  /** Latency target in ms drawn on the latency chart. */
  targetMs?: number;
  /** Error-rate objective as a fraction, for example 0.01. */
  slo?: number;
  onEndpointClick?: (row: EndpointRow) => void;
  onErrorClick?: (error: TopError) => void;
  onTraceSelect?: (trace: TraceSummary | null) => void;
  /** Window lengths in hours for the toggle. Default 1, 6, 24. */
  windows?: readonly number[];
  labels?: Partial<ApmPageLabels>;
  frameLabels?: Partial<AnalyticsPageFrameLabels>;
}

const pct = { style: "percent", maximumFractionDigits: 2 } as const;

/**
 * The application performance report: request, throughput, p95 and error-rate tiles, latency percentiles, error rate with
 * its top errors, throughput, slow endpoints and a trace list with a span waterfall. `period` is a window in hours.
 */
export function ApmPage({ service, data, app, slowMs = 1000, targetMs, slo, period, onPeriodChange, windows = [1, 6, 24], loading, error, onRetry, onRefresh, refreshing, updatedAt, onConnect, onDisconnect, onSelectAccount, onEndpointClick, onErrorClick, onTraceSelect, className, labels, frameLabels }: ApmPageProps) {
  const t = useAnalyticsLabels(STRINGS, labels);
  const ar = useAnalyticsAr();
  const [tab, setTab] = useState("endpoints");
  const busy = loading || !data;
  const s = data?.summary;

  const tile = (id: string, label: string, total: ApmTotal | undefined, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total?.value ?? 0, previous: total?.previous, sparkline: total?.trend, ...extra });
  const tiles: MetricTileData[] = s
    ? [
        tile("requests", t.requests, s.requests, { format: { notation: "compact", maximumFractionDigits: 1 }, icon: <Activity aria-hidden /> }),
        tile("throughput", t.throughput, s.throughput, { format: { maximumFractionDigits: 0 }, icon: <Gauge aria-hidden /> }),
        tile("p95", t.p95, s.p95, { display: formatMillis(s.p95.value, ar), previousDisplay: s.p95.previous === undefined ? undefined : formatMillis(s.p95.previous, ar), invert: true, icon: <Timer aria-hidden /> }),
        tile("errorRate", t.errorRate, s.errorRate, { format: pct, invert: true, icon: <AlertTriangle aria-hidden /> }),
      ]
    : [];

  return (
    <AnalyticsPageFrame
      title={t.title}
      description={app ? t.description(app) : undefined}
      service={service}
      benefits={t.benefits}
      actions={<PeriodToggle options={windows} value={period} onValueChange={onPeriodChange} labels={{ period: t.window, lastDays: t.hours }} />}
      error={error}
      onRetry={onRetry}
      onRefresh={onRefresh}
      refreshing={refreshing}
      updatedAt={updatedAt}
      onConnect={onConnect}
      onDisconnect={onDisconnect}
      onSelectAccount={onSelectAccount}
      className={className}
      labels={frameLabels}
    >
      <MetricTiles metrics={tiles} loading={busy} />
      <div className="grid gap-4 xl:grid-cols-2">
        <LatencyPercentiles data={data?.latency ?? []} summary={data?.latencySummary} previous={data?.previousLatencySummary} targetMs={targetMs} loading={busy} />
        <ErrorRatePanel data={data?.errors ?? []} previousRate={data?.previousErrorRate} slo={slo} topErrors={data?.topErrors} onErrorClick={onErrorClick} loading={busy} />
      </div>
      <TimeSeriesPanel
        title={t.throughputTitle}
        description={t.throughputDescription}
        metrics={[{ id: "rpm", label: t.throughput, aggregate: "avg", format: { maximumFractionDigits: 0 } }]}
        data={data?.throughput ?? []}
        previousData={data?.previousThroughput}
        loading={busy}
      />
      <Tabs value={tab} onValueChange={(v) => setTab(String(v))}>
        <TabsList variant="underline">
          <TabsTab value="endpoints">{t.tabEndpoints}</TabsTab>
          <TabsTab value="traces">{t.tabTraces}</TabsTab>
        </TabsList>
        <TabsPanel value="endpoints">
          <EndpointTable title={t.endpointsTitle} description={t.endpointsDescription} rows={data?.endpoints ?? []} slowMs={slowMs} onRowClick={onEndpointClick} loading={busy} />
        </TabsPanel>
        <TabsPanel value="traces">
          <TraceList title={t.tracesTitle} traces={data?.traces ?? []} slowMs={slowMs} onSelect={onTraceSelect} loading={busy} />
        </TabsPanel>
      </Tabs>
    </AnalyticsPageFrame>
  );
}
