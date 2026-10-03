<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { seriesVars, type ChartConfig } from "./chart";

// Sizes a chart to its box (default 16:9; pass class="h-64" or `aspect-*` to change it), defines
// `--color-<key>` for every series in `config`, and themes the chart's axes, grid and cursor with tokens.
// React wraps Recharts; Vue has no bundled chart library, so put any Vue chart (Unovis, ECharts, Chart.js) in the
// default slot and use `var(--color-<key>)` for its fills and strokes.
interface Props {
  config: ChartConfig;
  /** Accessible name for the chart; a chart is an image to a screen reader, so summarise it. */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const vars = computed(() => seriesVars(props.config));
</script>

<template>
  <div
    data-slot="chart"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    :style="vars"
    :class="
      cn(
        'flex aspect-video w-full justify-center text-caption',
        '[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground',
        '[&_.recharts-cartesian-grid_line]:stroke-border',
        '[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted',
        '[&_.recharts-dot]:stroke-card [&_.recharts-layer]:outline-hidden [&_.recharts-sector]:outline-hidden',
        '[&_.recharts-sector]:stroke-card [&_.recharts-surface]:outline-hidden',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
