<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqChartContainer, type ChartConfig } from "../chart";
import { formatNumber } from "../numeric";
import { chartRows, chartSeriesKey, type ChartBlock } from "./report-math";
import { reportText, type ReportLabels } from "./strings";

// A bar, line or area chart of a chart block. The React one is a Recharts chart; this one is hand-drawn SVG (no chart library), so it has
// no hover cursor: each bar and dot carries a <title> with its values, and the legend names the series when there are several. The SVG
// mirrors in RTL, so time runs right to left.
interface Props {
  block: ChartBlock;
  labels?: ReportLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => reportText(locale.value, props.labels));
const n = (v: number) => formatNumber(v, locale.value);
const compact = (v: number) => formatNumber(v, locale.value, { notation: "compact" });
const kindName = computed(() => ({ bar: t.value.kindBar, line: t.value.kindLine, area: t.value.kindArea })[props.block.kind]);

const names = computed(() => props.block.series.map((s, i) => s || t.value.defaultSeries(n(i + 1))));
const config = computed<ChartConfig>(() => Object.fromEntries(props.block.series.map((_, i) => [chartSeriesKey(i), { label: names.value[i] }])));
const data = computed(() => chartRows(props.block));
const keys = computed(() => props.block.series.map((_, i) => chartSeriesKey(i)));
const summary = computed(() => t.value.chartSummary(props.block.title, kindName.value, n(props.block.rows.length), n(props.block.series.length)));

const bounds = computed(() => {
  const values = data.value.flatMap((row) => keys.value.map((k) => row[k] as number));
  const lo = Math.min(0, ...values);
  const hi = Math.max(0, ...values);
  return hi === lo ? { lo, hi: lo + 1 } : { lo, hi };
});
const y = (v: number) => 100 - ((v - bounds.value.lo) / (bounds.value.hi - bounds.value.lo)) * 100;
const zero = computed(() => y(0));
const count = computed(() => Math.max(1, data.value.length));
const x = (i: number) => (count.value === 1 ? 50 : (i / (count.value - 1)) * 100);

// Bars: each row is a slot, the series share it.
const bars = computed(() => {
  const slot = 100 / count.value;
  const seriesCount = Math.max(1, keys.value.length);
  const barW = (slot * 0.7) / seriesCount;
  return data.value.flatMap((row, ri) =>
    keys.value.map((k, si) => {
      const v = row[k] as number;
      const top = Math.min(y(v), zero.value);
      return { key: `${ri}-${si}`, si, x: ri * slot + slot * 0.15 + si * barW, w: barW, y: top, h: Math.abs(y(v) - zero.value), tip: `${row.label}, ${names.value[si]}: ${n(v)}` };
    }),
  );
});
const lines = computed(() =>
  keys.value.map((k, si) => {
    const pts = data.value.map((row, i) => `${x(i)},${y(row[k] as number)}`);
    return { si, line: pts.join(" "), area: `${x(0)},${zero.value} ${pts.join(" ")} ${x(data.value.length - 1)},${zero.value}` };
  }),
);
const dots = computed(() => keys.value.flatMap((k, si) => data.value.map((row, i) => ({ key: `${si}-${i}`, si, x: x(i), y: y(row[k] as number), tip: `${row.label}, ${names.value[si]}: ${n(row[k] as number)}` }))));
</script>

<template>
  <NqChartContainer :config="config" :label="summary" :class="cn('aspect-auto h-64 flex-col justify-start gap-2', props.class)">
    <div data-slot="report-chart" :data-kind="props.block.kind" class="flex min-h-0 flex-1 gap-2">
      <div aria-hidden="true" class="flex w-12 shrink-0 flex-col justify-between text-end text-muted-foreground tabular-nums">
        <span>{{ compact(bounds.hi) }}</span>
        <span>{{ compact(bounds.lo) }}</span>
      </div>
      <div class="relative min-w-0 flex-1 border-b border-border bg-[linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[length:100%_50%]">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
          <template v-if="props.block.kind === 'bar'">
            <rect v-for="b in bars" :key="b.key" data-slot="report-bar" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :fill="`var(--color-${chartSeriesKey(b.si)})`"><title>{{ b.tip }}</title></rect>
          </template>
          <template v-else>
            <polygon v-for="l in lines" v-show="props.block.kind === 'area'" :key="`a${l.si}`" :points="l.area" :fill="`var(--color-${chartSeriesKey(l.si)})`" fill-opacity="0.16" />
            <polyline v-for="l in lines" :key="`l${l.si}`" data-slot="report-line" :points="l.line" fill="none" :stroke="`var(--color-${chartSeriesKey(l.si)})`" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          </template>
        </svg>
        <template v-if="props.block.kind !== 'bar'">
          <span
            v-for="d in dots"
            :key="d.key"
            data-slot="chart-dot"
            :title="d.tip"
            class="absolute size-1.5 -translate-y-1/2 rounded-full ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${d.x}%`, top: `${d.y}%`, backgroundColor: `var(--color-${chartSeriesKey(d.si)})` }"
          />
        </template>
      </div>
    </div>
    <div aria-hidden="true" class="flex justify-between gap-1 ps-14 text-muted-foreground">
      <span v-for="(row, i) in data" :key="i" class="min-w-0 truncate">{{ row.label }}</span>
    </div>
    <ul v-if="props.block.series.length > 1" data-slot="chart-legend" class="flex flex-wrap justify-center gap-3 text-muted-foreground">
      <li v-for="(name, si) in names" :key="si" class="inline-flex items-center gap-1.5">
        <span aria-hidden="true" class="size-2 rounded-[2px]" :style="{ backgroundColor: `var(--color-${chartSeriesKey(si)})` }" />{{ name }}
      </li>
    </ul>
  </NqChartContainer>
</template>
