<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { CHART_COLORS } from "../chart";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, useFormatNumber, type FormatNumberOptions } from "../numeric";
import { segmentShares } from "./chart-extras-math";
import { CHART_EXTRAS_STRINGS, type ChartExtrasLabels } from "./strings";

// One bar cut into proportional segments with a legend that carries the values, so nothing depends on colour alone.
// Segments grow from the inline start: the bar reads right to left in Arabic.
const PERCENT: FormatNumberOptions = { style: "percent", maximumFractionDigits: 1 };
const PERCENT_WHOLE: FormatNumberOptions = { style: "percent", maximumFractionDigits: 0 };

/* Four hatch patterns laid over a fill, so a segment can be told apart without its colour. */
const PATTERNS = [
  undefined,
  "repeating-linear-gradient(135deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)",
  "repeating-linear-gradient(45deg, color-mix(in oklab, var(--card) 55%, transparent) 0 2px, transparent 2px 7px)",
  "radial-gradient(color-mix(in oklab, var(--card) 65%, transparent) 1.2px, transparent 1.6px) 0 0 / 6px 6px",
] as const;

export interface SegmentBarSegment {
  id: string;
  /** Name shown in the legend. Localise it. */
  label: string;
  value: number;
  /** Any CSS colour, normally a token. Default: the chart palette entry for the position. */
  color?: string;
}

const props = withDefaults(
  defineProps<{
    segments: readonly SegmentBarSegment[];
    /** Total the bar is measured against. Larger than the sum leaves the rest as an empty track (6 of 10 seats). */
    total?: number;
    /** Intl options for the values in the legend. */
    format?: FormatNumberOptions;
    /** Legend under the bar with each segment's value and share. Default true. */
    legend?: boolean;
    /** Put the share inside segments wide enough to hold it. Default true. */
    inlineLabels?: boolean;
    /** Overlay hatch patterns so segments differ by more than colour. Default false; the legend already names every segment. */
    patterned?: boolean;
    size?: "sm" | "md" | "lg";
    /** Screen-reader summary of the bar. Default: the segments and their shares. */
    label?: string;
    /** Legend text for the empty track. (Or the `rest-label` slot.) */
    restLabel?: string;
    labels?: Partial<ChartExtrasLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { total: undefined, format: undefined, legend: true, inlineLabels: true, patterned: false, size: "md", label: undefined, restLabel: undefined, labels: undefined },
);

const t = useAnalyticsLabels(CHART_EXTRAS_STRINGS, () => props.labels);
const fmt = useFormatNumber();
const barHeight = { sm: "h-2", md: "h-4", lg: "h-7" } as const;
const calc = computed(() => segmentShares(props.segments, props.total));
const summary = computed(() => props.label ?? t.value.segments(props.segments.map((s, i) => `${s.label} ${fmt(calc.value.shares[i]!.share, PERCENT_WHOLE)}`).join(", ")));
const colorOf = (s: SegmentBarSegment, i: number) => s.color ?? CHART_COLORS[i % CHART_COLORS.length]!;
const patternOf = (i: number) => (props.patterned ? PATTERNS[i % PATTERNS.length] : undefined);
</script>

<template>
  <div data-slot="segment-bar" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <div role="img" :aria-label="summary" :class="cn('flex w-full gap-0.5 overflow-hidden rounded-full bg-nq-surface-soft', barHeight[size])">
      <template v-for="(s, i) in segments" :key="s.id">
        <span
          v-if="calc.shares[i]!.share > 0"
          data-slot="segment-bar-segment"
          :title="`${s.label}: ${fmt(calc.shares[i]!.value, format)} (${fmt(calc.shares[i]!.share, PERCENT)})`"
          :style="{ flexGrow: calc.shares[i]!.value, flexBasis: 0, backgroundColor: colorOf(s, i), backgroundImage: patternOf(i) }"
          class="flex min-w-1 items-center justify-center overflow-hidden text-caption text-primary-foreground first:rounded-s-full last:rounded-e-full"
        >
          <span v-if="inlineLabels && size !== 'sm' && calc.shares[i]!.share >= 0.1" class="px-1 tabular-nums [text-shadow:0_0_2px_rgb(0_0_0/0.35)]">{{ fmt(calc.shares[i]!.share, PERCENT_WHOLE) }}</span>
        </span>
      </template>
      <span v-if="calc.rest > 0" aria-hidden="true" :style="{ flexGrow: calc.rest, flexBasis: 0 }" />
    </div>
    <ul v-if="legend" data-slot="segment-bar-legend" class="grid gap-x-6 gap-y-1.5 text-body-sm [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
      <li v-for="(s, i) in segments" :key="s.id" class="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" :style="{ backgroundColor: colorOf(s, i), backgroundImage: patternOf(i) }" />
        <span class="min-w-0 flex-1 truncate text-muted-foreground">{{ s.label }}</span>
        <span class="tabular-nums text-foreground"><NqNum :value="s.value" :format="format" /></span>
        <span class="w-12 text-end tabular-nums text-muted-foreground"><NqNum :value="calc.shares[i]!.share" :format="PERCENT_WHOLE" /></span>
      </li>
      <li v-if="calc.rest > 0 && (restLabel || $slots['rest-label'])" class="flex min-w-0 items-center gap-2">
        <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px] border border-border bg-nq-surface-soft" />
        <span class="min-w-0 flex-1 truncate text-muted-foreground"><slot name="rest-label">{{ restLabel }}</slot></span>
        <span class="tabular-nums text-foreground"><NqNum :value="calc.rest" :format="format" /></span>
        <span class="w-12" />
      </li>
    </ul>
  </div>
</template>
