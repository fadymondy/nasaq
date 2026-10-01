<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import type { ChartConfig, ChartLegendItem } from "./chart";

// Legend row: a colour key and the series label from `config`.
interface Props {
  config?: ChartConfig;
  payload?: readonly ChartLegendItem[];
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { config: () => ({}), payload: undefined });
const items = computed(() =>
  (props.payload ?? []).map((item, i) => {
    const key = String(typeof item.dataKey === "string" || typeof item.dataKey === "number" ? item.dataKey : (item.value ?? ""));
    const series = props.config[key] ?? props.config[String(item.value)];
    return { id: `${key}-${i}`, color: item.payload?.fill ?? item.color, label: series?.label ?? item.value };
  }),
);
</script>

<template>
  <ul v-if="props.payload?.length" data-slot="chart-legend" :class="cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-3 text-caption', props.class)">
    <li v-for="item in items" :key="item.id" class="flex items-center gap-1.5 text-muted-foreground">
      <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" :style="{ backgroundColor: item.color }" />
      {{ item.label }}
    </li>
  </ul>
</template>
