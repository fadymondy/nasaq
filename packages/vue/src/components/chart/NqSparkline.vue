<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { sparklinePaths, type ChartPoint } from "./chart";

// Axis-less trend line for table cells and cards. Sized by its box (default 8rem x 2rem); time runs right to
// left in RTL. No tooltip: put the figure next to it. Drawn as plain SVG, no chart library needed.
interface Props {
  /** Values in order. Either numbers or `{ value }` objects. */
  data: readonly ChartPoint[];
  /** Any CSS colour, normally a token. Default: the brand colour. */
  color?: string;
  /** Screen-reader summary, e.g. "Revenue, last 12 weeks, up 12%". Without it the chart is hidden from assistive tech. */
  label?: string;
  /** Fill the area under the line. Default true. */
  fill?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { color: "var(--primary)", label: undefined, fill: true });
const id = useId();
const paths = computed(() => sparklinePaths(props.data));
</script>

<template>
  <div
    data-slot="sparkline"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : true"
    :class="cn('h-8 w-32 shrink-0', props.class)"
  >
    <svg viewBox="0 0 128 32" preserveAspectRatio="none" class="size-full overflow-visible rtl:-scale-x-100" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient :id="id" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" :stop-color="props.color" stop-opacity="0.3" />
          <stop offset="100%" :stop-color="props.color" stop-opacity="0" />
        </linearGradient>
      </defs>
      <path v-if="props.fill" :d="paths.area" :fill="`url(#${id})`" stroke="none" />
      <path :d="paths.line" fill="none" :stroke="props.color" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  </div>
</template>
