<script setup lang="ts">
import { CircleCheck, CircleX } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqAnalyticsPageFrame, type AnalyticsPageFrameLabels } from "../analytics-connect";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { IntegrationResult, IntegrationService } from "../integration-connector";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqSkeleton } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { NqTable, NqTableBody, NqTableCell, NqTableHead, NqTableHeader, NqTableRow } from "../table";
import { NqPeriodToggle, NqTimeSeriesPanel, type TimeSeriesPoint } from "../time-series-panel";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import {
  NqWebVitalGauge,
  NqWebVitalGaugeGrid,
  VITAL_THRESHOLDS,
  WEB_VITAL_IDS,
  formatVital,
  passesCoreWebVitals,
  rateVital,
  type VitalDistribution,
  type VitalRating,
  type WebVitalId,
} from "../web-vital-gauge";

// The web vitals report: a verdict on Core Web Vitals, one gauge per metric with its distribution, a trend chart with
// Google's good and poor limits, and the busiest pages rated per metric. Shows the connect screen until `service` is connected.
const STRINGS = {
  en: {
    title: "Web vitals",
    description: (site: string) => `Real-user performance of ${site}, judged at the 75th percentile`,
    pass: "Passes Core Web Vitals",
    fail: "Does not pass Core Web Vitals",
    passHint: "LCP, INP and CLS are all good for at least 75% of page loads.",
    failHint: "At least one of LCP, INP or CLS is not good for 75% of page loads.",
    noData: "Not enough data to assess Core Web Vitals yet.",
    device: "Device",
    mobile: "Mobile",
    desktop: "Desktop",
    trendTitle: "Trend",
    trendDescription: (id: string) => `${id} at the 75th percentile per day. Dashed lines mark Google's good and poor limits.`,
    goodLimit: "Good limit",
    poorLimit: "Poor limit",
    pagesTitle: "Pages to fix first",
    pagesDescription: "Pages with the most page loads, rated on each metric",
    page: "Page",
    loads: "Page loads",
    good: "Good",
    needs: "Needs improvement",
    poor: "Poor",
    benefits: ["LCP, INP, CLS, FCP and TTFB at the 75th percentile", "How many page loads are good, need improvement or are poor", "Trend over time and the pages to fix first"],
    empty: "No pages to show",
  },
  ar: {
    title: "مؤشرات الويب",
    description: (site: string) => `أداء ${site} عند المستخدمين الفعليين، عند المئين 75`,
    pass: "يجتاز مؤشرات الويب الأساسية",
    fail: "لا يجتاز مؤشرات الويب الأساسية",
    passHint: "مؤشرات LCP وINP وCLS جيدة في 75% على الأقل من تحميلات الصفحات.",
    failHint: "أحد مؤشرات LCP أو INP أو CLS ليس جيدًا في 75% من تحميلات الصفحات.",
    noData: "لا بيانات كافية لتقييم مؤشرات الويب الأساسية بعد.",
    device: "الجهاز",
    mobile: "الجوال",
    desktop: "سطح المكتب",
    trendTitle: "الاتجاه",
    trendDescription: (id: string) => `${id} عند المئين 75 لكل يوم. الخطان المتقطعان يمثلان حدّي Google للجيد والضعيف.`,
    goodLimit: "حد الجيد",
    poorLimit: "حد الضعيف",
    pagesTitle: "الصفحات التي تُصلح أولًا",
    pagesDescription: "الصفحات الأكثر تحميلًا مع تقييم كل مؤشر",
    page: "الصفحة",
    loads: "تحميلات الصفحة",
    good: "جيد",
    needs: "يحتاج إلى تحسين",
    poor: "ضعيف",
    benefits: ["LCP وINP وCLS وFCP وTTFB عند المئين 75", "كم تحميلًا جيدًا أو يحتاج إلى تحسين أو ضعيفًا", "الاتجاه عبر الزمن والصفحات التي تُصلح أولًا"],
    empty: "لا صفحات لعرضها",
  },
};

export type WebVitalsPageLabels = typeof STRINGS.en;

export interface WebVitalReading {
  /** The 75th percentile, in milliseconds (unitless for CLS). */
  p75?: number;
  previous?: number;
  /** Share of page loads in each rating. */
  distribution?: VitalDistribution;
}

export interface WebVitalsPageRow {
  id: string;
  url: string;
  loads: number;
  /** 75th percentile per metric. */
  vitals: Partial<Record<WebVitalId, number>>;
}

export interface WebVitalsData {
  vitals: Partial<Record<WebVitalId, WebVitalReading>>;
  /** One row per day with the p75 of each metric under its id: `LCP`, `INP`, `CLS`, `FCP`, `TTFB`. */
  series: readonly TimeSeriesPoint[];
  pages: readonly WebVitalsPageRow[];
}

export type WebVitalsDevice = "mobile" | "desktop";

const props = withDefaults(
  defineProps<{
    /** The data source and its connection state. Anything but "connected" shows the connect screen. */
    service: IntegrationService;
    data?: WebVitalsData;
    /** The origin shown, for the subtitle. */
    site?: string;
    /** The device the numbers are for (`v-model:device`). Omit to hide the device switch. */
    device?: WebVitalsDevice;
    /** The metric charted (`v-model:metric`). Default LCP. */
    metric?: WebVitalId;
    /** Reporting period in days (`v-model:period`). */
    period: number;
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
    onPageClick?: (row: WebVitalsPageRow) => void;
    labels?: Partial<WebVitalsPageLabels>;
    frameLabels?: Partial<AnalyticsPageFrameLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    data: undefined,
    site: undefined,
    device: undefined,
    metric: undefined,
    loading: false,
    error: undefined,
    onSelectAccount: undefined,
    onRetry: undefined,
    onRefresh: undefined,
    refreshing: false,
    updatedAt: undefined,
    onPageClick: undefined,
    labels: undefined,
    frameLabels: undefined,
  },
);
const emit = defineEmits<{ "update:period": [days: number]; "update:device": [device: WebVitalsDevice]; "update:metric": [metric: WebVitalId] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();
const locale = computed(() => (nq.locale.value.startsWith("ar") ? "ar" : "en"));
const inner = ref<WebVitalId>("LCP");
const current = computed(() => props.metric ?? inner.value);
const busy = computed(() => props.loading || !props.data);
const tone: Record<VitalRating, StatusTone> = { good: "success", "needs-improvement": "warning", poor: "danger" };
const coreIds = ["LCP", "INP", "CLS"] as const;

function pick(m: WebVitalId) {
  inner.value = m;
  emit("update:metric", m);
}

const p75 = computed(() => {
  const out: Partial<Record<WebVitalId, number>> = {};
  for (const id of WEB_VITAL_IDS) {
    const v = props.data?.vitals[id]?.p75;
    if (v !== undefined) out[id] = v;
  }
  return out;
});
const assessed = computed(() => coreIds.every((id) => p75.value[id] !== undefined));
const passes = computed(() => passesCoreWebVitals(p75.value));

const th = computed(() => VITAL_THRESHOLDS[current.value]);
const limit = (v: number) => (th.value.unit === "score" ? String(v) : formatVital(current.value, v, locale.value));
const metrics = WEB_VITAL_IDS.map((id) => ({ id, label: id, aggregate: "avg" as const, lowerIsBetter: true, format: VITAL_THRESHOLDS[id].unit === "score" ? { maximumFractionDigits: 2 } : { maximumFractionDigits: 0 } }));
const referenceLines = computed(() => [
  { value: th.value.good, label: `${t.value.goodLimit} ${limit(th.value.good)}`, tone: "success" as const },
  { value: th.value.poor, label: `${t.value.poorLimit} ${limit(th.value.poor)}`, tone: "danger" as const },
]);
const ratingTitle = (r: VitalRating) => (r === "good" ? t.value.good : r === "poor" ? t.value.poor : t.value.needs);
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
      <NqToggleGroup v-if="device" :aria-label="t.device" :model-value="[device]" @update:model-value="(v) => v[0] && emit('update:device', v[0] as WebVitalsDevice)">
        <NqToggle value="mobile">{{ t.mobile }}</NqToggle>
        <NqToggle value="desktop">{{ t.desktop }}</NqToggle>
      </NqToggleGroup>
      <NqPeriodToggle :model-value="period" @update:model-value="(v) => emit('update:period', v)" />
    </template>
    <NqSkeleton v-if="busy" class="h-20 w-full" />
    <NqCard v-else data-slot="web-vitals-verdict" :data-pass="assessed ? passes : undefined">
      <NqCardContent class="flex items-center gap-3">
        <template v-if="assessed">
          <CircleCheck v-if="passes" aria-hidden="true" class="size-8 shrink-0 text-nq-success-text" />
          <CircleX v-else aria-hidden="true" class="size-8 shrink-0 text-nq-danger-text" />
        </template>
        <div class="flex min-w-0 flex-col">
          <p class="text-h3 text-foreground">{{ assessed ? (passes ? t.pass : t.fail) : t.noData }}</p>
          <p v-if="assessed" class="text-body-sm text-muted-foreground">{{ passes ? t.passHint : t.failHint }}</p>
        </div>
      </NqCardContent>
    </NqCard>
    <NqWebVitalGaugeGrid>
      <NqWebVitalGauge
        v-for="id in WEB_VITAL_IDS"
        :key="id"
        :metric="id"
        :value="data?.vitals[id]?.p75"
        :previous="data?.vitals[id]?.previous"
        :distribution="data?.vitals[id]?.distribution"
        :selected="current === id"
        :on-select="pick"
      />
    </NqWebVitalGaugeGrid>
    <NqTimeSeriesPanel
      :title="`${t.trendTitle}: ${current}`"
      :description="t.trendDescription(current)"
      :metrics="metrics"
      :metric="current"
      :data="data?.series ?? []"
      :reference-lines="referenceLines"
      :loading="busy"
      @update:metric="(m) => pick(m as WebVitalId)"
    />
    <NqCard data-slot="web-vitals-pages">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.pagesTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.pagesDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="px-0">
        <div v-if="busy" class="flex flex-col gap-3 px-4">
          <NqSkeleton v-for="i in 5" :key="i" class="h-8 w-full" />
        </div>
        <p v-else-if="!data || data.pages.length === 0" class="px-4 py-8 text-center text-body-sm text-muted-foreground">{{ t.empty }}</p>
        <NqTable v-else :label="t.pagesTitle">
          <NqTableHeader>
            <NqTableRow>
              <NqTableHead>{{ t.page }}</NqTableHead>
              <NqTableHead class="text-end">{{ t.loads }}</NqTableHead>
              <NqTableHead v-for="id in coreIds" :key="id" class="text-end">{{ id }}</NqTableHead>
            </NqTableRow>
          </NqTableHeader>
          <NqTableBody>
            <NqTableRow v-for="row in data.pages" :key="row.id" :class="onPageClick ? 'cursor-pointer' : undefined" @click="onPageClick?.(row)">
              <NqTableCell class="max-w-0 min-w-40">
                <bdi dir="ltr" class="block truncate">{{ row.url }}</bdi>
              </NqTableCell>
              <NqTableCell class="text-end tabular-nums"><NqNum :value="row.loads" :format="{ notation: 'compact', maximumFractionDigits: 1 }" /></NqTableCell>
              <NqTableCell v-for="id in coreIds" :key="id" class="text-end tabular-nums">
                <template v-if="row.vitals[id] === undefined">–</template>
                <NqStatus v-else :tone="tone[rateVital(id, row.vitals[id]!)]" tinted :title="ratingTitle(rateVital(id, row.vitals[id]!))" class="justify-end">
                  <bdi dir="ltr">{{ formatVital(id, row.vitals[id]!, locale) }}</bdi>
                </NqStatus>
              </NqTableCell>
            </NqTableRow>
          </NqTableBody>
        </NqTable>
      </NqCardContent>
    </NqCard>
  </NqAnalyticsPageFrame>
</template>
