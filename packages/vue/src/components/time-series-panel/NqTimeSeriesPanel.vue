<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { ChartConfig } from "../chart";
import { aggregate, changeRatio, parseAnalyticsDay } from "../metric-tiles/analytics-math";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate, NqNum, type FormatDateOptions, type FormatNumberOptions } from "../numeric";
import { NqErrorState, NqSkeleton } from "../states";
import { NqSwitch } from "../switch";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqTimeSeriesChart from "./NqTimeSeriesChart.vue";
import type { TimeSeriesMetric, TimeSeriesPoint, TimeSeriesReferenceLine } from "./types";

// A time-series chart for one metric at a time with a period comparison: the current period as a filled line, the previous
// period as a dashed line behind it, a total with its change, and a metric switcher. Rates use the mean, counts the sum.

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

const props = withDefaults(
  defineProps<{
    metrics: readonly TimeSeriesMetric[];
    /** The current period. */
    data: readonly TimeSeriesPoint[];
    /** The comparison period, index-aligned with `data` (day 1 against day 1). */
    previousData?: readonly TimeSeriesPoint[];
    title?: string;
    description?: string;
    /** Selected metric (`v-model:metric`). */
    metric?: string;
    defaultMetric?: string;
    /** Whether the comparison line shows (`v-model:compare`). */
    compare?: boolean;
    defaultCompare?: boolean;
    /** Horizontal guides such as a service-level objective. */
    referenceLines?: readonly TimeSeriesReferenceLine[];
    /** Options for the X axis and tooltip dates. Default: month and day, plus the hour when `date` has a time. */
    dateFormat?: FormatDateOptions;
    /** Chart height class. Default "h-64". */
    chartClassName?: string;
    loading?: boolean;
    /** An error message, or `true` for the built-in one. Shows the error state instead of the chart. */
    error?: string | boolean;
    /** Shows the "Try again" button in the error state. */
    onRetry?: () => void;
    labels?: Partial<TimeSeriesPanelLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    previousData: undefined,
    title: undefined,
    description: undefined,
    metric: undefined,
    defaultMetric: undefined,
    compare: undefined,
    defaultCompare: true,
    referenceLines: undefined,
    dateFormat: undefined,
    chartClassName: "h-64",
    loading: false,
    error: undefined,
    onRetry: undefined,
    labels: undefined,
  },
);
const emit = defineEmits<{ "update:metric": [id: string]; "update:compare": [on: boolean] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();
const metricState = ref(props.defaultMetric ?? props.metrics[0]?.id ?? "");
const compareState = ref(props.defaultCompare);
const metricId = computed(() => props.metric ?? metricState.value);
const compare = computed(() => (props.compare ?? compareState.value) && !!props.previousData?.length);
const active = computed(() => props.metrics.find((m) => m.id === metricId.value) ?? props.metrics[0]);

function setMetric(next: string) {
  if (props.metric === undefined) metricState.value = next;
  emit("update:metric", next);
}
function setCompare(next: boolean) {
  if (props.compare === undefined) compareState.value = next;
  emit("update:compare", next);
}

const fmtDate = (date: string, withTime = date.includes("T")) =>
  formatDate(
    parseAnalyticsDay(date),
    nq.locale.value,
    props.dateFormat ?? (withTime ? { month: "short", day: "numeric", hour: "numeric" } : { month: "short", day: "numeric" }),
  );

const rows = computed(() => {
  const a = active.value;
  if (!a) return [];
  return props.data.map((p, i) => ({
    date: p.date,
    current: Number(p[a.id] ?? 0),
    previous: props.previousData?.[i] ? Number(props.previousData[i]?.[a.id] ?? 0) : undefined,
  }));
});
const config = computed<ChartConfig>(() => ({
  current: { label: active.value?.label, color: active.value?.color ?? "var(--primary)" },
  previous: { label: t.value.previousPeriod, color: "var(--muted-foreground)" },
}));
const mode = computed(() => active.value?.aggregate ?? "sum");
const total = computed(() =>
  aggregate(
    rows.value.map((r) => r.current),
    mode.value,
  ),
);
const delta = computed(() => {
  if (!compare.value) return undefined;
  const previous = aggregate(
    rows.value.flatMap((r) => (r.previous === undefined ? [] : [r.previous])),
    mode.value,
  );
  return changeRatio(total.value, previous);
});
const good = computed(() => (delta.value === undefined || delta.value === 0 ? undefined : delta.value > 0 !== !!active.value?.lowerIsBetter));
const totalFormat = computed<FormatNumberOptions>(() => active.value?.format ?? { maximumFractionDigits: 1 });
const chartLabel = computed(() => {
  const first = rows.value[0]?.date ?? "";
  const last = rows.value[rows.value.length - 1]?.date ?? "";
  return t.value.chart(active.value?.label ?? "", fmtDate(first, false), fmtDate(last, false));
});
</script>

<template>
  <NqCard data-slot="time-series-panel" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader>
      <NqCardTitle v-if="title || $slots.title" as="h3"><slot name="title">{{ title }}</slot></NqCardTitle>
      <NqCardDescription v-if="description || $slots.description"><slot name="description">{{ description }}</slot></NqCardDescription>
      <NqCardAction v-if="$slots.action"><slot name="action" /></NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div v-if="metrics.length > 1" class="max-w-full overflow-x-auto">
          <NqToggleGroup :aria-label="t.metric" :model-value="[active?.id ?? '']" @update:model-value="(v) => v[0] && setMetric(v[0])">
            <NqToggle v-for="m in metrics" :key="m.id" :value="m.id">{{ m.label }}</NqToggle>
          </NqToggleGroup>
        </div>
        <label v-if="previousData?.length" class="flex items-center gap-2 text-body-sm text-muted-foreground">
          <NqSwitch :model-value="compare" @update:model-value="setCompare" />
          {{ t.compare }}
        </label>
      </div>
      <div v-if="!loading && !error && active && rows.length > 0" data-slot="time-series-total" class="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span class="text-caption text-muted-foreground">{{ mode === "avg" ? t.average : t.total }}</span>
        <span class="text-h2 text-foreground tabular-nums"><NqNum :value="total" :format="totalFormat" /></span>
        <span v-if="delta !== undefined" :class="cn('text-label', good === undefined ? 'text-muted-foreground' : good ? 'text-nq-success-text' : 'text-nq-danger-text')">
          <NqNum :value="delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" />
        </span>
      </div>
      <NqErrorState v-if="error" :title="typeof error === 'string' ? error : t.loadError">
        <template v-if="onRetry" #actions><NqButton size="sm" @click="onRetry">{{ t.retry }}</NqButton></template>
      </NqErrorState>
      <NqSkeleton v-else-if="loading" :class="cn('w-full', chartClassName)" />
      <div v-else-if="rows.length === 0 || !active" :class="cn('grid place-items-center text-body-sm text-muted-foreground', chartClassName)">{{ t.empty }}</div>
      <NqTimeSeriesChart
        v-else
        :rows="rows"
        :config="config"
        :label="chartLabel"
        :lower-is-better="active.lowerIsBetter"
        :format="active.format"
        :compare="compare"
        :reference-lines="referenceLines"
        :fmt-date="fmtDate"
        :class="chartClassName"
      />
    </NqCardContent>
  </NqCard>
</template>
