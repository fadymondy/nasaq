<script setup lang="ts">
import { AlertTriangle } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import type { ChartConfig } from "../chart";
import { changeRatio, parseAnalyticsDay } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDate, formatNumber, NqDateTime, NqNum, type FormatDateOptions } from "../numeric";
import { NqStatus } from "../status";
import { errorRate } from "./apm-math";
import NqApmChart from "./NqApmChart.vue";
import NqApmPanelBody from "./NqApmPanelBody.vue";
import { STRINGS, type ApmPanelsLabels } from "./strings";

// Error rate over time with the overall rate as a headline (toned against an optional objective, with an icon and a word),
// the total errors and requests, and the most frequent errors.
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
const props = defineProps<{
  data: readonly ErrorRatePoint[];
  /** The previous period's overall rate as a fraction, for the change. */
  previousRate?: number;
  /** Error-rate objective as a fraction, for example 0.01 for 1%. Drawn as a guide, and the headline says within or over. */
  slo?: number;
  topErrors?: readonly TopError[];
  onErrorClick?: (error: TopError) => void;
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
const locale = computed(() => nq.locale.value);
const totals = computed(() => props.data.reduce((a, d) => ({ requests: a.requests + d.requests, errors: a.errors + d.errors }), { requests: 0, errors: 0 }));
const overall = computed(() => errorRate(totals.value.errors, totals.value.requests));
const delta = computed(() => changeRatio(overall.value, props.previousRate));
const over = computed(() => props.slo !== undefined && overall.value > props.slo);
const config = computed<ChartConfig>(() => ({ rate: { label: t.value.errorRate, color: "var(--nq-danger)" } }));
const fmtTime = (v: string) => formatDate(parseAnalyticsDay(v), locale.value, timeFormat);
const pct = { style: "percent", maximumFractionDigits: 2 } as const;
const rows = computed(() => props.data.map((d) => ({ label: fmtTime(d.time), values: { rate: errorRate(d.errors, d.requests) } })));
const reference = computed(() => (props.slo !== undefined ? { value: props.slo, label: t.value.slo } : undefined));
const showHeadline = computed(() => !props.loading && !props.error && props.data.length > 0);
const deltaClass = (d: number) => (d === 0 ? "text-muted-foreground" : d < 0 ? "text-nq-success-text" : "text-nq-danger-text");
</script>

<template>
  <NqCard data-slot="error-rate-panel" :data-over-slo="slo === undefined ? undefined : over" :aria-busy="loading || undefined" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ title ?? t.errorRate }}</NqCardTitle>
      <NqCardDescription>{{ description ?? t.errorDescription }}</NqCardDescription>
      <NqCardAction v-if="$slots.action"><slot name="action" /></NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-4">
      <div v-if="showHeadline" class="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div class="flex flex-wrap items-baseline gap-x-3">
          <span class="text-h1 text-foreground tabular-nums"><NqNum :value="overall" :format="pct" /></span>
          <span v-if="delta !== undefined" :class="cn('text-label', deltaClass(delta))">
            <NqNum :value="delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" /> <span class="font-normal text-muted-foreground">{{ t.vsPrevious }}</span>
          </span>
          <NqStatus v-if="slo !== undefined" :tone="over ? 'danger' : 'success'" tinted>{{ over ? t.overSlo : t.withinSlo }}</NqStatus>
        </div>
        <dl class="flex gap-5 text-caption text-muted-foreground">
          <div>
            <dt>{{ t.errors }}</dt>
            <dd class="text-body-sm text-foreground tabular-nums"><NqNum :value="totals.errors" /></dd>
          </div>
          <div>
            <dt>{{ t.requests }}</dt>
            <dd class="text-body-sm text-foreground tabular-nums"><NqNum :value="totals.requests" /></dd>
          </div>
        </dl>
      </div>
      <NqApmPanelBody :error="error" :loading="loading" :empty="data.length === 0" :on-retry="onRetry" :t="t" height="h-52">
        <NqApmChart
          kind="area"
          :config="config"
          :keys="['rate']"
          :rows="rows"
          :reference="reference"
          :label="t.chartErrors"
          :tick="(n) => formatNumber(n, locale, { style: 'percent', maximumFractionDigits: 1 })"
          :value="(n) => formatNumber(n, locale, pct)"
          class="h-52"
        />
      </NqApmPanelBody>
      <section v-if="topErrors" :aria-label="t.topErrors" class="flex flex-col gap-2">
        <h4 class="text-label text-muted-foreground">{{ t.topErrors }}</h4>
        <p v-if="topErrors.length === 0" class="text-body-sm text-muted-foreground">{{ t.noErrors }}</p>
        <ul v-else class="flex flex-col divide-y divide-border rounded-control border border-border">
          <li v-for="e in topErrors" :key="e.id">
            <component
              :is="onErrorClick ? 'button' : 'div'"
              v-bind="onErrorClick ? { type: 'button', onClick: () => onErrorClick?.(e), class: 'flex w-full items-start gap-2.5 px-3 py-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-nq-focus' } : { class: 'flex items-start gap-2.5 px-3 py-2' }"
            >
              <AlertTriangle aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-danger-text" />
              <span class="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                <bdi dir="ltr" class="truncate font-mono text-code text-foreground">{{ e.message }}</bdi>
                <span class="flex flex-wrap gap-x-3 text-caption text-muted-foreground">
                  <bdi v-if="e.endpoint" dir="ltr">{{ e.endpoint }}</bdi>
                  <span v-if="e.lastSeenAt !== undefined">{{ t.lastSeen }} <NqDateTime :value="e.lastSeenAt" relative /></span>
                </span>
              </span>
              <NqBadge variant="danger">{{ t.occurrences(e.count) }}</NqBadge>
            </component>
          </li>
        </ul>
      </section>
    </NqCardContent>
  </NqCard>
</template>
