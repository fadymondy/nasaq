<script setup lang="ts">
import { computed, h, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqSegmentBar, NqTrendCell, type SegmentBarSegment } from "../chart-extras";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { NqTimeSeriesPanel, type TimeSeriesMetric, type TimeSeriesPoint } from "../time-series-panel";
import { durationFormat, WHOLE } from "./shared";
import { STRINGS, type BusinessReportsLabels } from "./strings";

// The inbox at a glance: response and resolution times, satisfaction and SLA, volume over time, status mix and a table of agents.
export interface SupportSummary {
  open: number;
  /** Median minutes to the first reply. */
  firstResponseMinutes: number;
  /** Median minutes to resolve. */
  resolutionMinutes: number;
  /** Satisfaction as a fraction 0 to 1. */
  csat: number;
  /** Share answered within the objective, 0 to 1. */
  slaRate: number;
  /** Change against the last period as fractions, for each figure. */
  deltas?: Partial<Record<"open" | "firstResponse" | "resolution" | "csat" | "sla", number>>;
}

export interface SupportAgentRow {
  id: string;
  name: string;
  assigned: number;
  resolved: number;
  firstResponseMinutes: number;
  csat: number;
  /** Resolved per period, oldest first. */
  trend?: readonly number[];
}

const props = withDefaults(
  defineProps<{
    summary: SupportSummary;
    /** One point per day with `created` and `resolved` counts. */
    volume: readonly TimeSeriesPoint[];
    previousVolume?: readonly TimeSeriesPoint[];
    byStatus: readonly SegmentBarSegment[];
    agents: readonly SupportAgentRow[];
    /** Menu for an agent row. */
    agentActions?: (agent: SupportAgentRow) => DataTableRowAction[];
    loading?: boolean;
    labels?: Partial<BusinessReportsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { previousVolume: undefined, agentActions: undefined, loading: false, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const d = computed(() => props.summary.deltas ?? {});
const first = computed(() => durationFormat(props.summary.firstResponseMinutes));
const res = computed(() => durationFormat(props.summary.resolutionMinutes));
const metrics = computed<TimeSeriesMetric[]>(() => [
  { id: "created", label: t.value.created, color: "var(--nq-info)" },
  { id: "resolved", label: t.value.resolved, color: "var(--nq-success)" },
]);
const columns = computed<DataTableColumn<SupportAgentRow>[]>(() => [
  { id: "name", header: t.value.agent, cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
  { id: "assigned", header: t.value.assigned, align: "end", cell: (r) => h(NqNum, { value: r.assigned }), sortValue: (r) => r.assigned },
  {
    id: "resolved",
    header: t.value.resolvedShort,
    align: "end",
    cell: (r) => h(NqTrendCell, { value: r.resolved, data: r.trend, chartLabel: `${t.value.resolvedShort}: ${r.name}` }),
    sortValue: (r) => r.resolved,
  },
  {
    id: "first",
    header: t.value.firstResponse,
    align: "end",
    cell: (r) => {
      const f = durationFormat(r.firstResponseMinutes);
      return h(NqNum, { value: f.value, format: f.format });
    },
    sortValue: (r) => r.firstResponseMinutes,
  },
  { id: "csat", header: t.value.csat, align: "end", cell: (r) => h(NqNum, { value: r.csat, format: WHOLE }), sortValue: (r) => r.csat },
]);
const table = useDataTable<SupportAgentRow>({ data: computed(() => [...props.agents]), columns, getRowId: (r) => r.id, pageSize: 8 });
</script>

<template>
  <section data-slot="support-stats-report" :class="cn('flex flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :label="t.open" :value="summary.open" :delta="d.open" invert :loading="loading" />
      <NqStatCard :label="t.firstResponse" :value="first.value" :format="first.format" :delta="d.firstResponse" invert :loading="loading" />
      <NqStatCard :label="t.resolution" :value="res.value" :format="res.format" :delta="d.resolution" invert :loading="loading" />
      <NqStatCard :label="t.csat" :value="summary.csat" :format="WHOLE" :delta="d.csat" :loading="loading" />
      <NqStatCard :label="t.sla" :value="summary.slaRate" :format="WHOLE" :delta="d.sla" :loading="loading" />
    </NqStatGrid>
    <NqTimeSeriesPanel :title="t.volume" :metrics="metrics" :data="volume" :previous-data="previousVolume" default-metric="created" :loading="loading" />
    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <NqCard class="w-full">
        <NqCardHeader><NqCardTitle>{{ t.byStatus }}</NqCardTitle></NqCardHeader>
        <NqCardContent><NqSegmentBar :label="t.byStatus" :segments="byStatus" patterned /></NqCardContent>
      </NqCard>
      <div class="flex min-w-0 flex-col gap-2">
        <h3 class="text-label font-medium">{{ t.agents }}</h3>
        <NqDataTable :table="table" :label="t.agents" :row-label="(r: SupportAgentRow) => r.name" :row-actions="agentActions" :loading="loading">
          <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
        </NqDataTable>
      </div>
    </div>
  </section>
</template>
