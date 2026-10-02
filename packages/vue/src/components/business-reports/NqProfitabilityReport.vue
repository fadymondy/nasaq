<script setup lang="ts">
import { ArrowDownRight, CircleCheck, TriangleAlert } from "lucide-vue-next";
import { computed, h, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqSegmentBar, NqTrendCell, type SegmentBarSegment } from "../chart-extras";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum, type FormatNumberOptions } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqEmptyState } from "../states";
import { marginBand, profitMargin, profitTotals } from "./business-reports-math";
import { bandVariant, PERCENT } from "./shared";
import { STRINGS, type BusinessReportsLabels } from "./strings";

// Revenue, cost, profit and margin for a period, split by project, client or service. Margin is a number, a word (Loss,
// Thin, Healthy) and a small trend, so a loss never depends on colour. Rows sort by any column.
export interface ProfitabilityRow {
  id: string;
  /** Project, client or service. Localise it. */
  name: string;
  revenue: number;
  cost: number;
  /** Hours logged, shown as a column when any row has them. */
  hours?: number;
  /** Margin per period, oldest first, for the row's small chart. */
  marginTrend?: readonly number[];
}

const props = withDefaults(
  defineProps<{
    rows: readonly ProfitabilityRow[];
    /** Intl currency options for money, e.g. `{ style: "currency", currency: "SAR", maximumFractionDigits: 0 }`. */
    format: FormatNumberOptions;
    /** Heading of the name column ("Project", "Client"). */
    subjectLabel?: string;
    /** Margins below this are "Thin". Default 0.15. */
    thinBelow?: number;
    /** Menu for a row: context-click, long press, Shift+F10 or the ⋯ button. */
    rowActions?: (row: ProfitabilityRow) => DataTableRowAction[];
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<BusinessReportsLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { subjectLabel: undefined, thinBelow: 0.15, rowActions: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const totals = computed(() => profitTotals(props.rows));
const hasHours = computed(() => props.rows.some((r) => r.hours !== undefined));
const hasTrend = computed(() => props.rows.some((r) => r.marginTrend?.length));

const columns = computed<DataTableColumn<ProfitabilityRow>[]>(() => {
  const format = props.format;
  const cols: DataTableColumn<ProfitabilityRow>[] = [
    { id: "name", header: props.subjectLabel ?? t.value.subject, cell: (r) => r.name, sortValue: (r) => r.name, searchValue: (r) => r.name },
    { id: "revenue", header: t.value.revenue, align: "end", cell: (r) => h(NqNum, { value: r.revenue, format }), sortValue: (r) => r.revenue },
    { id: "cost", header: t.value.cost, align: "end", cell: (r) => h(NqNum, { value: r.cost, format }), sortValue: (r) => r.cost },
    { id: "profit", header: t.value.profit, align: "end", cell: (r) => h(NqNum, { value: r.revenue - r.cost, format: { ...format, signDisplay: "exceptZero" } }), sortValue: (r) => r.revenue - r.cost },
  ];
  if (hasHours.value)
    cols.push({ id: "hours", header: t.value.hours, align: "end", cell: (r) => (r.hours === undefined ? "" : h(NqNum, { value: r.hours, format: { maximumFractionDigits: 1 } })), sortValue: (r) => r.hours ?? 0 });
  cols.push({
    id: "margin",
    header: t.value.margin,
    align: "end",
    sortValue: (r) => profitMargin(r.revenue, r.cost) ?? -Infinity,
    cell: (r) => {
      const m = profitMargin(r.revenue, r.cost);
      const band = marginBand(m, props.thinBelow);
      return h("span", { class: "inline-flex items-center justify-end gap-2" }, [
        m === null ? h("span", { class: "text-muted-foreground" }, t.value.noRevenue) : h(NqNum, { value: m, format: PERCENT }),
        m !== null
          ? h(NqBadge, { variant: bandVariant[band] }, () => [
              h(band === "loss" ? ArrowDownRight : band === "thin" ? TriangleAlert : CircleCheck, { "aria-hidden": "true" }),
              t.value.band[band],
            ])
          : null,
      ]);
    },
  });
  if (hasTrend.value)
    cols.push({
      id: "trend",
      header: t.value.trend,
      cell: (r) => (r.marginTrend?.length ? h(NqTrendCell, { data: r.marginTrend, chartLabel: `${t.value.margin}: ${r.name}` }) : null),
    });
  return cols;
});

const table = useDataTable<ProfitabilityRow>({ data: computed(() => [...props.rows]), columns, getRowId: (r) => r.id, pageSize: 8 });
const segments = computed<SegmentBarSegment[]>(() => [
  { id: "cost", label: t.value.cost, value: Math.max(0, totals.value.cost), color: "var(--nq-warning)" },
  { id: "profit", label: t.value.profit, value: Math.max(0, totals.value.profit), color: "var(--nq-success)" },
]);
</script>

<template>
  <section data-slot="profitability-report" :class="cn('flex flex-col gap-4', props.class)">
    <NqStatGrid>
      <NqStatCard :label="t.revenue" :value="totals.revenue" :format="format" :loading="loading" />
      <NqStatCard :label="t.cost" :value="totals.cost" :format="format" :loading="loading" />
      <NqStatCard :label="t.profit" :value="totals.profit" :format="format" :loading="loading" :delta-label="totals.losing ? t.losing(totals.losing) : undefined" />
      <NqStatCard :label="t.margin" :value="totals.margin ?? 0" :format="PERCENT" :loading="loading" />
    </NqStatGrid>
    <NqSegmentBar v-if="!loading && totals.revenue > 0" :label="t.breakdown" :segments="segments" :total="totals.revenue" :format="format" patterned />
    <NqDataTable :table="table" :label="t.subject" :row-label="(r: ProfitabilityRow) => r.name" :row-actions="rowActions" :loading="loading" :error="error" :on-retry="onRetry">
      <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
    </NqDataTable>
  </section>
</template>
