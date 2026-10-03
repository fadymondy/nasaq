<script setup lang="ts">
import { Clock, Eye, Timer, UserPlus } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAnalyticsPageFrame, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { NqBreakdownTable, type BreakdownColumn, type BreakdownRow } from "../breakdown-table";
import { NqGeoList, type GeoRow } from "../geo-list";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { NqMetricTiles, formatSeconds, type MetricTileData } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, formatNumber } from "../numeric";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesMetric, type TimeSeriesPoint } from "../time-series-panel";

// The YouTube channel report: views, watch time and subscribers with comparison, a chart the tiles drive, the best videos,
// traffic sources and countries. Shows the connect screen until `service` is connected.
const STRINGS = {
  en: {
    title: "YouTube",
    description: (channel: string, subscribers?: string) => (subscribers ? `${channel} · ${subscribers} subscribers` : channel),
    views: "Views",
    watchTime: "Watch time (hours)",
    subscribers: "Net subscribers",
    avgDuration: "Avg. view duration",
    chartTitle: "Channel performance",
    chartDescription: "Select a tile to chart it",
    tabVideos: "Top videos",
    tabTraffic: "Traffic sources",
    tabAudience: "Audience",
    video: "Video",
    watch: "Watch time",
    avgView: "Avg. duration",
    trafficSources: "How viewers found you",
    source: "Source",
    countries: "Countries",
    benefits: ["Views, watch time and subscribers against the previous period", "Your best videos", "Where viewers come from"],
    hours: "h",
  },
  ar: {
    title: "YouTube",
    description: (channel: string, subscribers?: string) => (subscribers ? `${channel} · ${subscribers} مشترك` : channel),
    views: "المشاهدات",
    watchTime: "وقت المشاهدة (ساعات)",
    subscribers: "صافي المشتركين",
    avgDuration: "متوسط مدة المشاهدة",
    chartTitle: "أداء القناة",
    chartDescription: "اختر بطاقة لعرضها في الرسم",
    tabVideos: "أفضل الفيديوهات",
    tabTraffic: "مصادر الزيارات",
    tabAudience: "الجمهور",
    video: "الفيديو",
    watch: "وقت المشاهدة",
    avgView: "متوسط المدة",
    trafficSources: "كيف وصل المشاهدون إليك",
    source: "المصدر",
    countries: "الدول",
    benefits: ["المشاهدات ووقت المشاهدة والمشتركون مقارنة بالفترة السابقة", "أفضل فيديوهاتك", "من أين يأتي المشاهدون"],
    hours: "س",
  },
};

export type YouTubeChannelPageLabels = typeof STRINGS.en;

export interface YouTubeTotal {
  value: number;
  previous?: number;
  trend?: readonly number[];
}

export interface YouTubeVideo {
  id: string;
  title: string;
  /** Views in the period. */
  views: number;
  previousViews?: number;
  /** Watch time in hours. */
  watchHours: number;
  /** Average view duration in seconds. */
  avgSeconds: number;
  href?: string;
}

export interface YouTubeChannelData {
  channel?: { name: string; handle?: string; subscribers?: number };
  summary: {
    views: YouTubeTotal;
    /** Hours. */
    watchHours: YouTubeTotal;
    /** Subscribers gained minus lost. */
    subscribers: YouTubeTotal;
    /** Seconds. */
    avgSeconds: YouTubeTotal;
  };
  /** One row per day with `views`, `watchHours` and `subscribers`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  videos: readonly YouTubeVideo[];
  trafficSources: readonly BreakdownRow[];
  countries: readonly GeoRow[];
}

const compact = { notation: "compact", maximumFractionDigits: 1 } as const;

const props = withDefaults(
  defineProps<{
    /** The data source and its connection state. Anything but "connected" shows the connect screen. */
    service: IntegrationService;
    data?: YouTubeChannelData;
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
    labels?: Partial<YouTubeChannelPageLabels>;
    frameLabels?: Partial<AnalyticsPageFrameLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    data: undefined,
    loading: false,
    error: undefined,
    onSelectAccount: undefined,
    onRetry: undefined,
    onRefresh: undefined,
    refreshing: false,
    updatedAt: undefined,
    labels: undefined,
    frameLabels: undefined,
  },
);
const emit = defineEmits<{ "update:period": [days: number] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const metric = ref("views");
const tab = ref("videos");
const busy = computed(() => props.loading || !props.data);

const tiles = computed<MetricTileData[]>(() => {
  const s = props.data?.summary;
  if (!s) return [];
  const tile = (id: string, label: string, total: YouTubeTotal, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total.value, previous: total.previous, sparkline: total.trend, ...extra });
  return [
    tile("views", t.value.views, s.views, { icon: Eye }),
    tile("watchHours", t.value.watchTime, s.watchHours, { icon: Clock }),
    tile("subscribers", t.value.subscribers, s.subscribers, { icon: UserPlus }),
    tile("avgSeconds", t.value.avgDuration, s.avgSeconds, {
      display: formatSeconds(s.avgSeconds.value, ar.value),
      previousDisplay: s.avgSeconds.previous === undefined ? undefined : formatSeconds(s.avgSeconds.previous, ar.value),
      icon: Timer,
    }),
  ];
});

const metrics = computed<TimeSeriesMetric[]>(() => [
  { id: "views", label: t.value.views, color: "var(--primary)" },
  { id: "watchHours", label: t.value.watchTime, color: "var(--nq-tag-purple)" },
  { id: "subscribers", label: t.value.subscribers, color: "var(--nq-tag-teal)" },
]);

const videoRows = computed<BreakdownRow[]>(() => (props.data?.videos ?? []).map((v) => ({ id: v.id, label: v.title, value: v.views, previous: v.previousViews, href: v.href })));
const byId = computed(() => new Map((props.data?.videos ?? []).map((v) => [v.id, v])));
const videoColumns = computed<BreakdownColumn[]>(() => [
  { id: "watch", header: t.value.watch, align: "end", cell: (r) => h(NqNum, { value: byId.value.get(r.id)?.watchHours ?? 0, format: { maximumFractionDigits: 0 } }) },
  { id: "avg", header: t.value.avgView, align: "end", cell: (r) => h("bdi", { dir: "ltr" }, formatSeconds(byId.value.get(r.id)?.avgSeconds ?? 0, ar.value)) },
]);

const description = computed(() => {
  const c = props.data?.channel;
  if (!c) return undefined;
  const subs = c.subscribers;
  return t.value.description(c.name, subs === undefined ? undefined : formatNumber(subs, ar.value ? "ar" : "en", compact));
});
</script>

<template>
  <NqAnalyticsPageFrame
    :title="t.title"
    :description="description"
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
    <NqTimeSeriesPanel v-model:metric="metric" :title="t.chartTitle" :description="t.chartDescription" :metrics="metrics" :data="data?.series ?? []" :previous-data="data?.previousSeries" :loading="busy" />
    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="videos">{{ t.tabVideos }}</NqTabsTab>
        <NqTabsTab value="traffic">{{ t.tabTraffic }}</NqTabsTab>
        <NqTabsTab value="audience">{{ t.tabAudience }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="videos">
        <NqBreakdownTable :title="t.tabVideos" :dimension-label="t.video" :value-label="t.views" :rows="videoRows" :limit="10" :show-share="false" :loading="busy" :columns="videoColumns" />
      </NqTabsPanel>
      <NqTabsPanel value="traffic">
        <NqBreakdownTable :title="t.trafficSources" :dimension-label="t.source" :value-label="t.views" :rows="data?.trafficSources ?? []" :loading="busy" />
      </NqTabsPanel>
      <NqTabsPanel value="audience">
        <NqGeoList :title="t.countries" :value-label="t.views" :rows="data?.countries ?? []" :limit="10" :loading="busy" />
      </NqTabsPanel>
    </NqTabs>
  </NqAnalyticsPageFrame>
</template>
