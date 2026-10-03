<script setup lang="ts">
import { computed, h, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { formatMillis } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { STRINGS, type ApmPanelsLabels } from "./strings";

// Endpoints with request count, p50, p95 and error rate, sortable and searchable, the slowest first; slow ones are flagged.
export interface EndpointRow {
  id: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | (string & {});
  /** Route pattern: "/api/orders/:id". */
  route: string;
  requests: number;
  /** Requests per minute. */
  throughput?: number;
  p50: number;
  p95: number;
  /** Fraction of requests that failed. */
  errorRate: number;
}
const props = withDefaults(
  defineProps<{
    rows: readonly EndpointRow[];
    /** Milliseconds; endpoints with a p95 above this are flagged Slow. Default 1000. */
    slowMs?: number;
    onRowClick?: (row: EndpointRow) => void;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    class?: HTMLAttributes["class"];
    labels?: Partial<ApmPanelsLabels>;
  }>(),
  { slowMs: 1000, pageSize: 8 },
);

const nq = useNasaq();
const t = useAnalyticsLabels(STRINGS, () => props.labels);
const ar = computed(() => nq.locale.value.startsWith("ar"));
const columns = computed<DataTableColumn<EndpointRow>[]>(() => [
  {
    id: "route",
    header: t.value.endpoint,
    label: t.value.endpoint,
    sortValue: (r) => r.route,
    searchValue: (r) => `${r.method} ${r.route}`,
    cell: (r) =>
      h("bdi", { dir: "ltr", class: "flex max-w-[30ch] items-center gap-2 sm:max-w-[44ch]" }, [
        h(NqBadge, { variant: "outline", class: "font-mono" }, () => r.method),
        h("span", { class: "truncate font-mono text-code" }, r.route),
      ]),
  },
  { id: "requests", header: t.value.requests, label: t.value.requests, align: "end", sortValue: (r) => r.requests, cell: (r) => h(NqNum, { value: r.requests, format: { notation: "compact", maximumFractionDigits: 1 } }) },
  { id: "p50", header: t.value.p50, label: t.value.p50, align: "end", sortValue: (r) => r.p50, cell: (r) => h("bdi", { dir: "ltr" }, formatMillis(r.p50, ar.value)) },
  {
    id: "p95",
    header: t.value.p95,
    label: t.value.p95,
    align: "end",
    sortValue: (r) => r.p95,
    cell: (r) =>
      h("span", { class: "inline-flex items-center justify-end gap-2" }, [
        r.p95 > props.slowMs ? h(NqStatus, { tone: "warning", tinted: true, class: "text-caption" }, () => t.value.slow) : null,
        h("bdi", { dir: "ltr" }, formatMillis(r.p95, ar.value)),
      ]),
  },
  {
    id: "errorRate",
    header: t.value.errorRate,
    label: t.value.errorRate,
    align: "end",
    sortValue: (r) => r.errorRate,
    cell: (r) => h(NqNum, { value: r.errorRate, format: { style: "percent", maximumFractionDigits: 2 }, class: r.errorRate >= 0.05 ? "text-nq-danger-text" : undefined }),
  },
]);
const table = useDataTable<EndpointRow>({
  data: computed(() => [...props.rows]),
  columns,
  getRowId: (r) => r.id,
  pageSize: props.pageSize,
  defaultSort: { id: "p95", direction: "desc" },
});
</script>

<template>
  <NqCard data-slot="endpoint-table" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3">{{ title ?? t.endpoints }}</NqCardTitle>
      <NqCardDescription>{{ description ?? t.endpointsDescription }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.filterEndpoints" />
      </NqDataTableToolbar>
      <NqDataTable :table="table" :label="t.endpoints" :loading="loading" :error="error" :on-retry="onRetry" :on-row-click="onRowClick">
        <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
      </NqDataTable>
    </NqCardContent>
  </NqCard>
</template>
