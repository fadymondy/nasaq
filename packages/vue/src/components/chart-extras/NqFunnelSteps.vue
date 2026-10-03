<script setup lang="ts">
import { ArrowDown, TriangleAlert } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { biggestDropIndex, funnelRows, overallConversion, type FunnelStepInput } from "../funnel-chart/funnel-math";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, useFormatNumber, type FormatNumberOptions } from "../numeric";
import { funnelBarShare } from "./chart-extras-math";
import { CHART_EXTRAS_STRINGS, type ChartExtrasLabels } from "./strings";

// A funnel drawn as centred bars that narrow with each step, with the step-to-step conversion and the people lost written
// between them. The step with the biggest drop is flagged with an icon and text. For a comparison by source or a list
// of saved funnels use NqFunnelChart.
const PERCENT: FormatNumberOptions = { style: "percent", maximumFractionDigits: 1 };

export interface FunnelStepsStep extends FunnelStepInput {
  /** Extra line under the label, kept left-to-right (an event name, a path). */
  detail?: string;
}

const props = withDefaults(
  defineProps<{
    steps: readonly FunnelStepsStep[];
    /** Intl options for the counts. */
    format?: FormatNumberOptions;
    /** Show the overall conversion under the last step. Default true. */
    summary?: boolean;
    /** Accessible name of the funnel. Default: the localised "Funnel steps". */
    label?: string;
    labels?: Partial<ChartExtrasLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { format: undefined, summary: true, label: undefined, labels: undefined },
);

const t = useAnalyticsLabels(CHART_EXTRAS_STRINGS, () => props.labels);
const fmt = useFormatNumber();
const rows = computed(() => funnelRows(props.steps));
const first = computed(() => props.steps[0]?.count ?? 0);
const worst = computed(() => biggestDropIndex(props.steps));
const overall = computed(() => overallConversion(props.steps));
</script>

<template>
  <div data-slot="funnel-steps" role="group" :aria-label="label ?? t.funnel" :class="cn('flex min-w-0 flex-col', props.class)">
    <div v-for="(r, i) in rows" :key="r.step.id" data-slot="funnel-steps-step" class="flex flex-col">
      <div v-if="i > 0" data-slot="funnel-steps-link" class="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-1.5 text-caption text-muted-foreground">
        <ArrowDown aria-hidden="true" class="size-3.5 shrink-0" />
        <span class="tabular-nums">{{ t.continued(fmt(r.fromPrevious, PERCENT)) }}</span>
        <span aria-hidden="true">·</span>
        <span class="tabular-nums">{{ t.left(fmt(r.dropped, format)) }}</span>
        <NqBadge v-if="i === worst" variant="warning">
          <TriangleAlert aria-hidden="true" class="size-3" />
          {{ t.biggest }}
        </NqBadge>
      </div>
      <div class="flex items-baseline justify-between gap-3 text-body-sm">
        <span class="min-w-0 truncate text-foreground">
          <span class="sr-only">{{ t.stepOf(i + 1, rows.length) }}. </span>
          {{ r.step.label }}
          <bdi v-if="r.step.detail" dir="ltr" class="ms-2 text-caption text-muted-foreground">{{ r.step.detail }}</bdi>
        </span>
        <span class="shrink-0 tabular-nums text-foreground">
          <NqNum :value="r.step.count" :format="format" />
          <span v-if="i > 0" class="ms-2 text-caption text-muted-foreground"><NqNum :value="r.fromFirst" :format="PERCENT" /></span>
        </span>
      </div>
      <div class="mt-1 flex h-7 justify-center" aria-hidden="true">
        <span
          class="h-full rounded-control"
          :style="{ width: `${funnelBarShare(r.step.count, first) * 100}%`, backgroundColor: 'var(--primary)', opacity: 1 - (i / Math.max(1, rows.length)) * 0.55 }"
        />
      </div>
    </div>
    <p v-if="summary && rows.length > 1" data-slot="funnel-steps-summary" class="mt-3 flex items-center justify-between gap-3 border-t border-border pt-3 text-body-sm">
      <span class="text-muted-foreground">{{ t.overall }}</span>
      <span class="text-label tabular-nums text-foreground"><NqNum :value="overall" :format="PERCENT" /></span>
    </p>
  </div>
</template>
