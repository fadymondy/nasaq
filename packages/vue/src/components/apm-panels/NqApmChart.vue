<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqChartContainer, type ChartConfig } from "../chart";
import { labelIndices, niceTicks } from "./apm-chart-math";

// Internal: the hand-drawn line and area chart of the APM panels (the React ones are Recharts charts). Horizontal grid, a y-axis
// column, optional dashed guide line, and an invisible dot per reading that shows on hover with its time and value in the
// native tooltip. The SVG mirrors in RTL and dots use logical offsets, so time runs right to left.
export interface ApmChartRow {
  /** The x label, already formatted. */
  label: string;
  values: Record<string, number>;
}
interface Props {
  config: ChartConfig;
  keys: readonly string[];
  rows: readonly ApmChartRow[];
  kind?: "line" | "area";
  /** Formats a y tick. */
  tick: (n: number) => string;
  /** Formats a reading for the dot tooltip. */
  value: (n: number) => string;
  reference?: { value: number; label: string };
  label: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { kind: "line", reference: undefined });

const ticks = computed(() => {
  let max = 0;
  for (const r of props.rows) for (const k of props.keys) max = Math.max(max, r.values[k] ?? 0);
  if (props.reference) max = Math.max(max, props.reference.value);
  return niceTicks(max);
});
const top = computed(() => ticks.value[0] ?? 1);
const yOf = (v: number) => 100 - (v / top.value) * 100;
const xOf = (i: number) => (props.rows.length === 1 ? 50 : (i / (props.rows.length - 1)) * 100);
const series = computed(() =>
  props.keys.map((key) => {
    const pts = props.rows.map((r, i) => ({ x: xOf(i), y: yOf(r.values[key] ?? 0), v: r.values[key] ?? 0, label: r.label }));
    const line = pts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");
    const area = pts.length ? `${pts[0]!.x.toFixed(2)},100 ${line} ${pts[pts.length - 1]!.x.toFixed(2)},100` : "";
    return { key, pts, line, area };
  }),
);
const xLabels = computed(() => labelIndices(props.rows.length).map((i) => props.rows[i]!.label));
</script>

<template>
  <NqChartContainer :config="config" :label="label" :class="cn('aspect-auto flex-col justify-start gap-2', props.class)">
    <div class="flex min-h-0 flex-1 gap-2">
      <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
        <span v-for="(tk, i) in ticks" :key="i">{{ tick(tk) }}</span>
      </div>
      <div class="relative min-w-0 flex-1 border-b border-border">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
          <line v-for="(tk, i) in ticks.slice(0, -1)" :key="i" x1="0" x2="100" :y1="yOf(tk)" :y2="yOf(tk)" stroke="var(--border)" stroke-width="1" vector-effect="non-scaling-stroke" />
          <line v-if="reference" x1="0" x2="100" :y1="yOf(reference.value)" :y2="yOf(reference.value)" stroke="var(--nq-warning)" stroke-width="1.5" stroke-dasharray="2 4" vector-effect="non-scaling-stroke" />
          <template v-for="s in series" :key="s.key">
            <polygon v-if="kind === 'area'" :points="s.area" :fill="`var(--color-${s.key})`" fill-opacity="0.14" />
            <polyline :points="s.line" fill="none" :stroke="`var(--color-${s.key})`" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          </template>
        </svg>
        <span v-if="reference" class="absolute end-1 text-caption text-nq-warning-text" :style="{ top: `${yOf(reference.value)}%` }">{{ reference.label }}</span>
        <template v-for="s in series" :key="`dots-${s.key}`">
          <span
            v-for="(p, i) in s.pts"
            :key="i"
            data-slot="chart-dot"
            :title="`${p.label}: ${config[s.key]?.label ?? s.key} ${value(p.v)}`"
            class="absolute size-2 -translate-y-1/2 rounded-full bg-[var(--color-key)] opacity-0 hover:opacity-100 ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${p.x}%`, top: `${p.y}%`, '--color-key': `var(--color-${s.key})` }"
          />
        </template>
      </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-14 text-muted-foreground">
      <span v-for="(l, i) in xLabels" :key="i">{{ l }}</span>
    </div>
  </NqChartContainer>
</template>
