<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useFormatNumber, type FormatNumberOptions } from "../numeric";
import type { ChartConfig, ChartPayloadItem } from "./chart";

// Tooltip card: heading, then one row per series with a colour key, its label and a tabular figure.
// Feed it the active point from your chart library's tooltip: <NqChartTooltipContent :payload="rows" :label="x" :config="config" />.
interface Props {
  active?: boolean;
  payload?: readonly ChartPayloadItem[];
  label?: string | number;
  config?: ChartConfig;
  /** Intl options for the values, e.g. `{ style: "currency", currency: "SAR" }`. Formatted in the active locale. */
  valueFormat?: FormatNumberOptions;
  /** Format the heading (the category / X value). */
  labelFormatter?: (label: string | number | undefined) => string;
  /** Hide the heading. */
  hideLabel?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: true, payload: undefined, label: undefined, config: () => ({}), valueFormat: undefined, labelFormatter: undefined });
const fmt = useFormatNumber();
const nq = useNasaq();

const heading = computed(() => (props.labelFormatter ? props.labelFormatter(props.label) : (props.config[String(props.label)]?.label ?? props.label)));
const rows = computed(() =>
  (props.payload ?? []).map((item, i) => {
    const key = String(typeof item.dataKey === "string" || typeof item.dataKey === "number" ? item.dataKey : (item.name ?? ""));
    const series = props.config[key] ?? (item.name !== undefined ? props.config[String(item.name)] : undefined);
    const color = item.payload?.fill ?? item.color ?? item.fill ?? `var(--color-${key})`;
    const raw = Array.isArray(item.value) ? item.value[item.value.length - 1] : item.value;
    const value = Number(raw);
    return { id: `${key}-${i}`, color, label: series?.label ?? item.name, text: Number.isFinite(value) ? fmt(value, props.valueFormat) : String(raw ?? "") };
  }),
);
</script>

<template>
  <div
    v-if="props.active && props.payload?.length"
    data-slot="chart-tooltip"
    :dir="nq.isRtl.value ? 'rtl' : 'ltr'"
    :class="cn('grid min-w-32 gap-1.5 rounded-control border border-border bg-popover px-2.5 py-1.5 text-caption text-popover-foreground shadow-md', props.class)"
  >
    <div v-if="!props.hideLabel && heading !== undefined && heading !== ''" class="text-label">{{ heading }}</div>
    <div class="grid gap-1">
      <div v-for="row in rows" :key="row.id" class="flex items-center gap-2">
        <span aria-hidden="true" class="size-2.5 shrink-0 rounded-[2px]" :style="{ backgroundColor: row.color }" />
        <span class="text-muted-foreground">{{ row.label }}</span>
        <span class="ms-auto ps-3 text-label tabular-nums">{{ row.text }}</span>
      </div>
    </div>
  </div>
</template>
