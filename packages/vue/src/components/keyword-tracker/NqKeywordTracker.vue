<script setup lang="ts">
import { ExternalLink, Plus, RefreshCw, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqSparkline } from "../chart";
import {
  NqDataTable,
  NqDataTableActions,
  NqDataTableBulkActions,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableAction,
  type DataTableColumn,
  type DataTableRowAction,
} from "../data-table";
import { NqMetricTiles } from "../metric-tiles";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqStatus } from "../status";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTimeSeriesPanel, type TimeSeriesMetric, type TimeSeriesPoint } from "../time-series-panel";
import NqAddKeywordsDialog from "./NqAddKeywordsDialog.vue";
import NqCompetitorComparison from "./NqCompetitorComparison.vue";
import NqRankChange from "./NqRankChange.vue";
import NqRankDistribution from "./NqRankDistribution.vue";
import { KEYWORD_STRINGS, type KeywordTrackerLabels } from "./keyword-labels";
import type { AddKeywordsInput, KeywordCompetitor, KeywordLocation, KeywordResult, TrackedKeyword } from "./keyword-types";
import { averagePosition, bestPosition, difficultyBand, rankDistribution, topMovers, visibilityShare } from "./rank-math";

// Rank tracking: tiles for tracked keywords, average position, top 10 and visibility; the ranking distribution and the
// position history; the biggest movers; a keyword table with change arrows, best, trend, ranking URL (editable),
// volume, difficulty and SERP features; and a competitor comparison. Position is lower-is-better everywhere.
const DIFFICULTY_VARIANT = { easy: "success", medium: "warning", hard: "danger" } as const;

const props = withDefaults(
  defineProps<{
    keywords: readonly TrackedKeyword[];
    /** Daily figures for the history chart: `date`, `position` (average) and `top10` (count). */
    positionHistory?: readonly TimeSeriesPoint[];
    competitors?: readonly KeywordCompetitor[];
    /** Locations offered when adding keywords. Without any the add button is hidden. */
    locations?: readonly KeywordLocation[];
    defaultLocation?: string;
    onAddKeywords?: (input: AddKeywordsInput) => Promise<KeywordResult>;
    onRemoveKeywords?: (ids: string[]) => Promise<KeywordResult>;
    /** Check now: every keyword when `ids` is empty. */
    onRefresh?: (ids: string[]) => Promise<KeywordResult>;
    /** Saves an edit of the ranking URL in the table. Without it the URL is read only. */
    onUpdateKeyword?: (id: string, patch: { url: string }) => Promise<KeywordResult>;
    /** Open a keyword's results page, or its report. */
    onOpenKeyword?: (keyword: TrackedKeyword) => void;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<KeywordTrackerLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  {
    positionHistory: undefined,
    competitors: undefined,
    locations: undefined,
    defaultLocation: undefined,
    onAddKeywords: undefined,
    onRemoveKeywords: undefined,
    onRefresh: undefined,
    onUpdateKeyword: undefined,
    onOpenKeyword: undefined,
    pageSize: 8,
    loading: false,
    error: undefined,
    onRetry: undefined,
    labels: undefined,
  },
);

const t = useAnalyticsLabels(KEYWORD_STRINGS, () => props.labels);
const adding = ref(false);
const removing = ref<string[] | null>(null);
const busy = ref(false);
const failed = ref<string | null>(null);
const tab = ref("keywords");

async function run(fn: () => Promise<KeywordResult>) {
  busy.value = true;
  failed.value = null;
  try {
    const out = await fn();
    if (out && out.error) failed.value = out.error;
  } catch {
    failed.value = t.value.actionFailed;
  } finally {
    busy.value = false;
  }
}

const stats = computed(() => {
  const ks = props.keywords;
  const now = ks.map((k) => k.position);
  const prevOf = (k: TrackedKeyword) => (k.previousPosition === undefined ? k.position : k.previousPosition);
  const hasPrev = ks.some((k) => k.previousPosition !== undefined);
  const top10 = (ps: (number | null)[]) => ps.filter((p) => p !== null && p <= 10).length;
  return {
    distribution: rankDistribution(now),
    avg: averagePosition(now),
    avgPrev: hasPrev ? averagePosition(ks.map(prevOf)) : undefined,
    top10: top10(now),
    top10Prev: hasPrev ? top10(ks.map(prevOf)) : undefined,
    visibility: visibilityShare(ks),
    visibilityPrev: hasPrev ? visibilityShare(ks.map((k) => ({ volume: k.volume, position: prevOf(k) }))) : undefined,
    movers: topMovers(ks, 3),
  };
});

const compact = { notation: "compact", maximumFractionDigits: 1 } as const;
const bestOf = (k: TrackedKeyword) => k.best ?? bestPosition([...(k.history ?? []), k.position]);

const columns = computed<DataTableColumn<TrackedKeyword>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "keyword",
      header: tt.keyword,
      label: tt.keyword,
      hideable: false,
      sortValue: (k) => k.keyword,
      searchValue: (k) => k.keyword,
      cell: (k) => h("span", { dir: "auto", class: "block max-w-[26ch] truncate text-label text-foreground" }, k.keyword),
    },
    {
      id: "position",
      header: tt.position,
      label: tt.position,
      align: "end",
      sortValue: (k) => k.position,
      cell: (k) =>
        h("span", { class: "inline-flex items-center justify-end gap-2" }, [
          k.position === null ? h("span", { class: "text-caption text-muted-foreground" }, tt.notRanking) : h(NqNum, { value: k.position, class: "text-label font-semibold text-foreground" }),
          h(NqRankChange, { current: k.position, previous: k.previousPosition, labels: props.labels }),
        ]),
    },
    {
      id: "best",
      header: tt.best,
      label: tt.best,
      align: "end",
      sortValue: bestOf,
      cell: (k) => {
        const b = bestOf(k);
        return b === null ? "-" : h(NqNum, { value: b });
      },
    },
    {
      id: "trend",
      header: tt.trend,
      label: tt.trend,
      cell: (k) =>
        k.history && k.history.length > 1
          ? h(NqSparkline, {
              class: "h-7 w-24",
              // Higher on the chart is a better rank, so the position is negated. A day without a rank sits at the bottom.
              data: k.history.map((p) => -(p ?? 101)),
              color: k.position !== null && k.previousPosition != null && k.position > k.previousPosition ? "var(--nq-danger)" : "var(--nq-success)",
              label: `${k.keyword}: ${tt.trend}`,
            })
          : null,
    },
    {
      id: "url",
      header: tt.url,
      label: tt.url,
      sortValue: (k) => k.url ?? "",
      searchValue: (k) => k.url ?? "",
      edit: props.onUpdateKeyword
        ? { type: "text", value: (k) => k.url ?? "", label: tt.url, validate: (v) => (String(v).trim() === "" || /^\/|^https?:\/\//i.test(String(v).trim()) ? null : "/path or https://…") }
        : undefined,
      cell: (k) =>
        k.url
          ? h("bdi", { dir: "ltr", class: "block max-w-[22ch] truncate text-caption text-muted-foreground sm:max-w-[30ch]" }, k.url)
          : h("span", { class: "text-caption text-muted-foreground" }, tt.urlEmpty),
    },
    {
      id: "volume",
      header: tt.volume,
      label: tt.volume,
      align: "end",
      sortValue: (k) => k.volume,
      cell: (k) => h(NqNum, { value: k.volume, format: compact, title: tt.volumePerMonth }),
    },
    {
      id: "difficulty",
      header: tt.difficulty,
      label: tt.difficulty,
      sortValue: (k) => k.difficulty,
      cell: (k) => {
        const band = difficultyBand(k.difficulty);
        return h(NqBadge, { variant: DIFFICULTY_VARIANT[band], title: tt.difficultyBand[band] }, () => [h(NqNum, { value: k.difficulty }), ` ${tt.difficultyBand[band]}`]);
      },
    },
    {
      id: "features",
      header: tt.features,
      label: tt.features,
      cell: (k) =>
        k.features && k.features.length > 0
          ? h(
              "span",
              { class: "flex flex-wrap gap-1" },
              k.features.map((f) => h(NqBadge, { key: f, variant: "outline" }, () => tt.feature[f] ?? f)),
            )
          : null,
    },
  ];
});

const table = useDataTable<TrackedKeyword>({
  data: () => [...props.keywords],
  columns,
  getRowId: (k) => k.id,
  pageSize: props.pageSize,
  selectable: !!props.onRemoveKeywords,
  defaultSort: { id: "position", direction: "asc" },
});

const rowActions = (k: TrackedKeyword): DataTableRowAction[] => [
  ...(props.onOpenKeyword ? [{ id: "open", label: t.value.openSerp, icon: ExternalLink, onSelect: () => props.onOpenKeyword!(k), group: "a" }] : []),
  ...(props.onRefresh ? [{ id: "refresh", label: t.value.refreshRow, icon: RefreshCw, onSelect: () => void run(() => props.onRefresh!([k.id])), group: "a" }] : []),
  ...(props.onRemoveKeywords ? [{ id: "remove", label: t.value.remove, icon: Trash2, danger: true, onSelect: () => (removing.value = [k.id]), group: "z" }] : []),
];

const tableActions = computed<DataTableAction[]>(() => [
  ...(props.onAddKeywords && props.locations && props.locations.length > 0 ? [{ id: "add", label: t.value.add, icon: Plus, primary: true, onSelect: () => (adding.value = true) }] : []),
  ...(props.onRefresh ? [{ id: "refresh", label: t.value.refresh, icon: RefreshCw, iconOnly: true, loading: busy.value, onSelect: () => void run(() => props.onRefresh!([])) }] : []),
]);

const onCellEdit = (row: TrackedKeyword, _col: string, value: unknown) => run(() => props.onUpdateKeyword!(row.id, { url: String(value).trim() }));

const seriesMetrics = computed<TimeSeriesMetric[]>(() => [
  { id: "position", label: t.value.avgPositionShort, aggregate: "avg", lowerIsBetter: true, format: { minimumFractionDigits: 1, maximumFractionDigits: 1 }, color: "var(--nq-info)" },
  { id: "top10", label: t.value.inTop10Short, aggregate: "avg", format: { maximumFractionDigits: 0 }, color: "var(--nq-success)" },
]);

function confirmRemove() {
  const ids = removing.value ?? [];
  removing.value = null;
  table.setSelection(new Set());
  if (props.onRemoveKeywords) void run(() => props.onRemoveKeywords!(ids));
}
</script>

<template>
  <div data-slot="keyword-tracker" :class="cn('flex w-full flex-col gap-6', props.class)">
    <NqMetricTiles
      :metrics="[
        { id: 'tracked', label: t.tracked, value: props.keywords.length },
        { id: 'avg', label: t.avgPosition, value: stats.avg ?? 0, previous: stats.avgPrev ?? undefined, invert: true, format: { minimumFractionDigits: 1, maximumFractionDigits: 1 } },
        { id: 'top10', label: t.inTop10, value: stats.top10, previous: stats.top10Prev },
        { id: 'visibility', label: t.visibility, value: stats.visibility, previous: stats.visibilityPrev, format: { style: 'percent', maximumFractionDigits: 1 } },
      ]"
      :comparison-label="t.comparison"
      :loading="props.loading"
    />

    <div class="grid gap-4 lg:grid-cols-3">
      <NqTimeSeriesPanel
        v-if="props.positionHistory"
        class="lg:col-span-2"
        :title="t.historyTitle"
        :description="t.historyDescription"
        :metrics="seriesMetrics"
        :data="props.positionHistory"
        default-metric="position"
        :loading="props.loading"
        :default-compare="false"
      />
      <div :class="cn('flex flex-col gap-4', props.positionHistory ? '' : 'lg:col-span-3 lg:grid lg:grid-cols-2')">
        <NqRankDistribution :distribution="stats.distribution" :labels="props.labels" />
        <NqCard data-slot="keyword-movers">
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.moversTitle }}</NqCardTitle>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-4">
            <div v-for="group in [{ key: 'g', title: t.gainers, rows: stats.movers.gainers }, { key: 'l', title: t.losers, rows: stats.movers.losers }]" :key="group.key" class="flex flex-col gap-1.5">
              <span class="text-caption font-medium text-muted-foreground">{{ group.title }}</span>
              <span v-if="group.rows.length === 0" class="text-caption text-muted-foreground">{{ t.noMovers }}</span>
              <ul v-else class="flex flex-col gap-1">
                <li v-for="k in group.rows" :key="`${group.key}-${k.id}`" class="flex items-center justify-between gap-2 text-body-sm">
                  <span dir="auto" class="min-w-0 truncate text-foreground">{{ k.keyword }}</span>
                  <NqRankChange :current="k.position" :previous="k.previousPosition" :labels="props.labels" class="shrink-0" />
                </li>
              </ul>
            </div>
          </NqCardContent>
        </NqCard>
      </div>
    </div>

    <NqTabs v-model="tab">
      <NqTabsList variant="underline">
        <NqTabsTab value="keywords">{{ t.tabKeywords }}</NqTabsTab>
        <NqTabsTab v-if="props.competitors" value="competitors">{{ t.tabCompetitors }}</NqTabsTab>
      </NqTabsList>
      <NqTabsPanel value="keywords" class="pt-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h3">{{ t.keywordsTitle }}</NqCardTitle>
            <NqCardDescription>{{ t.keywordsDescription }}</NqCardDescription>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <NqDataTableToolbar>
              <NqDataTableSearch :table="table" :placeholder="t.filter" />
              <NqDataTableActions v-if="tableActions.length > 0" :actions="tableActions" />
            </NqDataTableToolbar>
            <NqDataTableBulkActions v-if="props.onRemoveKeywords" :table="table">
              <NqButton size="sm" variant="secondary" @click="removing = [...table.selection]">
                <Trash2 aria-hidden="true" />
                {{ t.remove }}
              </NqButton>
            </NqDataTableBulkActions>
            <NqStatus v-if="failed" tone="danger" role="alert">{{ failed }}</NqStatus>
            <NqDataTable
              :table="table"
              :label="t.keywordsTitle"
              :loading="props.loading"
              :error="props.error"
              :on-retry="props.onRetry"
              :labels="{ empty: t.empty }"
              :row-actions="rowActions"
              :on-row-click="props.onOpenKeyword"
              :on-cell-edit="props.onUpdateKeyword ? onCellEdit : undefined"
            />
            <NqDataTablePagination v-if="props.keywords.length > props.pageSize" :table="table" />
          </NqCardContent>
        </NqCard>
      </NqTabsPanel>
      <NqTabsPanel v-if="props.competitors" value="competitors" class="pt-4">
        <NqCompetitorComparison :keywords="props.keywords" :competitors="props.competitors" :labels="props.labels" />
      </NqTabsPanel>
    </NqTabs>

    <NqAddKeywordsDialog v-if="props.locations && props.onAddKeywords" v-model:open="adding" :locations="props.locations" :default-location="props.defaultLocation" :on-add="props.onAddKeywords" :labels="props.labels" />

    <NqAlertDialog :open="removing !== null" @update:open="(o: boolean) => !o && (removing = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.removeTitle(removing?.length ?? 0) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.removeBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
          <NqAlertDialogAction @click="confirmRemove">{{ t.remove }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
