<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqChartContainer, NqChartTooltipContent, type ChartConfig } from "../chart";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { timeSeriesDomain, timeSeriesLabelIndices, timeSeriesPaths, timeSeriesX, timeSeriesY } from "./geometry";

// Internal: the hand-drawn area chart of NqTimeSeriesPanel (the React one is a Recharts AreaChart): a filled current line, a dashed
// previous line behind it, horizontal guides and a hover tooltip. The plot mirrors in RTL, so time runs right to left.
interface Row {
  date: string;
  current: number;
  previous?: number;
}
const props = defineProps<{
  rows: readonly Row[];
  config: ChartConfig;
  /** Accessible name; a chart is an image to a screen reader. */
  label: string;
  lowerIsBetter?: boolean;
  format?: FormatNumberOptions;
  compare?: boolean;
  referenceLines?: readonly { value: number; label: string; tone?: "success" | "warning" | "danger" }[];
  fmtDate: (date: string, withTime?: boolean) => string;
  class?: HTMLAttributes["class"];
}>();

const lineColor = { success: "var(--nq-success)", warning: "var(--nq-warning)", danger: "var(--nq-danger)" };
const nq = useNasaq();
const id = useId();
const reversed = computed(() => !!props.lowerIsBetter);
// The axis fits the previous period too, so toggling the comparison does not rescale the chart.
const domain = computed(() =>
  timeSeriesDomain(
    props.rows.flatMap((r) => [r.current, ...(r.previous !== undefined ? [r.previous] : [])]),
    reversed.value,
  ),
);
const current = computed(() =>
  timeSeriesPaths(
    props.rows.map((r) => r.current),
    domain.value,
    reversed.value,
  ),
);
const previous = computed(() =>
  timeSeriesPaths(
    props.rows.map((r) => r.previous),
    domain.value,
    reversed.value,
  ),
);
const percent = computed(() => props.format?.style === "percent");
const tickFormat = computed<FormatNumberOptions>(() => (percent.value ? { style: "percent", maximumFractionDigits: 1 } : { notation: "compact", maximumFractionDigits: 1 }));
const xLabels = computed(() => timeSeriesLabelIndices(props.rows.length).map((i) => ({ i, text: props.fmtDate(props.rows[i]!.date) })));
const guides = computed(() => (props.referenceLines ?? []).filter((r) => r.value >= Math.min(domain.value.lo, domain.value.hi) && r.value <= domain.value.hi));

const hover = ref<number | null>(null);
function onMove(e: PointerEvent) {
  const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
  if (!box.width || !props.rows.length) return;
  let f = (e.clientX - box.left) / box.width;
  if (nq.isRtl.value) f = 1 - f;
  hover.value = Math.min(props.rows.length - 1, Math.max(0, Math.round(f * (props.rows.length - 1))));
}
const point = computed(() => (hover.value === null ? undefined : props.rows[hover.value]));
const payload = computed(() => {
  const p = point.value;
  if (!p) return [];
  return [{ dataKey: "current", value: p.current }, ...(props.compare && p.previous !== undefined ? [{ dataKey: "previous", value: p.previous }] : [])];
});
</script>

<template>
  <NqChartContainer :config="config" :label="label" :class="cn('aspect-auto flex-col justify-start gap-2', props.class)">
    <div class="flex min-h-0 flex-1 gap-2">
      <div aria-hidden="true" class="relative w-11 shrink-0 text-end text-muted-foreground">
        <span v-for="t in domain.ticks" :key="t" class="absolute inset-x-0 -translate-y-1/2 truncate" :style="{ top: `${timeSeriesY(t, domain, reversed)}%` }">
          <NqNum :value="t" :format="tickFormat" />
        </span>
      </div>
      <div data-slot="time-series-plot" class="relative min-w-0 flex-1" @pointermove="onMove" @pointerleave="hover = null">
        <span v-for="t in domain.ticks" :key="t" aria-hidden="true" class="absolute inset-x-0 border-t border-border" :style="{ top: `${timeSeriesY(t, domain, reversed)}%` }" />
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false" class="absolute inset-0 size-full overflow-visible rtl:-scale-x-100">
          <defs>
            <linearGradient :id="`${id}-fill`" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style="stop-color: var(--color-current); stop-opacity: 0.28" />
              <stop offset="100%" style="stop-color: var(--color-current); stop-opacity: 0.02" />
            </linearGradient>
          </defs>
          <line
            v-for="r in guides"
            :key="r.label"
            x1="0"
            x2="100"
            :y1="timeSeriesY(r.value, domain, reversed)"
            :y2="timeSeriesY(r.value, domain, reversed)"
            :stroke="lineColor[r.tone ?? 'warning']"
            stroke-dasharray="2 4"
            vector-effect="non-scaling-stroke"
          />
          <path v-if="compare && previous.line" data-slot="time-series-previous" :d="previous.line" fill="none" stroke="var(--color-previous)" stroke-dasharray="4 4" stroke-width="1.5" vector-effect="non-scaling-stroke" stroke-linejoin="round" />
          <path :d="current.area" :fill="`url(#${id}-fill)`" stroke="none" />
          <path data-slot="time-series-current" :d="current.line" fill="none" stroke="var(--color-current)" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
        </svg>
        <span
          v-for="r in guides"
          :key="`l-${r.label}`"
          aria-hidden="true"
          class="absolute end-0 -translate-y-full text-[11px]"
          :style="{ top: `${timeSeriesY(r.value, domain, reversed)}%`, color: lineColor[r.tone ?? 'warning'] }"
        >{{ r.label }}</span>
        <template v-if="point && hover !== null">
          <span aria-hidden="true" class="pointer-events-none absolute inset-y-0 w-px bg-border" :style="{ insetInlineStart: `${timeSeriesX(hover, rows.length)}%` }" />
          <span
            aria-hidden="true"
            data-slot="chart-dot"
            class="pointer-events-none absolute size-2 -translate-y-1/2 rounded-full bg-[var(--color-current)] ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${timeSeriesX(hover, rows.length)}%`, top: `${timeSeriesY(point.current, domain, reversed)}%` }"
          />
          <div
            class="pointer-events-none absolute top-0 z-10 ltr:-translate-x-1/2 rtl:translate-x-1/2"
            :style="{ insetInlineStart: `${Math.min(85, Math.max(15, timeSeriesX(hover, rows.length)))}%` }"
          >
            <NqChartTooltipContent :config="config" :payload="payload" :label="point.date" :value-format="format" :label-formatter="(l) => fmtDate(String(l))" />
          </div>
        </template>
      </div>
    </div>
    <div aria-hidden="true" class="relative h-4 ms-[3.25rem]">
      <span
        v-for="x in xLabels"
        :key="x.i"
        class="absolute top-0 whitespace-nowrap"
        :class="x.i === 0 ? 'start-0' : x.i === rows.length - 1 ? 'end-0' : 'ltr:-translate-x-1/2 rtl:translate-x-1/2'"
        :style="x.i === 0 || x.i === rows.length - 1 ? undefined : { insetInlineStart: `${timeSeriesX(x.i, rows.length)}%` }"
      >{{ x.text }}</span>
    </div>
  </NqChartContainer>
</template>
