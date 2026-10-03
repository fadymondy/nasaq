<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { Minus, TrendingDown, TrendingUp } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import NqCard from "../card/NqCard.vue";
import NqSparkline from "../chart/NqSparkline.vue";
import NqNum from "../numeric/NqNum.vue";
import type { FormatNumberOptions } from "../numeric/format";
import NqSkeleton from "../states/NqSkeleton.vue";

// KPI tile: label, a large tabular figure, the change since the last period with a good/bad tone, and an
// optional trend line. The tone is colour plus the trend arrow and sign, so it does not rely on colour alone.
type StatTrend = "up" | "down" | "flat";
type StatTone = "positive" | "negative" | "neutral";

interface Props {
  /** What is measured. Localise it. Or use the `label` slot. */
  label?: string;
  /** The figure. A number is formatted with `format` in the active locale; use the `value` slot for anything else. */
  value?: number;
  /** Intl options for a numeric `value`, e.g. `{ style: "currency", currency: "SAR", notation: "compact" }`. */
  format?: FormatNumberOptions;
  /** Change versus the previous period, as a fraction: 0.124 is +12.4%, -0.03 is -3%. */
  delta?: number;
  /** Intl options for the delta. Default: percent with one decimal and an explicit sign. */
  deltaFormat?: FormatNumberOptions;
  /** Text after the delta, e.g. "vs last month". Localise it. */
  deltaLabel?: string;
  /** Cost-style metric: down is good, up is bad. Default false (up is good). */
  invert?: boolean;
  /** Values for a trailing trend line. Its colour follows the delta's tone. */
  sparkline?: readonly number[];
  /** Screen-reader summary of the sparkline. Without it the sparkline is decorative. */
  sparklineLabel?: string;
  /** Show a skeleton with the same layout instead of the content. */
  loading?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  label: undefined,
  value: undefined,
  format: undefined,
  delta: undefined,
  deltaFormat: undefined,
  deltaLabel: undefined,
  invert: false,
  sparkline: undefined,
  sparklineLabel: undefined,
  loading: false,
});

const toneText: Record<StatTone, string> = {
  positive: "text-nq-success-text",
  negative: "text-nq-danger-text",
  neutral: "text-muted-foreground",
};
const toneColor: Record<StatTone, string> = {
  positive: "var(--nq-success)",
  negative: "var(--nq-danger)",
  neutral: "var(--primary)",
};

const trend = computed<StatTrend>(() => (props.delta === undefined || props.delta === 0 ? "flat" : props.delta > 0 ? "up" : "down"));
const tone = computed<StatTone>(() => (trend.value === "flat" ? "neutral" : (trend.value === "up") !== props.invert ? "positive" : "negative"));
const TrendIcon = computed(() => ({ up: TrendingUp, down: TrendingDown, flat: Minus })[trend.value]);
const deltaFmt = computed<FormatNumberOptions>(() => ({ style: "percent", maximumFractionDigits: 1, signDisplay: "exceptZero", ...props.deltaFormat }));
</script>

<template>
  <NqCard
    data-slot="stat-card"
    :data-trend="delta === undefined ? undefined : trend"
    :data-tone="delta === undefined ? undefined : tone"
    :aria-busy="loading || undefined"
    :class="cn('gap-3 px-4 py-4', props.class)"
  >
    <div v-if="loading" data-slot="stat-card-skeleton" class="flex flex-col gap-3">
      <NqSkeleton class="h-3.5 w-24" />
      <NqSkeleton class="h-8 w-32" />
      <NqSkeleton class="h-3.5 w-20" />
    </div>
    <template v-else>
      <div class="flex items-center gap-2">
        <span
          v-if="$slots.icon"
          data-slot="stat-card-icon"
          aria-hidden="true"
          class="grid size-8 shrink-0 place-items-center rounded-control bg-secondary text-muted-foreground [&_svg]:size-4"
        >
          <slot name="icon" />
        </span>
        <div data-slot="stat-card-label" class="min-w-0 truncate text-body-sm text-muted-foreground">
          <slot name="label">{{ label }}</slot>
        </div>
      </div>
      <div class="flex items-end justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
          <div data-slot="stat-card-value" class="text-h2 leading-tight text-foreground tabular-nums">
            <slot name="value"><NqNum v-if="typeof value === 'number'" :value="value" :format="format" /></slot>
          </div>
          <div v-if="delta !== undefined" data-slot="stat-card-delta" class="flex flex-wrap items-center gap-x-1.5 text-caption">
            <span :class="cn('inline-flex items-center gap-1 text-label', toneText[tone])">
              <component :is="TrendIcon" aria-hidden="true" class="size-3.5 shrink-0 rtl:-scale-x-100" />
              <NqNum :value="delta" :format="deltaFmt" />
            </span>
            <span v-if="deltaLabel" class="text-muted-foreground">{{ deltaLabel }}</span>
          </div>
        </div>
        <NqSparkline v-if="sparkline?.length" :data="sparkline" :color="toneColor[tone]" :label="sparklineLabel" class="w-24" />
      </div>
    </template>
  </NqCard>
</template>
