<script setup lang="ts">
import { computed, h, type HTMLAttributes, type VNodeChild } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, useDataTable, type DataTableColumn } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import type { KeywordCompetitor, TrackedKeyword } from "./keyword-types";
import { competitorStats, type CompetitorStats, type RankPosition } from "./rank-math";

// You against your competitors: visibility, average position and top 10 count per domain, then each keyword's rank side by side with the best in green.
type Kw = Pick<TrackedKeyword, "id" | "keyword" | "volume">;
interface StatRow {
  c: KeywordCompetitor;
  s: CompetitorStats;
}

const props = defineProps<{
  keywords: readonly Kw[];
  competitors: readonly KeywordCompetitor[];
  title?: string;
  description?: string;
  labels?: Partial<KeywordTrackerLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useAnalyticsLabels(KEYWORD_STRINGS, () => props.labels);

const me = computed(() => props.competitors.find((c) => c.you));
const stats = computed<StatRow[]>(() => props.competitors.map((c) => ({ c, s: competitorStats(c.ranks, props.keywords, me.value && c !== me.value ? me.value.ranks : undefined) })));

const cellPosition = (p: RankPosition | undefined, best: boolean): VNodeChild => (p === null || p === undefined ? h("span", { class: "text-muted-foreground" }, "-") : h(NqNum, { value: p, class: cn(best && "font-semibold text-nq-success-text") }));

const summaryColumns = computed<DataTableColumn<StatRow>[]>(() => [
  {
    id: "domain",
    header: t.value.domain,
    label: t.value.domain,
    hideable: false,
    sortValue: (r) => r.c.domain,
    cell: (r) =>
      h("span", { class: "flex items-center gap-2" }, [
        h("bdi", { dir: "ltr", class: "text-label text-foreground" }, r.c.domain),
        r.c.you ? h(NqBadge, { variant: "brand" }, () => t.value.you) : null,
      ]),
  },
  { id: "visibility", header: t.value.share, label: t.value.share, align: "end", sortValue: (r) => r.s.visibility, cell: (r) => h(NqNum, { value: r.s.visibility, format: { style: "percent", maximumFractionDigits: 1 } }) },
  {
    id: "avg",
    header: t.value.avgPos,
    label: t.value.avgPos,
    align: "end",
    sortValue: (r) => r.s.averagePosition,
    cell: (r) => (r.s.averagePosition === null ? "-" : h(NqNum, { value: r.s.averagePosition, format: { minimumFractionDigits: 1, maximumFractionDigits: 1 } })),
  },
  { id: "top10", header: t.value.top10Count, label: t.value.top10Count, align: "end", sortValue: (r) => r.s.top10, cell: (r) => h(NqNum, { value: r.s.top10 }) },
]);
const summary = useDataTable<StatRow>({ data: () => stats.value, columns: summaryColumns, getRowId: (r) => r.c.id, defaultSort: { id: "visibility", direction: "desc" } });

const matrixColumns = computed<DataTableColumn<Kw>[]>(() => [
  {
    id: "keyword",
    header: t.value.keyword,
    label: t.value.keyword,
    hideable: false,
    sortValue: (k) => k.keyword,
    cell: (k) => h("span", { dir: "auto", class: "block max-w-[24ch] truncate text-label text-foreground" }, k.keyword),
  },
  ...props.competitors.map<DataTableColumn<Kw>>((c) => ({
    id: `c-${c.id}`,
    header: () => h("bdi", { dir: "ltr" }, c.domain),
    label: c.domain,
    align: "end",
    sortValue: (k) => c.ranks[k.id] ?? null,
    cell: (k) => {
      const mine = c.ranks[k.id] ?? null;
      const bestAll = Math.min(...props.competitors.map((x) => x.ranks[k.id] ?? Infinity));
      return cellPosition(mine, mine !== null && mine === bestAll);
    },
  })),
]);
const matrix = useDataTable<Kw>({ data: () => [...props.keywords], columns: matrixColumns, getRowId: (k) => k.id });
</script>

<template>
  <div data-slot="competitor-comparison" :class="cn('flex flex-col gap-4', props.class)">
    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3">{{ props.title ?? t.competitorsTitle }}</NqCardTitle>
        <NqCardDescription>{{ props.description ?? t.competitorsDescription }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-3">
        <NqDataTable :table="summary" :label="t.competitorsTitle" :labels="{ empty: t.noCompetitors }" />
        <ul v-if="me" class="flex flex-wrap gap-2 text-caption text-muted-foreground">
          <li v-for="r in stats.filter((x) => x.c !== me)" :key="r.c.id">
            <bdi dir="ltr">{{ r.c.domain }}</bdi>: {{ t.ahead(r.s.ahead) }}
          </li>
        </ul>
      </NqCardContent>
    </NqCard>
    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.matrixTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.lowerIsBetter }}</NqCardDescription>
      </NqCardHeader>
      <NqCardContent>
        <NqDataTable :table="matrix" :label="t.matrixTitle" :labels="{ empty: t.empty }" />
      </NqCardContent>
    </NqCard>
  </div>
</template>
