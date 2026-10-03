<script setup lang="ts">
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent } from "../card";
import { NqFunnelSteps } from "../chart-extras";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { pipelineRows, winRate, type PipelineStageInput, type PipelineStageRow } from "./business-reports-math";
import { PERCENT, WHOLE } from "./shared";
import { STRINGS, type BusinessReportsLabels } from "./strings";

// The sales pipeline stage by stage. The chart view is a funnel with the conversion between stages; the table view has
// the same figures with value and average deal. Both are one toggle apart and read from the same data.
export interface PipelineStage extends PipelineStageInput {
  label: string;
}
type Row = PipelineStageRow<PipelineStage>;

const props = withDefaults(
  defineProps<{
    stages: readonly PipelineStage[];
    /** Intl currency options for the value columns. */
    format: FormatNumberOptions;
    /** "chart" (default) or "table" (`v-model:view`). */
    view?: "chart" | "table";
    defaultView?: "chart" | "table";
    /** Menu for a stage in the table view. */
    stageActions?: (stage: PipelineStage) => DataTableRowAction[];
    loading?: boolean;
    labels?: Partial<BusinessReportsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { view: undefined, defaultView: "chart", stageActions: undefined, loading: false, labels: undefined },
);
const emit = defineEmits<{ "update:view": [view: "chart" | "table"] }>();

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const inner = ref<"chart" | "table">(props.defaultView);
const current = computed(() => props.view ?? inner.value);
const rows = computed(() => pipelineRows(props.stages));
const open = computed(() => props.stages[0]?.value ?? 0);
const wonStage = computed(() => props.stages.find((s) => s.won));

const columns = computed<DataTableColumn<Row>[]>(() => {
  const format = props.format;
  return [
    { id: "stage", header: t.value.stage, cell: (r) => r.stage.label, sortValue: (r) => props.stages.findIndex((s) => s.id === r.stage.id) },
    { id: "count", header: t.value.deals, align: "end", cell: (r) => h(NqNum, { value: r.stage.count }), sortValue: (r) => r.stage.count },
    { id: "value", header: t.value.value, align: "end", cell: (r) => h(NqNum, { value: r.stage.value, format }), sortValue: (r) => r.stage.value },
    { id: "average", header: t.value.average, align: "end", cell: (r) => h(NqNum, { value: r.average, format }), sortValue: (r) => r.average },
    { id: "prev", header: t.value.fromPrevious, align: "end", cell: (r) => h(NqNum, { value: r.fromPrevious, format: WHOLE }), sortValue: (r) => r.fromPrevious },
    { id: "first", header: t.value.fromFirst, align: "end", cell: (r) => h(NqNum, { value: r.fromFirst, format: WHOLE }), sortValue: (r) => r.fromFirst },
  ];
});
const table = useDataTable<Row>({ data: rows, columns, getRowId: (r) => r.stage.id });
function change(v: string[]) {
  const next = v[0] as "chart" | "table" | undefined;
  if (!next) return;
  if (props.view === undefined) inner.value = next;
  emit("update:view", next);
}
const rowActionsFor = (r: Row) => props.stageActions?.(r.stage) ?? [];
</script>

<template>
  <section data-slot="pipeline-report" :class="cn('flex flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :label="t.pipelineValue" :value="open" :format="format" :loading="loading" />
      <NqStatCard :label="t.winRate" :value="winRate(stages)" :format="PERCENT" :loading="loading" />
      <NqStatCard :label="t.won" :value="wonStage?.value ?? 0" :format="format" :loading="loading" />
    </NqStatGrid>
    <div class="flex items-center justify-end gap-2">
      <span id="pipeline-view-label" class="text-caption text-muted-foreground">{{ t.view }}</span>
      <NqToggleGroup aria-labelledby="pipeline-view-label" :model-value="[current]" @update:model-value="change">
        <NqToggle value="chart">{{ t.chart }}</NqToggle>
        <NqToggle value="table">{{ t.table }}</NqToggle>
      </NqToggleGroup>
    </div>
    <NqCard v-if="current === 'chart'" class="w-full">
      <NqCardContent class="pt-4">
        <NqFunnelSteps :label="t.deals" :steps="stages.map((s) => ({ id: s.id, label: s.label, count: s.count }))" />
      </NqCardContent>
    </NqCard>
    <NqDataTable v-else :table="table" :label="t.deals" :row-label="(r: Row) => r.stage.label" :row-actions="stageActions ? rowActionsFor : undefined" :loading="loading">
      <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
    </NqDataTable>
  </section>
</template>
