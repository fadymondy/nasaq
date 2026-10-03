<script setup lang="ts">
import { computed, h, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { formatDate, formatNumber } from "../numeric";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqStatus } from "../status";
import { socialEngagementRate, socialEngagements, socialRule, summarizeSocialMetrics, type SocialTargetStatus } from "./social-composer-logic";
import { useSocialMetricStrings, type SocialMetricsTableLabels } from "./strings";
import type { SocialMetricsRow } from "./types";

// Totals and a sortable per-post table of impressions, engagements and rate, for the posts a composer sent.
const props = withDefaults(
  defineProps<{
    rows: readonly SocialMetricsRow[];
    onRowClick?: (row: SocialMetricsRow) => void;
    /** Open with the more button and on context-click. */
    rowActions?: (row: SocialMetricsRow) => DataTableRowAction[];
    /** Totals above the table. Default true. */
    summary?: boolean;
    loading?: boolean;
    locale?: string;
    labels?: SocialMetricsTableLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { onRowClick: undefined, rowActions: undefined, summary: true, loading: false, locale: undefined, labels: undefined },
);

const { t, locale } = useSocialMetricStrings(
  () => props.locale,
  () => props.labels,
);
const statusTone = { draft: "neutral", queued: "info", published: "success", failed: "danger" } as const satisfies Record<SocialTargetStatus, string>;
const totals = computed(() => summarizeSocialMetrics(props.rows));
const pct = (n: number | null) => (n === null ? "—" : formatNumber(n, locale.value, { style: "percent", maximumFractionDigits: 1 }));
const tab = (v: string) => h("span", { class: "tabular-nums" }, v);

const columns = computed<DataTableColumn<SocialMetricsRow>[]>(() => [
  {
    id: "platform",
    header: t.value.platform,
    label: t.value.platform,
    sortValue: (r) => socialRule(r.platform).label,
    searchValue: (r) => `${socialRule(r.platform).label} ${r.account ?? ""} ${r.text}`,
    cell: (r) =>
      h("div", { class: "flex min-w-0 flex-col" }, [
        h("span", { class: "font-medium" }, socialRule(r.platform).label),
        r.account ? h("bdi", { class: "truncate text-caption text-muted-foreground" }, r.account) : null,
      ]),
  },
  { id: "post", header: t.value.post, label: t.value.post, cell: (r) => h("span", { class: "line-clamp-2 max-w-[32ch]" }, r.text) },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    sortValue: (r) => r.status,
    cell: (r) => h(NqStatus, { tone: statusTone[r.status] }, () => t.value.statuses[r.status]),
  },
  {
    id: "published",
    header: t.value.published,
    label: t.value.published,
    sortValue: (r) => (r.publishedAt ? new Date(r.publishedAt) : null),
    cell: (r) => (r.publishedAt ? formatDate(r.publishedAt, locale.value, { dateStyle: "medium" }) : "—"),
  },
  {
    id: "impressions",
    header: t.value.impressions,
    label: t.value.impressions,
    align: "end",
    sortValue: (r) => r.impressions ?? null,
    cell: (r) => (r.impressions === undefined ? "—" : tab(formatNumber(r.impressions, locale.value))),
  },
  {
    id: "engagements",
    header: t.value.engagements,
    label: t.value.engagements,
    align: "end",
    sortValue: (r) => (r.status === "published" ? socialEngagements(r) : null),
    cell: (r) => (r.status === "published" ? tab(formatNumber(socialEngagements(r), locale.value)) : "—"),
  },
  { id: "rate", header: t.value.rate, label: t.value.rate, align: "end", sortValue: (r) => socialEngagementRate(r), cell: (r) => tab(pct(socialEngagementRate(r))) },
]);

const table = useDataTable<SocialMetricsRow>({
  data: () => [...props.rows],
  columns,
  getRowId: (r) => r.id,
  defaultSort: { id: "impressions", direction: "desc" },
});
</script>

<template>
  <div data-slot="social-metrics" :class="cn('flex w-full min-w-0 flex-col gap-3', props.class)">
    <NqStatGrid v-if="props.summary">
      <NqStatCard :label="t.posts" :value="totals.posts" />
      <NqStatCard :label="t.impressions" :value="totals.impressions" :format="{ notation: 'compact' }" />
      <NqStatCard :label="t.engagements" :value="totals.engagements" :format="{ notation: 'compact' }" />
      <NqStatCard :label="t.rate"><template #value>{{ pct(totals.rate) }}</template></NqStatCard>
    </NqStatGrid>
    <NqDataTable
      :table="table"
      :label="t.table"
      :row-label="(r: SocialMetricsRow) => `${socialRule(r.platform).label} ${r.text.slice(0, 30)}`"
      :on-row-click="props.onRowClick"
      :row-actions="props.rowActions"
      :loading="props.loading"
    >
      <template #empty>
        <slot name="empty">{{ t.empty }}</slot>
      </template>
    </NqDataTable>
  </div>
</template>
