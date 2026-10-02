<script setup lang="ts">
import { TrendingDown, TrendingUp } from "lucide-vue-next";
import { computed, type FunctionalComponent, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCard } from "../card";
import { changeRatio, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatNumber, NqNum } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { formatVital } from "./format";
import { STRINGS, type WebVitalGaugeLabels } from "./strings";
import { gaugeFraction, normalizeDistribution, rateVital, VITAL_THRESHOLDS, vitalBands, type VitalDistribution, type VitalRating, type WebVitalId } from "./web-vitals-math";

// A semicircle gauge for one Web Vital against Google thresholds: a green good band, an amber needs-improvement band
// and a red poor band, a marker at the 75th percentile, the value with its rating (icon and word, not colour alone),
// the thresholds in words, and an optional distribution of page loads across the three ratings.
defineOptions({ inheritAttrs: false });

const props = defineProps<{
  metric: WebVitalId;
  /** The 75th percentile of the metric, in milliseconds (unitless for CLS). Omit for "No data". */
  value?: number;
  /** The previous period's 75th percentile. Adds the change; lower is better. */
  previous?: number;
  /** Share of page loads that rated good, needs improvement and poor. Counts or fractions. */
  distribution?: VitalDistribution;
  /** Make the gauge a button that selects this metric (drives a trend chart). */
  onSelect?: (metric: WebVitalId) => void;
  selected?: boolean;
  class?: HTMLAttributes["class"];
  labels?: Partial<WebVitalGaugeLabels>;
}>();

const ratingTone: Record<VitalRating, StatusTone> = { good: "success", "needs-improvement": "warning", poor: "danger" };
const ratingVar: Record<VitalRating, string> = { good: "var(--nq-success)", "needs-improvement": "var(--nq-warning)", poor: "var(--nq-danger)" };

const CX = 100;
const CY = 100;
const R = 80;

/** A point on the gauge arc: 0 is the left end, 1 the right end. */
function point(f: number, r = R) {
  const angle = Math.PI * (1 - f);
  return { x: CX + r * Math.cos(angle), y: CY - r * Math.sin(angle) };
}
function arc(from: number, to: number) {
  const a = point(from);
  const b = point(to);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${R} ${R} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

const nq = useNasaq();
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const locale = computed(() => nq.locale.value);
const threshold = computed(() => VITAL_THRESHOLDS[props.metric]);
const bands = computed(() => vitalBands(props.metric));
const hasValue = computed(() => props.value !== undefined && Number.isFinite(props.value));
const rating = computed(() => (hasValue.value ? rateVital(props.metric, props.value as number) : undefined));
const marker = computed(() => (hasValue.value ? point(gaugeFraction(props.metric, props.value as number)) : undefined));
const text = (v: number) => formatVital(props.metric, v, locale.value);
const delta = computed(() => (hasValue.value ? changeRatio(props.value as number, props.previous) : undefined));
const dist = computed(() => (props.distribution ? normalizeDistribution(props.distribution) : undefined));
const pct = (f: number) => formatNumber(f, locale.value, { style: "percent", maximumFractionDigits: 0 });
const gaugeLabel = computed(() =>
  hasValue.value && rating.value
    ? t.value.gaugeLabel(t.value.names[props.metric], text(props.value as number), t.value.rating[rating.value])
    : `${t.value.names[props.metric]}: ${t.value.noData}`,
);
const distLabel = computed(() => {
  const d = dist.value;
  if (!d) return "";
  return `${t.value.distribution}: ${t.value.good} ${pct(d.good)}, ${t.value.needs} ${pct(d.needsImprovement)}, ${t.value.poorLabel} ${pct(d.poor)}`;
});
const Passthrough: FunctionalComponent = (_, { slots }) => slots.default?.();
const wrapper = computed(() => (props.onSelect ? "button" : Passthrough));
const wrapperAttrs = computed(() =>
  props.onSelect
    ? {
        type: "button",
        "aria-pressed": !!props.selected,
        class: "rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus",
        onClick: () => props.onSelect?.(props.metric),
      }
    : {},
);
const deltaTone = (d: number) => (d < 0 ? "text-nq-success-text" : d > 0 ? "text-nq-danger-text" : "text-muted-foreground");
</script>

<template>
  <component :is="wrapper" v-bind="wrapperAttrs">
    <NqCard
      v-bind="$attrs"
      data-slot="web-vital-gauge"
      :data-metric="metric"
      :data-rating="rating"
      :class="cn('h-full gap-3 px-4 py-4', onSelect && selected && 'border-primary ring-1 ring-primary', props.class)"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="flex min-w-0 flex-col">
          <div class="flex items-center gap-2">
            <span class="text-label text-foreground" dir="ltr">{{ metric }}</span>
            <span v-if="threshold.core" class="rounded-control bg-secondary px-1.5 py-0.5 text-caption text-muted-foreground">{{ t.core }}</span>
          </div>
          <span class="truncate text-caption text-muted-foreground">{{ t.names[metric] }}</span>
        </div>
        <NqStatus v-if="rating" :tone="ratingTone[rating]" tinted class="shrink-0 text-caption">{{ t.rating[rating] }}</NqStatus>
      </div>

      <div class="relative mx-auto w-full max-w-56">
        <svg viewBox="0 0 200 116" role="img" :aria-label="gaugeLabel" class="block w-full rtl:-scale-x-100">
          <path :d="arc(0, 1)" fill="none" stroke="var(--nq-surface-soft)" stroke-width="16" stroke-linecap="butt" />
          <path :d="arc(0, bands.good)" fill="none" :stroke="ratingVar.good" stroke-width="14" />
          <path :d="arc(bands.good, bands.poor)" fill="none" :stroke="ratingVar['needs-improvement']" stroke-width="14" />
          <path :d="arc(bands.poor, 1)" fill="none" :stroke="ratingVar.poor" stroke-width="14" />
          <g v-if="marker">
            <circle :cx="marker.x" :cy="marker.y" r="9" fill="var(--card)" stroke="var(--foreground)" stroke-width="2.5" />
            <circle :cx="marker.x" :cy="marker.y" r="3" :fill="ratingVar[rating ?? 'good']" />
          </g>
        </svg>
        <div class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center leading-tight">
          <span data-slot="web-vital-value" class="text-h2 text-foreground tabular-nums" dir="ltr">{{ hasValue ? text(value as number) : "–" }}</span>
          <span class="text-caption text-muted-foreground">{{ t.p75 }}</span>
        </div>
      </div>

      <p v-if="delta !== undefined" class="flex items-center justify-center gap-1.5 text-caption">
        <TrendingDown v-if="delta < 0" aria-hidden="true" class="size-3.5 text-nq-success-text rtl:-scale-x-100" />
        <TrendingUp v-else-if="delta > 0" aria-hidden="true" class="size-3.5 text-nq-danger-text rtl:-scale-x-100" />
        <NqNum :value="delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" :class="cn('text-label', deltaTone(delta))" />
        <span class="text-muted-foreground">{{ t.vsPrevious }}</span>
      </p>

      <ul class="grid gap-1 text-caption text-muted-foreground" :aria-label="t.hints[metric]">
        <li class="flex items-center justify-between gap-2">
          <NqStatus tone="success" class="shrink-0 whitespace-nowrap">{{ t.good }}</NqStatus>
          <bdi dir="ltr" class="text-end">{{ t.atMost(text(threshold.good)) }}</bdi>
        </li>
        <li class="flex items-center justify-between gap-2">
          <NqStatus tone="warning" class="shrink-0 whitespace-nowrap">{{ t.needs }}</NqStatus>
          <bdi dir="ltr" class="text-end">{{ t.band(text(threshold.good), text(threshold.poor)) }}</bdi>
        </li>
        <li class="flex items-center justify-between gap-2">
          <NqStatus tone="danger" class="shrink-0 whitespace-nowrap">{{ t.poorLabel }}</NqStatus>
          <bdi dir="ltr" class="text-end">{{ t.over(text(threshold.poor)) }}</bdi>
        </li>
      </ul>

      <div v-if="dist" data-slot="web-vital-distribution" class="flex flex-col gap-1.5">
        <span class="text-caption text-muted-foreground">{{ t.distribution }}</span>
        <div role="img" :aria-label="distLabel" class="flex h-2 w-full gap-0.5 overflow-hidden rounded-full">
          <span v-if="dist.good > 0" class="block h-full bg-nq-success" :style="{ width: `${dist.good * 100}%` }" />
          <span v-if="dist.needsImprovement > 0" class="block h-full bg-nq-warning" :style="{ width: `${dist.needsImprovement * 100}%` }" />
          <span v-if="dist.poor > 0" class="block h-full bg-nq-danger" :style="{ width: `${dist.poor * 100}%` }" />
        </div>
        <div class="flex justify-between text-caption tabular-nums text-muted-foreground">
          <bdi>{{ pct(dist.good) }}</bdi>
          <bdi>{{ pct(dist.needsImprovement) }}</bdi>
          <bdi>{{ pct(dist.poor) }}</bdi>
        </div>
      </div>
    </NqCard>
  </component>
</template>
