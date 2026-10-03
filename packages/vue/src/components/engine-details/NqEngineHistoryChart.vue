<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqChartContainer, NqChartLegendContent, type ChartConfig } from "../chart";

// Internal: the hand-drawn bar chart of EngineDetails (the React one is a Recharts BarChart). Flex lays the bars out in reading
// order, so time runs right to left in RTL. Each column is one bar, or a stack of segments; a title on it names the values.
export interface ChartBar {
  label: string;
  /** Segments bottom to top, keys from `config`. */
  values: Record<string, number>;
}

interface Props {
  config: ChartConfig;
  bars: readonly ChartBar[];
  /** Accessible name; a chart is an image to a screen reader. */
  label: string;
  /** Stack the segments of each bar and show a legend. */
  stacked?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { stacked: false });

const keys = computed(() => Object.keys(props.config));
const total = (bar: ChartBar) => keys.value.reduce((sum, k) => sum + (bar.values[k] ?? 0), 0);
const max = computed(() => Math.max(1, ...props.bars.map(total)));
const columns = computed(() =>
  props.bars.map((bar, i) => ({
    i,
    label: bar.label,
    title: `${bar.label}: ${keys.value.map((k) => `${props.config[k]?.label ?? k} ${bar.values[k] ?? 0}`).join(", ")}`,
    segments: keys.value.map((k) => ({ key: k, pct: ((bar.values[k] ?? 0) / max.value) * 100 })),
  })),
);
const first = computed(() => props.bars[0]?.label ?? "");
const last = computed(() => props.bars[props.bars.length - 1]?.label ?? "");
const legend = computed(() => keys.value.map((k) => ({ dataKey: k, color: `var(--color-${k})` })));
</script>

<template>
  <NqChartContainer :config="config" :label="label" :class="cn('aspect-auto h-52 flex-col justify-start gap-2', props.class)">
    <div class="flex min-h-0 flex-1 gap-2">
      <div aria-hidden="true" class="flex w-7 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
        <span>{{ max }}</span>
        <span>0</span>
      </div>
      <div class="flex min-w-0 flex-1 items-end gap-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
        <div v-for="col in columns" :key="col.i" data-slot="chart-bar" :title="col.title" class="flex h-full min-w-0 flex-1 flex-col-reverse justify-start">
          <span
            v-for="(seg, s) in col.segments"
            :key="seg.key"
            class="block w-full"
            :class="{ 'rounded-t-[3px]': s === col.segments.length - 1 || (!stacked && col.segments.length === 1) }"
            :style="{ height: `${seg.pct}%`, backgroundColor: `var(--color-${seg.key})` }"
          />
        </div>
      </div>
    </div>
    <div aria-hidden="true" class="flex justify-between ps-9 text-muted-foreground">
      <span>{{ first }}</span>
      <span>{{ last }}</span>
    </div>
    <NqChartLegendContent v-if="stacked" :config="config" :payload="legend" />
  </NqChartContainer>
</template>
