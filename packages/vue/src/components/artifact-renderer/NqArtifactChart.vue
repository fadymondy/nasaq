<script setup lang="ts">
import { computed } from "vue";
import { NqChartContainer, NqChartLegendContent, type ChartConfig } from "../chart";
import { formatNumber } from "../numeric";
import { artifactCartesianGeometry, artifactPieGeometry } from "./artifact-chart";
import { pieSlices, type ChartArtifact } from "./artifact-renderer-logic";
import { useArtifactI18n, type ArtifactRendererLabels } from "./strings";

// The `chart` kind. React draws it with Recharts; here it is hand-drawn SVG (bars, lines, areas, pie, donut) so no chart library is
// needed. Series keys come from the agent, so they are mapped to s0, s1... (slices to p0, p1...) before they become CSS variable names.
const props = defineProps<{ artifact: ChartArtifact; labels?: Partial<ArtifactRendererLabels> }>();
const { t, tx, locale } = useArtifactI18n(() => props.labels);
const rtl = computed(() => locale.value.startsWith("ar"));
const fmt = (n: number) => formatNumber(n, locale.value, { notation: "compact", maximumFractionDigits: 1 });
const kind = computed(() => props.artifact.chart ?? "bar");
const isPie = computed(() => kind.value === "pie" || kind.value === "donut");

const slices = computed(() => (isPie.value ? pieSlices(props.artifact) : []));
const keys = computed(() => (isPie.value ? slices.value.map((_, i) => `p${i}`) : props.artifact.series.map((_, i) => `s${i}`)));
const config = computed<ChartConfig>(() =>
  isPie.value
    ? Object.fromEntries(slices.value.map((s, i) => [`p${i}`, { label: s.other ? t.value.other : s.name }]))
    : Object.fromEntries(props.artifact.series.map((s, i) => [`s${i}`, { label: tx(s.label), ...(s.color ? { color: s.color } : {}) }])),
);
const seriesLabels = computed(() => props.artifact.series.map((s) => tx(s.label)));

const cartesian = computed(() => {
  if (isPie.value) return null;
  const a = props.artifact;
  const data = a.data.map((row) => ({ x: row[a.xKey] as string | number, ...Object.fromEntries(a.series.map((s, i) => [`s${i}`, row[s.key] as number])) }));
  return artifactCartesianGeometry({ kind: kind.value as "bar" | "line" | "area", keys: keys.value, data, rtl: rtl.value, fmt, labels: seriesLabels.value });
});
const pie = computed(() =>
  isPie.value
    ? artifactPieGeometry(
        slices.value,
        kind.value === "donut",
        slices.value.map((s) => (s.other ? t.value.other : s.name)),
        (n) => formatNumber(n, locale.value),
      )
    : null,
);
const legend = computed(() => keys.value.map((k) => ({ dataKey: k, color: `var(--color-${k})` })));
const showLegend = computed(() => isPie.value || keys.value.length > 1);
</script>

<template>
  <NqChartContainer :config="config" :label="t.chartLabel(tx(artifact.title))" :class="isPie ? 'aspect-auto h-64 w-full flex-col' : 'aspect-auto h-56 w-full flex-col'">
    <svg v-if="cartesian" :viewBox="`0 0 ${cartesian.width} ${cartesian.height}`" class="min-h-0 w-full flex-1" aria-hidden="true" focusable="false">
      <line v-for="(g, i) in cartesian.grid" :key="`g${i}`" :x1="g.x1" :x2="g.x2" :y1="g.y" :y2="g.y" class="stroke-border" stroke-width="1" />
      <text v-for="(y, i) in cartesian.yTicks" :key="`y${i}`" :x="y.x" :y="y.y" :text-anchor="y.anchor" font-size="12" class="fill-muted-foreground">{{ y.text }}</text>
      <text v-for="(x, i) in cartesian.xTicks" :key="`x${i}`" :x="x.x" :y="x.y" text-anchor="middle" font-size="12" class="fill-muted-foreground">{{ x.text }}</text>
      <path v-for="(a, i) in cartesian.areas" :key="`a${i}`" :d="a.d" :fill="`var(--color-${a.key})`" fill-opacity="0.15" stroke="none" />
      <path v-for="(b, i) in cartesian.bars" :key="`b${i}`" :d="b.d" :fill="`var(--color-${b.key})`" />
      <path v-for="(l, i) in cartesian.lines" :key="`l${i}`" :d="l.d" fill="none" :stroke="`var(--color-${l.key})`" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
      <rect v-for="(b, i) in cartesian.bands" :key="`h${i}`" :x="b.x" :width="b.width" y="0" :height="cartesian.height" fill="transparent"><title>{{ b.title }}</title></rect>
    </svg>
    <svg v-else-if="pie" :viewBox="`0 0 ${pie.width} ${pie.height}`" class="min-h-0 w-full flex-1" aria-hidden="true" focusable="false">
      <path v-for="s in pie.slices" :key="s.key" :d="s.d" :fill="`var(--color-${s.key})`" stroke="var(--card)" stroke-width="2"><title>{{ s.title }}</title></path>
    </svg>
    <NqChartLegendContent v-if="showLegend" :config="config" :payload="legend" />
  </NqChartContainer>
</template>
