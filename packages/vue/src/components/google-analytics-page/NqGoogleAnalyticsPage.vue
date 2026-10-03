<script setup lang="ts">
import { Activity, Clock, MousePointerClick, Target, Users } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAnalyticsPageFrame, activeAccountName, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { NqBreakdownTable, type BreakdownRow } from "../breakdown-table";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqGeoList, type GeoRow } from "../geo-list";
import { NqHeatmap, type HeatmapDatum } from "../heatmap";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { NqMetricTiles, countryName, flagEmoji, formatSeconds, type MetricTileData } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqRealtimeCounter } from "../realtime-counter";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesMetric, type TimeSeriesPoint } from "../time-series-panel";

// The Google Analytics report: KPI tiles with comparison, a traffic chart, a live counter, and tabs for sources,
// pages and audience. Shows the connect screen until `service` is connected.
const STRINGS = {
  en: {
    title: "Google Analytics",
    description: (property: string) => `Traffic and engagement for ${property}`,
    users: "Users",
    sessions: "Sessions",
    engagementRate: "Engagement rate",
    engagementTime: "Avg. engagement time",
    conversions: "Key events",
    trafficTitle: "Traffic",
    trafficDescription: "Daily totals for the selected period",
    tabSources: "Sources",
    tabPages: "Pages",
    tabAudience: "Audience",
    channels: "Default channel group",
    sourceMedium: "Source / medium",
    pages: "Top pages",
    page: "Page",
    channel: "Channel",
    source: "Source / medium",
    devices: "Devices",
    device: "Device",
    countries: "Countries",
    activity: "Sessions by day",
    activityDescription: "Darker days had more sessions",
    realtimeTitle: "Right now",
    realtimeDescription: "Active users in the last 30 minutes",
    realtimePages: "Top active pages",
    realtimeCountries: "Top countries",
    benefits: ["Users, sessions and key events against the previous period", "Traffic sources and top pages", "Countries and devices", "Live active users"],
    sessionsCount: "sessions",
    usersCount: "users",
  },
  ar: {
    title: "Google Analytics",
    description: (property: string) => `الزيارات والتفاعل لـ ${property}`,
    users: "المستخدمون",
    sessions: "الجلسات",
    engagementRate: "معدل التفاعل",
    engagementTime: "متوسط وقت التفاعل",
    conversions: "الأحداث الرئيسية",
    trafficTitle: "الزيارات",
    trafficDescription: "الإجماليات اليومية للفترة المحددة",
    tabSources: "المصادر",
    tabPages: "الصفحات",
    tabAudience: "الجمهور",
    channels: "مجموعة القنوات الافتراضية",
    sourceMedium: "المصدر / الوسيط",
    pages: "أكثر الصفحات زيارة",
    page: "الصفحة",
    channel: "القناة",
    source: "المصدر / الوسيط",
    devices: "الأجهزة",
    device: "الجهاز",
    countries: "الدول",
    activity: "الجلسات حسب اليوم",
    activityDescription: "الأيام الأغمق كانت أكثر جلسات",
    realtimeTitle: "الآن",
    realtimeDescription: "المستخدمون النشطون في آخر 30 دقيقة",
    realtimePages: "أكثر الصفحات نشاطًا",
    realtimeCountries: "أكثر الدول",
    benefits: ["المستخدمون والجلسات والأحداث الرئيسية مقارنة بالفترة السابقة", "مصادر الزيارات وأكثر الصفحات", "الدول والأجهزة", "المستخدمون النشطون الآن"],
    sessionsCount: "جلسة",
    usersCount: "مستخدم",
  },
};

export type GoogleAnalyticsPageLabels = typeof STRINGS.en;

export interface AnalyticsTotal {
  value: number;
  /** The same total for the comparison period. */
  previous?: number;
  /** Daily values for the sparkline. */
  trend?: readonly number[];
}

export interface GoogleAnalyticsData {
  summary: {
    users: AnalyticsTotal;
    sessions: AnalyticsTotal;
    /** A fraction, 0.61 for 61%. */
    engagementRate: AnalyticsTotal;
    /** Seconds. */
    engagementSeconds: AnalyticsTotal;
    conversions: AnalyticsTotal;
  };
  /** One row per day with `users`, `sessions` and `conversions`. */
  series: readonly TimeSeriesPoint[];
  previousSeries?: readonly TimeSeriesPoint[];
  realtime?: {
    active: number;
    perMinute?: readonly number[];
    pages: readonly { id: string; label: string; value: number }[];
    countries: readonly { code: string; value: number }[];
    updatedAt?: number | Date | string;
  };
  channels: readonly BreakdownRow[];
  sourceMedium: readonly BreakdownRow[];
  pages: readonly BreakdownRow[];
  countries: readonly GeoRow[];
  devices: readonly BreakdownRow[];
  /** Sessions per day for the activity calendar. */
  daily?: readonly HeatmapDatum[];
}

const props = withDefaults(
  defineProps<{
    /** The data source and its connection state. Anything but "connected" shows the connect screen. */
    service: IntegrationService;
    data?: GoogleAnalyticsData;
    /** The property or site shown, for the subtitle. */
    property?: string;
    /** First and last day of the period, for the activity calendar. */
    range?: { from: string; to: string };
    /** Reporting period in days (`v-model:period`). */
    period: number;
    /** Show skeletons. Also the state while `data` is still undefined. */
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
    labels?: Partial<GoogleAnalyticsPageLabels>;
    frameLabels?: Partial<AnalyticsPageFrameLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    data: undefined,
    property: undefined,
    range: undefined,
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
const tab = ref("sources");
const busy = computed(() => props.loading || !props.data);

const tiles = computed<MetricTileData[]>(() => {
  const s = props.data?.summary;
  if (!s) return [];
  const tile = (id: string, label: string, total: AnalyticsTotal, extra: Partial<MetricTileData>): MetricTileData => ({ id, label, value: total.value, previous: total.previous, sparkline: total.trend, ...extra });
  return [
    tile("users", t.value.users, s.users, { icon: Users }),
    tile("sessions", t.value.sessions, s.sessions, { icon: Activity }),
    tile("engagementRate", t.value.engagementRate, s.engagementRate, { format: { style: "percent", maximumFractionDigits: 1 }, icon: MousePointerClick }),
    tile("engagementSeconds", t.value.engagementTime, s.engagementSeconds, {
      display: formatSeconds(s.engagementSeconds.value, ar.value),
      previousDisplay: s.engagementSeconds.previous === undefined ? undefined : formatSeconds(s.engagementSeconds.previous, ar.value),
      icon: Clock,
    }),
    tile("conversions", t.value.conversions, s.conversions, { icon: Target }),
  ];
});

const metrics = computed<TimeSeriesMetric[]>(() => [
  { id: "users", label: t.value.users, color: "var(--primary)" },
  { id: "sessions", label: t.value.sessions, color: "var(--nq-tag-teal)" },
  { id: "conversions", label: t.value.conversions, color: "var(--nq-tag-orange)" },
]);

const rt = computed(() => props.data?.realtime);
const realtimeSections = computed(() => {
  const r = rt.value;
  if (!r) return [];
  const locale = ar.value ? "ar" : "en";
  return [
    { id: "pages", title: t.value.realtimePages, ltr: true, rows: r.pages },
    { id: "countries", title: t.value.realtimeCountries, rows: r.countries.map((c) => ({ id: c.code, label: `${flagEmoji(c.code)} ${countryName(c.code, locale)}`, value: c.value })) },
  ];
});
const account = computed(() => props.property ?? activeAccountName(props.service));
</script>

<template>
  <NqAnalyticsPageFrame
    :title="t.title"
    :description="account ? t.description(account) : undefined"
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
      <NqPeriodToggle :model-value="period" @update:model-value="(v) => emit('update:period', v)" />
    </template>
    <NqMetricTiles :metrics="tiles" :loading="busy" :skeletons="5" />
    <div :class="cn('grid gap-4', rt ? 'xl:grid-cols-[minmax(0,1fr)_20rem]' : undefined)">
      <NqTimeSeriesPanel :title="t.trafficTitle" :description="t.trafficDescription" :metrics="metrics" :data="data?.series ?? []" :previous-data="data?.previousSeries" default-metric="users" :loading="busy" />
      <NqRealtimeCounter v-if="rt" :title="t.realtimeTitle" :description="t.realtimeDescription" :value="rt.active" :per-minute="rt.perMinute" :updated-at="rt.updatedAt" :sections="realtimeSections" />
    </div>
    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="sources">{{ t.tabSources }}</NqTabsTab>
        <NqTabsTab value="pages">{{ t.tabPages }}</NqTabsTab>
        <NqTabsTab value="audience">{{ t.tabAudience }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="sources" class="grid gap-4 lg:grid-cols-2">
        <NqBreakdownTable :title="t.channels" :dimension-label="t.channel" :value-label="t.sessions" :rows="data?.channels ?? []" :loading="busy" />
        <NqBreakdownTable :title="t.sourceMedium" :dimension-label="t.source" :value-label="t.sessions" :rows="data?.sourceMedium ?? []" ltr-labels :loading="busy" />
      </NqTabsPanel>
      <NqTabsPanel value="pages">
        <NqBreakdownTable :title="t.pages" :dimension-label="t.page" :value-label="t.sessions" :rows="data?.pages ?? []" ltr-labels :limit="10" :loading="busy" />
      </NqTabsPanel>
      <NqTabsPanel value="audience" class="grid gap-4 lg:grid-cols-2">
        <NqGeoList :title="t.countries" :value-label="t.users" :rows="data?.countries ?? []" :loading="busy" />
        <div class="flex flex-col gap-4">
          <NqBreakdownTable :title="t.devices" :dimension-label="t.device" :value-label="t.users" :rows="data?.devices ?? []" :loading="busy" />
          <NqCard v-if="data?.daily && range">
            <NqCardHeader>
              <NqCardTitle as="h3">{{ t.activity }}</NqCardTitle>
              <NqCardDescription>{{ t.activityDescription }}</NqCardDescription>
            </NqCardHeader>
            <NqCardContent class="overflow-x-auto">
              <NqHeatmap :data="data.daily" :from="range.from" :to="range.to" color="var(--nq-tag-teal)" :cell-size="14" :label="t.activity" />
            </NqCardContent>
          </NqCard>
        </div>
      </NqTabsPanel>
    </NqTabs>
  </NqAnalyticsPageFrame>
</template>
