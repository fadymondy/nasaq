<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqChartContainer, type ChartConfig } from "../chart";

// Internal: the hand-drawn line chart of HealthReport (the React one is a Recharts LineChart). A missing reading breaks the line
// instead of dropping to zero. The SVG mirrors in RTL and the dots use logical offsets, so time runs right to left.
export interface LinePoint {
  label: string;
  value: number | null;
}
interface Props {
  config: ChartConfig;
  points: readonly LinePoint[];
  /** Accessible name; a chart is an image to a screen reader. */
  label: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const bounds = computed(() => {
  const values = props.points.map((p) => p.value).filter((v): v is number => v !== null);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = hi === lo ? 1 : (hi - lo) * 0.1;
  return { lo: lo - pad, hi: hi + pad };
});
const fmt = (n: number) => String(Math.round(n * 10) / 10);
const plotted = computed(() => {
  const n = props.points.length;
  const { lo, hi } = bounds.value;
  return props.points.map((p, i) => ({
    ...p,
    x: n === 1 ? 50 : (i / (n - 1)) * 100,
    y: p.value === null ? null : 100 - ((p.value - lo) / (hi - lo)) * 100,
  }));
});
// One polyline per run of consecutive readings.
const runs = computed(() => {
  const out: string[] = [];
  let run: string[] = [];
  for (const p of plotted.value) {
    if (p.y === null) {
      if (run.length > 1) out.push(run.join(" "));
      run = [];
    } else run.push(`${p.x},${p.y}`);
  }
  if (run.length > 1) out.push(run.join(" "));
  return out;
});
const first = computed(() => props.points[0]?.label ?? "");
const last = computed(() => props.points[props.points.length - 1]?.label ?? "");
</script>

<template>
  <NqChartContainer :config="config" :label="label" :class="cn('aspect-auto h-64 flex-col justify-start gap-2', props.class)">
    <div class="flex min-h-0 flex-1 gap-2">
      <div aria-hidden="true" class="flex w-10 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
        <span>{{ fmt(bounds.hi) }}</span>
        <span>{{ fmt(bounds.lo) }}</span>
      </div>
      <div class="relative min-w-0 flex-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
          <polyline v-for="(run, i) in runs" :key="i" :points="run" fill="none" stroke="var(--color-value)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
        </svg>
        <template v-for="(p, i) in plotted" :key="i">
          <span
            v-if="p.y !== null"
            data-slot="chart-dot"
            :title="`${p.label}: ${p.value}`"
            class="absolute size-1.5 -translate-y-1/2 rounded-full bg-[var(--color-value)] ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${p.x}%`, top: `${p.y}%` }"
          />
        </template>
      </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-12 text-muted-foreground">
      <span>{{ first }}</span>
      <span>{{ last }}</span>
    </div>
  </NqChartContainer>
</template>
