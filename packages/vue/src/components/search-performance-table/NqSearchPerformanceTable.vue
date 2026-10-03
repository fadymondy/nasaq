<script setup lang="ts">
import { computed, h, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { changeRatio, useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { clickThroughRate } from "../metric-tiles/analytics-math";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";

// The Search Console performance table: a query or page with clicks, impressions, CTR and average position, sortable and
// searchable, each with its change against the previous period. Position is "lower is better" and toned that way.

const STRINGS = {
  en: {
    query: "Query",
    page: "Page",
    clicks: "Clicks",
    impressions: "Impressions",
    ctr: "CTR",
    position: "Position",
    searchQueries: "Search queries",
    searchPages: "Search pages",
    filterQueries: "Filter queries…",
    filterPages: "Filter pages…",
    empty: "No search data for this period",
    lowerIsBetter: "Lower is better",
  },
  ar: {
    query: "عبارة البحث",
    page: "الصفحة",
    clicks: "النقرات",
    impressions: "مرات الظهور",
    ctr: "نسبة النقر",
    position: "الترتيب",
    searchQueries: "عبارات البحث",
    searchPages: "صفحات البحث",
    filterQueries: "تصفية العبارات…",
    filterPages: "تصفية الصفحات…",
    empty: "لا بيانات بحث لهذه الفترة",
    lowerIsBetter: "الأقل أفضل",
  },
};

export type SearchPerformanceTableLabels = typeof STRINGS.en;

export interface SearchPerformanceRow {
  id: string;
  /** The query text or the page URL. */
  label: string;
  clicks: number;
  impressions: number;
  /** Click-through rate as a fraction. Default: clicks divided by impressions. */
  ctr?: number;
  /** Average position in the results, 1 is the top. */
  position: number;
  /** Clicks in the previous period. Shows the change under the clicks. */
  previousClicks?: number;
  /** Average position in the previous period. A lower number is an improvement. */
  previousPosition?: number;
}

const props = withDefaults(
  defineProps<{
    rows: readonly SearchPerformanceRow[];
    /** "query" for search terms, "page" for URLs (shown left-to-right, with a "Page" heading). Default "query". */
    kind?: "query" | "page";
    title?: string;
    description?: string;
    /** Rows per page. Default 10. */
    pageSize?: number;
    /** Open a row: for example the query or page report. */
    onRowClick?: (row: SearchPerformanceRow) => void;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<SearchPerformanceTableLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { kind: "query", title: undefined, description: undefined, pageSize: 10, onRowClick: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const tone = (good: boolean | undefined) => (good === undefined ? "text-muted-foreground" : good ? "text-nq-success-text" : "text-nq-danger-text");
const ctrOf = (r: SearchPerformanceRow) => r.ctr ?? clickThroughRate(r.clicks, r.impressions);

const columns = computed<DataTableColumn<SearchPerformanceRow>[]>(() => [
  {
    id: "label",
    header: props.kind === "query" ? t.value.query : t.value.page,
    label: props.kind === "query" ? t.value.query : t.value.page,
    cell: (r) =>
      props.kind === "page"
        ? h("bdi", { dir: "ltr", class: "block max-w-[28ch] truncate sm:max-w-[48ch]" }, r.label)
        : h("span", { class: "block max-w-[28ch] truncate sm:max-w-[40ch]", dir: "auto" }, r.label),
    sortValue: (r) => r.label,
    searchValue: (r) => r.label,
  },
  {
    id: "clicks",
    header: t.value.clicks,
    label: t.value.clicks,
    align: "end",
    sortValue: (r) => r.clicks,
    cell: (r) => {
      const d = changeRatio(r.clicks, r.previousClicks);
      return h("div", { class: "flex flex-col items-end" }, [
        h(NqNum, { value: r.clicks }),
        d !== undefined
          ? h(NqNum, { value: d, format: { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" }, class: cn("text-caption", tone(d === 0 ? undefined : d > 0)) })
          : null,
      ]);
    },
  },
  { id: "impressions", header: t.value.impressions, label: t.value.impressions, align: "end", sortValue: (r) => r.impressions, cell: (r) => h(NqNum, { value: r.impressions }) },
  {
    id: "ctr",
    header: t.value.ctr,
    label: t.value.ctr,
    align: "end",
    sortValue: ctrOf,
    cell: (r) => h(NqNum, { value: ctrOf(r), format: { style: "percent", maximumFractionDigits: 1 } }),
  },
  {
    id: "position",
    header: t.value.position,
    label: t.value.position,
    align: "end",
    sortValue: (r) => r.position,
    cell: (r) => {
      const diff = r.previousPosition === undefined ? undefined : r.position - r.previousPosition;
      return h("div", { class: "flex flex-col items-end", title: t.value.lowerIsBetter }, [
        h(NqNum, { value: r.position, format: { maximumFractionDigits: 1, minimumFractionDigits: 1 } }),
        diff !== undefined && Math.abs(diff) >= 0.05
          ? h(NqNum, { value: diff, format: { maximumFractionDigits: 1, signDisplay: "exceptZero" }, class: cn("text-caption", tone(diff < 0)) })
          : null,
      ]);
    },
  },
]);

const table = useDataTable<SearchPerformanceRow>({
  data: () => [...props.rows],
  columns,
  getRowId: (r) => r.id,
  pageSize: props.pageSize,
  defaultSort: { id: "clicks", direction: "desc" },
});

const noun = computed(() => (props.kind === "query" ? t.value.searchQueries : t.value.searchPages));
</script>

<template>
  <NqCard data-slot="search-performance-table" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3"><slot name="title">{{ props.title ?? noun }}</slot></NqCardTitle>
      <NqCardDescription v-if="props.description || $slots.description"><slot name="description">{{ props.description }}</slot></NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="props.kind === 'query' ? t.filterQueries : t.filterPages" />
      </NqDataTableToolbar>
      <NqDataTable :table="table" :label="noun" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="props.onRowClick">
        <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
      </NqDataTable>
      <NqDataTablePagination v-if="props.pageSize && props.rows.length > props.pageSize" :table="table" />
    </NqCardContent>
  </NqCard>
</template>
