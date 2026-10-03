<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { toRows, type ChartPoint } from "./chart";

// Axis-less bar strip for table cells and cards. Same sizing and RTL rules as NqSparkline (flex lays the bars
// out in reading order, so time runs right to left in RTL).
interface Props {
  /** Values in order. Either numbers or `{ value }` objects. */
  data: readonly ChartPoint[];
  /** Any CSS colour, normally a token. Default: the brand colour. */
  color?: string;
  /** Screen-reader summary. Without it the chart is hidden from assistive tech. */
  label?: string;
  /** Index of a bar to emphasise (the others are dimmed), e.g. the current period. */
  highlight?: number;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { color: "var(--primary)", label: undefined, highlight: undefined });
const bars = computed(() => {
  const rows = toRows(props.data);
  const max = Math.max(0, ...rows.map((r) => r.value));
  return rows.map((r) => ({ i: r.i, pct: max ? Math.max(r.value, 0) / max : 0 }));
});
</script>

<template>
  <div
    data-slot="mini-bar"
    :role="props.label ? 'img' : undefined"
    :aria-label="props.label"
    :aria-hidden="props.label ? undefined : true"
    :class="cn('h-8 w-32 shrink-0', props.class)"
  >
    <div class="flex size-full items-end gap-0.5 pt-0.5">
      <span
        v-for="bar in bars"
        :key="bar.i"
        class="min-w-0 flex-1 rounded-[2px]"
        :style="{ height: `${bar.pct * 100}%`, backgroundColor: props.color, opacity: props.highlight === undefined || props.highlight === bar.i ? 1 : 0.35 }"
      />
    </div>
  </div>
</template>
