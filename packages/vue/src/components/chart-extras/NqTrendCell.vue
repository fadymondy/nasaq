<script setup lang="ts">
import { ArrowDown, ArrowUp, Minus } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqMiniBar, NqSparkline } from "../chart";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { CHART_EXTRAS_STRINGS, type ChartExtrasLabels } from "./strings";

// A table-row cell: the figure, its change and a small line or bar chart beside it. Built for data-table columns, so a
// row can show a trend without a chart of its own. The change is an arrow and a signed number as well as a colour.
const props = withDefaults(
  defineProps<{
    /** The figure for the row. A number is formatted with `format`; for anything else fill the default slot. */
    value?: number;
    format?: FormatNumberOptions;
    /** Values for the small chart, oldest first. */
    data?: readonly number[];
    /** "line" (default) draws a sparkline, "bar" a mini bar. */
    variant?: "line" | "bar";
    /** Change against the previous period as a fraction: 0.124 is +12.4%. */
    delta?: number;
    /** Down is good (costs, errors). */
    invert?: boolean;
    /** Bar index to emphasise (the current period), for `variant="bar"`. */
    highlight?: number;
    /** Screen-reader summary of the small chart. Without it the chart is decorative. */
    chartLabel?: string;
    labels?: Partial<ChartExtrasLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { value: undefined, format: undefined, data: undefined, variant: "line", delta: undefined, invert: false, highlight: undefined, chartLabel: undefined, labels: undefined },
);

const t = useAnalyticsLabels(CHART_EXTRAS_STRINGS, () => props.labels);
const dir = computed<"up" | "down" | "flat">(() => (props.delta === undefined || props.delta === 0 ? "flat" : props.delta > 0 ? "up" : "down"));
const good = computed(() => (dir.value === "flat" ? undefined : (dir.value === "up") !== props.invert));
const Icon = computed(() => (dir.value === "up" ? ArrowUp : dir.value === "down" ? ArrowDown : Minus));
const color = computed(() => (good.value === undefined ? "var(--primary)" : good.value ? "var(--nq-success)" : "var(--nq-danger)"));
</script>

<template>
  <div data-slot="trend-cell" :data-trend="dir" :class="cn('flex items-center justify-end gap-3', props.class)">
    <div class="flex flex-col items-end leading-tight">
      <span class="text-body-sm tabular-nums text-foreground"><slot><NqNum v-if="value !== undefined" :value="value" :format="format" /></slot></span>
      <span v-if="delta !== undefined" :class="cn('inline-flex items-center gap-0.5 text-caption tabular-nums', good === undefined ? 'text-muted-foreground' : good ? 'text-nq-success-text' : 'text-nq-danger-text')">
        <component :is="Icon" aria-hidden="true" class="size-3" />
        <span class="sr-only">{{ t[dir] }} </span>
        <NqNum :value="delta" :format="{ style: 'percent', maximumFractionDigits: 1, signDisplay: 'exceptZero' }" />
      </span>
    </div>
    <template v-if="data?.length">
      <NqMiniBar v-if="variant === 'bar'" :data="data" :color="color" :highlight="highlight ?? data.length - 1" :label="chartLabel" class="h-8 w-20" />
      <NqSparkline v-else :data="data" :color="color" :label="chartLabel" class="h-8 w-20" />
    </template>
  </div>
</template>
