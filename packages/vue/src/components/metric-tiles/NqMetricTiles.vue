<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatNumber, type FormatNumberOptions } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { useNasaq } from "../../provider";
import { changeRatio, useAnalyticsLabels } from "./analytics-shared";

// Row of KPI tiles that each compare against the previous period: the figure, a signed percentage with an arrow and tone, the previous
// figure, and an optional trend line. Built on StatCard; selectable tiles drive a chart elsewhere on the page.

const STRINGS = {
  en: { vsPrevious: "vs previous period", was: "was", group: "Key metrics" },
  ar: { vsPrevious: "مقارنة بالفترة السابقة", was: "كانت", group: "المؤشرات الرئيسية" },
};

export type MetricTilesLabels = typeof STRINGS.en;

export interface MetricTileData {
  id: string;
  /** What is measured. Localise it. */
  label: string;
  /** The figure for the current period. */
  value: number;
  /** The same figure for the comparison period. Gives the delta and the "was" value. */
  previous?: number;
  /** Intl options for `value` and `previous`. */
  format?: FormatNumberOptions;
  /** Replaces the formatted value, for figures Intl cannot format such as a duration ("2m 14s"). */
  display?: string;
  /** Replaces the formatted previous value the same way. */
  previousDisplay?: string;
  /** Lower is better (bounce rate, load time, position, errors). */
  invert?: boolean;
  /** Values for the trend line. */
  sparkline?: readonly number[];
  sparklineLabel?: string;
  /** A lucide icon component. */
  icon?: Component;
}

interface Props {
  metrics: readonly MetricTileData[];
  /** Id of the metric that is selected. With `onSelect`, tiles become toggle buttons that drive a chart. */
  selected?: string;
  /** Makes the tiles selectable. */
  onSelect?: (id: string) => void;
  /** Text after each delta. Default "vs previous period". */
  comparisonLabel?: string;
  loading?: boolean;
  /** How many skeleton tiles to show while `loading` and `metrics` is empty. Default 4. */
  skeletons?: number;
  labels?: Partial<MetricTilesLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  selected: undefined,
  onSelect: undefined,
  comparisonLabel: undefined,
  loading: false,
  skeletons: 4,
  labels: undefined,
});

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();

function deltaLabel(m: MetricTileData) {
  if (m.previous === undefined) return undefined;
  const was = m.previousDisplay ?? formatNumber(m.previous, nq.locale.value, m.format);
  return `${props.comparisonLabel ?? t.value.vsPrevious} · ${t.value.was} ${was}`;
}
</script>

<template>
  <NqStatGrid v-if="loading && metrics.length === 0" data-slot="metric-tiles" aria-busy="true" :class="props.class">
    <NqStatCard v-for="i in skeletons" :key="i" label="" :value="0" loading />
  </NqStatGrid>
  <NqStatGrid v-else data-slot="metric-tiles" role="group" :aria-label="t.group" :class="props.class">
    <template v-for="m in metrics" :key="m.id">
      <component :is="onSelect ? 'button' : 'div'" v-bind="onSelect ? { type: 'button', 'aria-pressed': selected === m.id, class: 'rounded-card text-start outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', onClick: () => onSelect?.(m.id) } : { class: 'contents' }">
        <NqStatCard
          :label="m.label"
          :value="m.display === undefined ? m.value : undefined"
          :format="m.format"
          :delta="changeRatio(m.value, m.previous)"
          :invert="m.invert"
          :loading="loading"
          :delta-label="deltaLabel(m)"
          :sparkline="m.sparkline"
          :sparkline-label="m.sparklineLabel"
          :class="cn(onSelect && 'h-full', onSelect && selected === m.id && 'border-primary ring-1 ring-primary')"
          :data-metric="m.id"
        >
          <template v-if="m.icon" #icon><component :is="m.icon" /></template>
          <template v-if="m.display !== undefined" #value>{{ m.display }}</template>
        </NqStatCard>
      </component>
    </template>
  </NqStatGrid>
</template>
