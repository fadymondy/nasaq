<script lang="ts">
export interface FunnelStep {
  id: string;
  label: string;
  /** People (or sessions) that reached this step. */
  count: number;
  /** Extra line under the label: the event name or page path. Kept left-to-right. */
  detail?: string;
}

export interface FunnelSegment {
  id: string;
  label: string;
  /** People from this segment that entered the first step. */
  entered: number;
  /** People from this segment that reached the last step. */
  converted: number;
}

const STRINGS = {
  en: {
    title: "Conversion funnel",
    description: "How many people reach each step, and where they leave.",
    overall: "Overall conversion",
    entered: "Entered",
    completed: "Completed",
    ofPrevious: "of previous step",
    ofFirst: "of first step",
    continued: (pct: string) => `${pct} continued`,
    dropped: (n: string, pct: string) => `${n} left (${pct})`,
    biggest: "Biggest drop",
    empty: "No funnel data for this period",
    chart: "Funnel steps",
    segmentsTitle: "Conversion by segment",
    segmentsDescription: "The same funnel split by who came in.",
    segment: "Segment",
    converted: "Converted",
    rate: "Conversion",
    stepCount: (i: number, total: number) => `Step ${i} of ${total}`,
  },
  ar: {
    title: "قمع التحويل",
    description: "كم شخصًا يصل إلى كل خطوة، وأين يغادرون.",
    overall: "التحويل الإجمالي",
    entered: "دخلوا",
    completed: "أتمّوا",
    ofPrevious: "من الخطوة السابقة",
    ofFirst: "من الخطوة الأولى",
    continued: (pct: string) => `تابع ${pct}`,
    dropped: (n: string, pct: string) => `غادر ${n} (${pct})`,
    biggest: "أكبر تسرّب",
    empty: "لا بيانات قمع لهذه الفترة",
    chart: "خطوات القمع",
    segmentsTitle: "التحويل حسب الشريحة",
    segmentsDescription: "القمع نفسه مقسومًا حسب مصدر الزوار.",
    segment: "الشريحة",
    converted: "أتمّوا",
    rate: "التحويل",
    stepCount: (i: number, total: number) => `الخطوة ${i} من ${total}`,
  },
};
export type FunnelChartLabels = typeof STRINGS.en;
</script>

<script setup lang="ts">
import { ArrowDown, TriangleAlert } from "lucide-vue-next";
import { computed, h, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqBreakdownTable } from "../breakdown-table";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { barWidth, biggestDropIndex, funnelRows, overallConversion } from "./funnel-math";

// A funnel: one bar per step sized against the first, with the count, the conversion from the previous step and from the
// first, and the drop-off between steps. The step with the biggest drop is flagged. Bars grow from the inline start,
// so the funnel reads right-to-left in Arabic. The header end slot is `action`.
const props = withDefaults(
  defineProps<{
    steps: readonly FunnelStep[];
    title?: string;
    description?: string;
    /** Splits of the same funnel by source or segment. Adds a breakdown table under the chart. */
    segments?: readonly FunnelSegment[];
    /** Heading of the segment column, for example "Source". Default "Segment". */
    segmentLabel?: string;
    loading?: boolean;
    class?: HTMLAttributes["class"];
    labels?: Partial<FunnelChartLabels>;
  }>(),
  { title: undefined, description: undefined, segments: undefined, segmentLabel: undefined, loading: false, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const percent = { style: "percent" as const, maximumFractionDigits: 1 };
const rows = computed(() => funnelRows(props.steps));
const first = computed(() => props.steps[0]?.count ?? 0);
const worst = computed(() => biggestDropIndex(props.steps));
const overall = computed(() => overallConversion(props.steps));
const last = computed(() => props.steps[props.steps.length - 1]?.count ?? 0);
const segmentRows = computed(() => (props.segments ?? []).map((s) => ({ id: s.id, label: s.label, value: s.converted })));
const segmentColumns = computed(() => [
  {
    id: "rate",
    header: t.value.rate,
    align: "end" as const,
    cell: (row: { id: string }) => {
      const s = props.segments?.find((x) => x.id === row.id);
      return h(NqNum, { value: s && s.entered > 0 ? s.converted / s.entered : 0, format: percent });
    },
  },
]);
</script>

<template>
  <div data-slot="funnel-chart" :class="cn('flex w-full flex-col gap-4', props.class)">
    <NqCard :aria-busy="props.loading || undefined">
      <NqCardHeader>
        <NqCardTitle as="h3">{{ props.title ?? t.title }}</NqCardTitle>
        <NqCardDescription>{{ props.description ?? t.description }}</NqCardDescription>
        <div v-if="$slots.action" class="mt-2"><slot name="action" /></div>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <div v-if="props.loading" class="flex flex-col gap-3">
          <NqSkeleton v-for="i in 4" :key="i" class="h-10 w-full" />
        </div>
        <NqEmptyState v-else-if="props.steps.length === 0" :title="t.empty" />
        <template v-else>
          <div class="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <div class="flex flex-col">
              <span class="text-caption text-muted-foreground">{{ t.overall }}</span>
              <span class="text-heading-sm text-foreground" data-slot="funnel-overall"><NqNum :value="overall" :format="percent" /></span>
            </div>
            <span class="text-body-sm text-muted-foreground">
              {{ t.entered }} <NqNum :value="first" /> · {{ t.completed }} <NqNum :value="last" />
            </span>
          </div>
          <ol :aria-label="t.chart" class="flex flex-col">
            <li v-for="(r, i) in rows" :key="r.step.id" data-slot="funnel-step" class="flex flex-col">
              <div v-if="i > 0" class="flex items-center gap-2 py-1.5 ps-3 text-caption text-muted-foreground" data-slot="funnel-gap">
                <ArrowDown class="size-3.5 shrink-0" aria-hidden="true" />
                <span>{{ t.continued(pct(r.fromPrevious)) }}</span>
                <span aria-hidden="true">·</span>
                <span :class="cn(worst === i && 'text-danger')">{{ t.dropped(String(r.dropped.toLocaleString("en")), pct(r.dropRate)) }}</span>
                <NqBadge v-if="worst === i" variant="danger">
                  <TriangleAlert aria-hidden="true" />
                  {{ t.biggest }}
                </NqBadge>
              </div>
              <div class="flex flex-col gap-1.5 rounded-card border border-border p-3">
                <div class="flex items-baseline justify-between gap-3">
                  <span class="flex min-w-0 flex-col">
                    <span dir="auto" class="truncate text-label text-foreground">{{ r.step.label }}</span>
                    <bdi v-if="r.step.detail" dir="ltr" class="truncate text-caption text-muted-foreground">{{ r.step.detail }}</bdi>
                  </span>
                  <span class="flex shrink-0 flex-col items-end">
                    <span class="text-label text-foreground"><NqNum :value="r.step.count" /></span>
                    <span class="text-caption text-muted-foreground"><NqNum :value="r.fromFirst" :format="percent" /> {{ t.ofFirst }}</span>
                  </span>
                </div>
                <div
                  role="img"
                  :aria-label="`${r.step.label}: ${r.step.count.toLocaleString('en')} (${pct(r.fromFirst)})`"
                  class="h-3 w-full overflow-hidden rounded-full bg-muted"
                >
                  <div class="h-full rounded-full bg-primary transition-[inline-size]" :style="{ inlineSize: `${barWidth(r.step.count, first) * 100}%` }" />
                </div>
              </div>
            </li>
          </ol>
        </template>
      </NqCardContent>
    </NqCard>
    <NqBreakdownTable
      v-if="props.segments && props.segments.length > 0"
      :title="t.segmentsTitle"
      :description="t.segmentsDescription"
      :dimension-label="props.segmentLabel ?? t.segment"
      :value-label="t.converted"
      :rows="segmentRows"
      :columns="segmentColumns"
      :label="t.segmentsTitle"
    />
  </div>
</template>
