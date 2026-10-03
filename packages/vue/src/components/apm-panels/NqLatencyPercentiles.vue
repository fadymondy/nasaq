<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { ChartConfig } from "../chart";
import { changeRatio, formatMillis, parseAnalyticsDay } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate, formatNumber, NqNum, type FormatDateOptions } from "../numeric";
import { percentile } from "./apm-math";
import NqApmChart from "./NqApmChart.vue";
import NqApmPanelBody from "./NqApmPanelBody.vue";
import { STRINGS, type ApmPanelsLabels } from "./strings";

// The p50, p95 and p99 response time as three headline figures (with the change against the previous period, lower is
// better) and one line chart over time, with an optional p95 target guide.
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
const props = defineProps<{
  data: readonly LatencyPoint[];
  /** The percentiles over the whole period. Default: the 50th, 95th and 99th percentile of the buckets shown. */
  summary?: LatencySummary;
  previous?: LatencySummary;
  /** A latency target in milliseconds for p95, drawn as a guide line. */
  targetMs?: number;
  title?: string;
  description?: string;
  loading?: boolean;
  error?: string | boolean;
  onRetry?: () => void;
  class?: HTMLAttributes["class"];
  labels?: Partial<ApmPanelsLabels>;
}>();

const timeFormat: FormatDateOptions = { hour: "numeric", minute: "2-digit" };
const nq = useNasaq();
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const ar = computed(() => nq.locale.value.startsWith("ar"));
const locale = computed(() => nq.locale.value);
const config = computed<ChartConfig>(() => ({
  p50: { label: t.value.p50, color: "var(--nq-tag-teal)" },
  p95: { label: t.value.p95, color: "var(--nq-tag-amber)" },
  p99: { label: t.value.p99, color: "var(--nq-tag-pink)" },
}));
const figures = computed<LatencySummary>(
  () =>
    props.summary ?? {
      p50: percentile(props.data.map((d) => d.p50), 50),
      p95: percentile(props.data.map((d) => d.p95), 95),
      p99: percentile(props.data.map((d) => d.p99), 99),
    },
);
const items = computed(() =>
  (["p50", "p95", "p99"] as const).map((id) => ({
    id,
    label: t.value[id],
    hint: id === "p50" ? t.value.median : id === "p95" ? t.value.slowest5 : t.value.slowest1,
    value: figures.value[id],
    delta: changeRatio(figures.value[id], props.previous?.[id]),
  })),
);
const fmtTime = (v: string) => formatDate(parseAnalyticsDay(v), locale.value, timeFormat);
const rows = computed(() => props.data.map((d) => ({ label: fmtTime(d.time), values: { p50: d.p50, p95: d.p95, p99: d.p99 } })));
const reference = computed(() => (props.targetMs ? { value: props.targetMs, label: `${t.value.target} ${t.value.p95} ${props.targetMs}` } : undefined));
const deltaClass = (d: number) => (d === 0 ? "text-muted-foreground" : d < 0 ? "text-nq-success-text" : "text-nq-danger-text");
</script>

<template>
  <NqCard data-slot="latency-percentiles" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ title ?? t.latency }}</NqCardTitle>
      <NqCardDescription>{{ description ?? t.latencyDescription }}</NqCardDescription>
      <NqCardAction v-if="$slots.action"><slot name="action" /></NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <dl class="grid grid-cols-3 gap-3">
        <div v-for="i in items" :key="i.id" :data-percentile="i.id" class="flex min-w-0 flex-col gap-0.5 rounded-control border border-border px-3 py-2">
          <dt class="flex items-center gap-1.5 text-caption text-muted-foreground">
            <span aria-hidden="true" class="size-2 rounded-full" :style="{ background: config[i.id]?.color }" />
            <bdi dir="ltr" class="text-label text-foreground">{{ i.label }}</bdi>
            <span class="hidden truncate sm:inline">{{ i.hint }}</span>
          </dt>
          <dd class="text-h3 text-foreground tabular-nums" dir="ltr">{{ formatMillis(i.value, ar) }}</dd>
          <dd v-if="i.delta !== undefined" :class="cn('text-caption', deltaClass(i.delta))">
            <NqNum :value="i.delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" /> <span class="text-muted-foreground">{{ t.vsPrevious }}</span>
          </dd>
        </div>
      </dl>
      <NqApmPanelBody :error="error" :loading="loading" :empty="data.length === 0" :on-retry="onRetry" :t="t" height="h-64">
        <NqApmChart
          :config="config"
          :keys="['p50', 'p95', 'p99']"
          :rows="rows"
          :reference="reference"
          :label="t.chartLatency"
          :tick="(n) => formatNumber(n, locale, { notation: 'compact' })"
          :value="(n) => formatNumber(n, locale, { maximumFractionDigits: 0 })"
          class="h-64"
        />
      </NqApmPanelBody>
    </NqCardContent>
  </NqCard>
</template>
