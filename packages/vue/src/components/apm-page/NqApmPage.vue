<script setup lang="ts">
import { Activity, AlertTriangle, Gauge, Timer } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAnalyticsPageFrame, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { NqEndpointTable, NqErrorRatePanel, NqLatencyPercentiles, NqTraceList } from "../apm-panels";
import type { EndpointRow, ErrorRatePoint, LatencyPoint, LatencySummary, TopError, TraceSummary } from "../apm-panels";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { NqMetricTiles, formatMillis, type MetricTileData } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesPoint } from "../time-series-panel";

// The application performance report: request, throughput, p95 and error-rate tiles, latency percentiles, error rate with
// its top errors, throughput, slow endpoints and a trace list with a span waterfall. `period` is a window in hours.
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

const props = withDefaults(
  defineProps<{
    /** The data source and its connection state. Anything but "connected" shows the connect screen. */
    service: IntegrationService;
    data?: ApmData;
    /** The application or service, for the subtitle. */
    app?: string;
    /** Latency in ms above which an endpoint or trace counts as slow. Default 1000. */
    slowMs?: number;
    /** Latency target in ms drawn on the latency chart. */
    targetMs?: number;
    /** Error-rate objective as a fraction, for example 0.01. */
    slo?: number;
    /** The window in hours (`v-model:period`). */
    period: number;
    /** Window lengths in hours for the toggle. Default 1, 6, 24. */
    windows?: readonly number[];
    loading?: boolean;
    /** Replace the report with an error and a retry button. */
    error?: string;
    onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
    onDisconnect: (id: string) => Promise<IntegrationResult>;
    onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
    onRetry?: () => void;
    onRefresh?: () => void | Promise<void>;
    refreshing?: boolean;
    updatedAt?: number | Date | string;
    onEndpointClick?: (row: EndpointRow) => void;
    onErrorClick?: (error: TopError) => void;
    onTraceSelect?: (trace: TraceSummary | null) => void;
    labels?: Partial<ApmPageLabels>;
    frameLabels?: Partial<AnalyticsPageFrameLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    data: undefined,
    app: undefined,
    slowMs: 1000,
    targetMs: undefined,
    slo: undefined,
    windows: () => [1, 6, 24],
    loading: false,
    error: undefined,
    onSelectAccount: undefined,
    onRetry: undefined,
    onRefresh: undefined,
    refreshing: false,
    updatedAt: undefined,
    onEndpointClick: undefined,
    onErrorClick: undefined,
    onTraceSelect: undefined,
    labels: undefined,
    frameLabels: undefined,
  },
);
const emit = defineEmits<{ "update:period": [hours: number] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const tab = ref("endpoints");
const busy = computed(() => props.loading || !props.data);
const pct = { style: "percent", maximumFractionDigits: 2 } as const;

const tiles = computed<MetricTileData[]>(() => {
  const s = props.data?.summary;
  if (!s) return [];
  const tile = (id: string, label: string, total: ApmTotal, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total.value, previous: total.previous, sparkline: total.trend, ...extra });
  return [
    tile("requests", t.value.requests, s.requests, { format: { notation: "compact", maximumFractionDigits: 1 }, icon: Activity }),
    tile("throughput", t.value.throughput, s.throughput, { format: { maximumFractionDigits: 0 }, icon: Gauge }),
    tile("p95", t.value.p95, s.p95, {
      display: formatMillis(s.p95.value, ar.value),
      previousDisplay: s.p95.previous === undefined ? undefined : formatMillis(s.p95.previous, ar.value),
      invert: true,
      icon: Timer,
    }),
    tile("errorRate", t.value.errorRate, s.errorRate, { format: pct, invert: true, icon: AlertTriangle }),
  ];
});
</script>

<template>
  <NqAnalyticsPageFrame
    :title="t.title"
    :description="app ? t.description(app) : undefined"
    :service="service"
    :benefits="t.benefits"
    :error="error"
    :on-retry="onRetry"
    :on-refresh="onRefresh"
    :refreshing="refreshing"
    :updated-at="updatedAt"
    :on-connect="onConnect"
    :on-disconnect="onDisconnect"
    :on-select-account="onSelectAccount"
    :labels="frameLabels"
    :class="props.class"
  >
    <template #actions>
      <NqPeriodToggle :options="windows" :model-value="period" :labels="{ period: t.window, lastDays: t.hours }" @update:model-value="(v) => emit('update:period', v)" />
    </template>
    <NqMetricTiles :metrics="tiles" :loading="busy" />
    <div class="grid gap-4 xl:grid-cols-2">
      <NqLatencyPercentiles :data="data?.latency ?? []" :summary="data?.latencySummary" :previous="data?.previousLatencySummary" :target-ms="targetMs" :loading="busy" />
      <NqErrorRatePanel :data="data?.errors ?? []" :previous-rate="data?.previousErrorRate" :slo="slo" :top-errors="data?.topErrors" :on-error-click="onErrorClick" :loading="busy" />
    </div>
    <NqTimeSeriesPanel
      :title="t.throughputTitle"
      :description="t.throughputDescription"
      :metrics="[{ id: 'rpm', label: t.throughput, aggregate: 'avg', format: { maximumFractionDigits: 0 } }]"
      :data="data?.throughput ?? []"
      :previous-data="data?.previousThroughput"
      :loading="busy"
    />
    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="endpoints">{{ t.tabEndpoints }}</NqTabsTab>
        <NqTabsTab value="traces">{{ t.tabTraces }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="endpoints">
        <NqEndpointTable :title="t.endpointsTitle" :description="t.endpointsDescription" :rows="data?.endpoints ?? []" :slow-ms="slowMs" :on-row-click="onEndpointClick" :loading="busy" />
      </NqTabsPanel>
      <NqTabsPanel value="traces">
        <NqTraceList :title="t.tracesTitle" :traces="data?.traces ?? []" :slow-ms="slowMs" :on-select="onTraceSelect" :loading="busy" />
      </NqTabsPanel>
    </NqTabs>
  </NqAnalyticsPageFrame>
</template>
