<script setup lang="ts">
import { Eye, MousePointerClick, Percent, TrendingUp } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { NqAnalyticsPageFrame, activeAccountName, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { NqBreakdownTable, type BreakdownRow } from "../breakdown-table";
import { NqGeoList, type GeoRow } from "../geo-list";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { NqMetricTiles, type MetricTileData } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqSearchPerformanceTable, type SearchPerformanceRow } from "../search-performance-table";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesMetric, type TimeSeriesPoint } from "../time-series-panel";

// The Search Console report: clicks, impressions, CTR and position tiles that also pick the chart's metric, then tabs of
// queries, pages, countries and devices. Shows the connect screen until `service` is connected.
const STRINGS = {
  en: {
    title: "Search Console",
    description: (site: string) => `How ${site} performs in Google Search`,
    clicks: "Total clicks",
    impressions: "Total impressions",
    ctr: "Average CTR",
    position: "Average position",
    chartTitle: "Performance",
    chartDescription: "Select a tile to chart it. Average position improves as it gets lower.",
    tabQueries: "Queries",
    tabPages: "Pages",
    tabCountries: "Countries",
    tabDevices: "Devices",
    countries: "Countries",
    devices: "Devices",
    device: "Device",
    clicksShort: "Clicks",
    benefits: ["Clicks, impressions, CTR and average position", "The queries and pages that bring searchers", "Countries and devices"],
  },
  ar: {
    title: "Search Console",
    description: (site: string) => `أداء ${site} في بحث Google`,
    clicks: "إجمالي النقرات",
    impressions: "إجمالي مرات الظهور",
    ctr: "متوسط نسبة النقر",
    position: "متوسط الترتيب",
    chartTitle: "الأداء",
    chartDescription: "اختر بطاقة لعرضها في الرسم. يتحسن متوسط الترتيب كلما قلّ الرقم.",
    tabQueries: "عبارات البحث",
    tabPages: "الصفحات",
    tabCountries: "الدول",
    tabDevices: "الأجهزة",
    countries: "الدول",
    devices: "الأجهزة",
    device: "الجهاز",
    clicksShort: "النقرات",
    benefits: ["النقرات ومرات الظهور ونسبة النقر ومتوسط الترتيب", "عبارات البحث والصفحات التي تجلب الزوار", "الدول والأجهزة"],
  },
};

export type SearchConsolePageLabels = typeof STRINGS.en;

export interface SearchConsoleTotal {
  value: number;
  previous?: number;
  trend?: readonly number[];
}

export interface SearchConsoleData {
  summary: {
    clicks: SearchConsoleTotal;
    impressions: SearchConsoleTotal;
    /** A fraction, 0.034 for 3.4%. */
    ctr: SearchConsoleTotal;
    /** Average position. Lower is better. */
    position: SearchConsoleTotal;
  };
  /** One row per day with `clicks`, `impressions`, `ctr` and `position`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  queries: readonly SearchPerformanceRow[];
  pages: readonly SearchPerformanceRow[];
  /** Clicks per country. */
  countries: readonly GeoRow[];
  /** Clicks per device. */
  devices: readonly BreakdownRow[];
}

const pct = { style: "percent", maximumFractionDigits: 1 } as const;
const one = { maximumFractionDigits: 1 } as const;

const props = withDefaults(
  defineProps<{
    /** The data source and its connection state. Anything but "connected" shows the connect screen. */
    service: IntegrationService;
    data?: SearchConsoleData;
    /** The verified site, for the subtitle. */
    site?: string;
    /** Reporting period in days (`v-model:period`). */
    period: number;
    loading?: boolean;
    error?: string;
    onConnect: (id: string, scopeIds: string[]) => Promise<IntegrationResult>;
    onDisconnect: (id: string) => Promise<IntegrationResult>;
    onSelectAccount?: (id: string, accountId: string) => Promise<IntegrationResult>;
    onRetry?: () => void;
    onRefresh?: () => void | Promise<void>;
    refreshing?: boolean;
    updatedAt?: number | Date | string;
    /** Called when a query or page row is chosen, for example to open a detail view. */
    onRowClick?: (row: SearchPerformanceRow, kind: "query" | "page") => void;
    labels?: Partial<SearchConsolePageLabels>;
    frameLabels?: Partial<AnalyticsPageFrameLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    data: undefined,
    site: undefined,
    loading: false,
    error: undefined,
    onSelectAccount: undefined,
    onRetry: undefined,
    onRefresh: undefined,
    refreshing: false,
    updatedAt: undefined,
    onRowClick: undefined,
    labels: undefined,
    frameLabels: undefined,
  },
);
const emit = defineEmits<{ "update:period": [days: number] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const metric = ref("clicks");
const tab = ref("queries");
const busy = computed(() => props.loading || !props.data);

const tiles = computed<MetricTileData[]>(() => {
  const s = props.data?.summary;
  if (!s) return [];
  const tile = (id: string, label: string, total: SearchConsoleTotal, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total.value, previous: total.previous, sparkline: total.trend, ...extra });
  return [
    tile("clicks", t.value.clicks, s.clicks, { icon: MousePointerClick }),
    tile("impressions", t.value.impressions, s.impressions, { icon: Eye }),
    tile("ctr", t.value.ctr, s.ctr, { format: pct, icon: Percent }),
    tile("position", t.value.position, s.position, { format: one, invert: true, icon: TrendingUp }),
  ];
});

const metrics = computed<TimeSeriesMetric[]>(() => [
  { id: "clicks", label: t.value.clicks, color: "var(--primary)" },
  { id: "impressions", label: t.value.impressions, color: "var(--nq-tag-purple)" },
  { id: "ctr", label: t.value.ctr, format: pct, aggregate: "avg", color: "var(--nq-tag-teal)" },
  { id: "position", label: t.value.position, format: one, aggregate: "avg", lowerIsBetter: true, color: "var(--nq-tag-orange)" },
]);
const site = computed(() => props.site ?? activeAccountName(props.service));
const rowClick = (kind: "query" | "page") => (props.onRowClick ? (r: SearchPerformanceRow) => props.onRowClick?.(r, kind) : undefined);
</script>

<template>
  <NqAnalyticsPageFrame
    :title="t.title"
    :description="site ? t.description(site) : undefined"
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
      <NqPeriodToggle :options="[7, 28, 90]" :model-value="period" @update:model-value="(v) => emit('update:period', v)" />
    </template>
    <NqMetricTiles :metrics="tiles" :selected="metric" :on-select="(id) => (metric = id)" :loading="busy" />
    <NqTimeSeriesPanel
      v-model:metric="metric"
      :title="t.chartTitle"
      :description="t.chartDescription"
      :metrics="metrics"
      :data="data?.series ?? []"
      :previous-data="data?.previousSeries"
      :loading="busy"
    />
    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="queries">{{ t.tabQueries }}</NqTabsTab>
        <NqTabsTab value="pages">{{ t.tabPages }}</NqTabsTab>
        <NqTabsTab value="countries">{{ t.tabCountries }}</NqTabsTab>
        <NqTabsTab value="devices">{{ t.tabDevices }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="queries">
        <NqSearchPerformanceTable kind="query" :rows="data?.queries ?? []" :loading="busy" :on-row-click="rowClick('query')" />
      </NqTabsPanel>
      <NqTabsPanel value="pages">
        <NqSearchPerformanceTable kind="page" :rows="data?.pages ?? []" :loading="busy" :on-row-click="rowClick('page')" />
      </NqTabsPanel>
      <NqTabsPanel value="countries">
        <NqGeoList :title="t.countries" :value-label="t.clicksShort" :rows="data?.countries ?? []" :limit="10" :loading="busy" />
      </NqTabsPanel>
      <NqTabsPanel value="devices">
        <NqBreakdownTable :title="t.devices" :dimension-label="t.device" :value-label="t.clicksShort" :rows="data?.devices ?? []" :loading="busy" />
      </NqTabsPanel>
    </NqTabs>
  </NqAnalyticsPageFrame>
</template>
