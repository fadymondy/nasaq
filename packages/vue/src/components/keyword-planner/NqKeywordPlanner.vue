<script setup lang="ts">
import { Crown, Layers, TriangleAlert } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { classifyIntent, clusterKeywords, findCannibalization, normalizeUrl, type SearchIntent } from "./planner-math";
import { PLANNER_STRINGS, type KeywordPlannerLabels, type PlannerKeyword, type PlannerResult } from "./planner-strings";

// A keyword planner: every keyword with its intent, cluster, volume, difficulty and owning page (edit it in the cell),
// a clusters view that groups related keywords under the biggest one, and a cannibalization view that lists keywords
// where two of your pages compete, with a one-click way to choose the page to keep.
const INTENT_VARIANT: Record<SearchIntent, "info" | "accent" | "success" | "neutral"> = { informational: "info", commercial: "accent", transactional: "success", navigational: "neutral" };

const props = withDefaults(
  defineProps<{
    keywords: readonly PlannerKeyword[];
    /** Saves the owning page of a keyword. An empty string removes the owner. Without it owners are read only. */
    onAssignOwner?: (id: string, url: string) => Promise<PlannerResult> | PlannerResult;
    title?: string;
    description?: string;
    pageSize?: number;
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    labels?: Partial<KeywordPlannerLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { onAssignOwner: undefined, title: undefined, description: undefined, pageSize: 8, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useAnalyticsLabels(PLANNER_STRINGS, () => props.labels);
const tab = ref("keywords");
const failed = ref<string | null>(null);

const clusters = computed(() => clusterKeywords(props.keywords));
const clusterOf = computed(() => {
  const m = new Map<string, string>();
  for (const c of clusters.value) for (const k of c.keywords) m.set(k.id, c.head);
  return m;
});
const conflicts = computed(() => findCannibalization(props.keywords));
const conflictKeys = computed(() => new Set(conflicts.value.map((c) => c.keyword)));

async function assign(id: string, url: string): Promise<PlannerResult> {
  if (!props.onAssignOwner) return;
  failed.value = null;
  try {
    const out = await props.onAssignOwner(id, url);
    if (out && out.error) failed.value = out.error;
    return out;
  } catch {
    failed.value = t.value.failed;
  }
}

const stateOf = (k: PlannerKeyword): "conflict" | "owned" | "unassigned" => (conflictKeys.value.has(k.keyword) ? "conflict" : k.ownerUrl ? "owned" : "unassigned");
const intentOf = (k: PlannerKeyword): SearchIntent => k.intent ?? classifyIntent(k.keyword);
const compact = { notation: "compact", maximumFractionDigits: 1 } as const;

const columns = computed<DataTableColumn<PlannerKeyword>[]>(() => [
  {
    id: "keyword",
    header: t.value.keyword,
    label: t.value.keyword,
    hideable: false,
    sortValue: (k) => k.keyword,
    searchValue: (k) => `${k.keyword} ${k.ownerUrl ?? ""}`,
    cell: (k) => h("span", { dir: "auto", class: "block max-w-[26ch] truncate text-label text-foreground" }, k.keyword),
  },
  {
    id: "intent",
    header: t.value.intent,
    label: t.value.intent,
    sortValue: intentOf,
    filterValue: intentOf,
    cell: (k) => h(NqBadge, { variant: INTENT_VARIANT[intentOf(k)] }, () => t.value.intents[intentOf(k)]),
  },
  {
    id: "cluster",
    header: t.value.cluster,
    label: t.value.cluster,
    sortValue: (k) => clusterOf.value.get(k.id) ?? "",
    cell: (k) => h("span", { dir: "auto", class: "block max-w-[20ch] truncate text-body-sm text-muted-foreground" }, clusterOf.value.get(k.id)),
  },
  { id: "volume", header: t.value.volume, label: t.value.volume, align: "end", sortValue: (k) => k.volume, cell: (k) => h(NqNum, { value: k.volume, format: compact }) },
  { id: "difficulty", header: t.value.difficulty, label: t.value.difficulty, align: "end", sortValue: (k) => k.difficulty, cell: (k) => h(NqNum, { value: k.difficulty }) },
  {
    id: "owner",
    header: t.value.owner,
    label: t.value.owner,
    sortValue: (k) => k.ownerUrl ?? "",
    searchValue: (k) => k.ownerUrl ?? "",
    edit: props.onAssignOwner
      ? { type: "text", value: (k) => k.ownerUrl ?? "", label: t.value.owner, validate: (v) => (String(v).trim() === "" || /^\/|^https?:\/\//i.test(String(v).trim()) ? null : t.value.ownerInvalid) }
      : undefined,
    cell: (k) => (k.ownerUrl ? h("bdi", { dir: "ltr", class: "block max-w-[22ch] truncate text-caption text-foreground" }, k.ownerUrl) : h("span", { class: "text-caption text-muted-foreground" }, t.value.ownerEmpty)),
  },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    sortValue: stateOf,
    filterValue: stateOf,
    cell: (k) => {
      const s = stateOf(k);
      return s === "conflict" ? h(NqStatus, { tone: "danger" }, () => t.value.conflict) : s === "owned" ? h(NqStatus, { tone: "success" }, () => t.value.owned) : h(NqStatus, { tone: "warning" }, () => t.value.unassigned);
    },
  },
]);

const table = useDataTable<PlannerKeyword>({ data: () => [...props.keywords], columns, getRowId: (k) => k.id, pageSize: props.pageSize, defaultSort: { id: "volume", direction: "desc" } });

const rowActions = (k: PlannerKeyword): DataTableRowAction[] => (props.onAssignOwner && k.ownerUrl ? [{ id: "clear", label: t.value.clearOwner, onSelect: () => void assign(k.id, "") }] : []);
const onCellEdit = (row: PlannerKeyword, _col: string, value: unknown) => assign(row.id, String(value).trim());
const intentOptions = computed(() => (["informational", "commercial", "transactional", "navigational"] as const).map((v) => ({ value: v, label: t.value.intents[v] })));
const statusOptions = computed(() => [
  { value: "unassigned", label: t.value.unassigned },
  { value: "owned", label: t.value.owned },
  { value: "conflict", label: t.value.conflict },
]);
const rowFor = (keyword: string) => props.keywords.find((k) => k.keyword === keyword);
const isKeep = (url: string, keep: string) => normalizeUrl(url) === normalizeUrl(keep);
</script>

<template>
  <NqCard data-slot="keyword-planner" :class="props.class">
    <NqCardHeader>
      <NqCardTitle as="h3"><slot name="title">{{ props.title ?? t.title }}</slot></NqCardTitle>
      <NqCardDescription><slot name="description">{{ props.description ?? t.description }}</slot></NqCardDescription>
    </NqCardHeader>
    <NqCardContent>
      <NqTabs v-model="tab">
        <NqTabsList variant="underline">
          <NqTabsTab value="keywords">{{ t.tabKeywords }}</NqTabsTab>
          <NqTabsTab value="clusters">
            <Layers aria-hidden="true" />
            {{ t.tabClusters }}
          </NqTabsTab>
          <NqTabsTab value="cannibalization">
            <TriangleAlert aria-hidden="true" />
            {{ t.tabCannibalization }}
            <NqBadge v-if="conflicts.length > 0" variant="danger">{{ conflicts.length }}</NqBadge>
          </NqTabsTab>
        </NqTabsList>

        <NqTabsPanel value="keywords" class="flex flex-col gap-3 pt-4">
          <NqDataTableToolbar>
            <NqDataTableSearch :table="table" :placeholder="t.filter" />
            <NqDataTableFacetFilter :table="table" column="intent" :title="t.intent" :options="intentOptions" />
            <NqDataTableFacetFilter :table="table" column="status" :title="t.status" :options="statusOptions" />
          </NqDataTableToolbar>
          <NqStatus v-if="failed" tone="danger" role="alert">{{ failed }}</NqStatus>
          <NqDataTable :table="table" :label="t.title" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :row-actions="rowActions" :on-cell-edit="props.onAssignOwner ? onCellEdit : undefined">
            <template #empty><NqEmptyState :title="t.empty" class="border-0" /></template>
          </NqDataTable>
          <NqDataTablePagination v-if="props.keywords.length > props.pageSize" :table="table" />
        </NqTabsPanel>

        <NqTabsPanel value="clusters" class="pt-4">
          <NqEmptyState v-if="clusters.length === 0" :icon="Layers" :title="t.noClusters" />
          <ul v-else class="grid gap-3 md:grid-cols-2">
            <li v-for="c in clusters" :key="c.id" data-slot="keyword-cluster" class="flex flex-col gap-2 rounded-card border border-border p-3">
              <div class="flex items-start justify-between gap-3">
                <div class="flex min-w-0 flex-col">
                  <span class="text-caption text-muted-foreground">{{ t.clusterHead }}</span>
                  <span dir="auto" class="truncate text-label text-foreground">{{ c.head }}</span>
                </div>
                <div class="flex shrink-0 flex-col items-end text-caption text-muted-foreground">
                  <span>{{ t.clusterKeywordsCount(c.keywords.length) }}</span>
                  <span>{{ t.clusterVolume }} <NqNum :value="c.volume" :format="compact" /></span>
                </div>
              </div>
              <ul class="flex flex-wrap gap-1">
                <li v-for="k in c.keywords" :key="k.id">
                  <NqBadge variant="outline" dir="auto">{{ k.keyword }}</NqBadge>
                </li>
              </ul>
            </li>
          </ul>
        </NqTabsPanel>

        <NqTabsPanel value="cannibalization" class="flex flex-col gap-3 pt-4">
          <p class="text-body-sm text-muted-foreground">{{ t.conflictBody }}</p>
          <p role="status" class="text-label text-foreground">{{ t.conflictTitle(conflicts.length) }}</p>
          <NqEmptyState v-if="conflicts.length === 0" :title="t.conflictNone" />
          <ul v-else class="flex flex-col gap-3">
            <li v-for="c in conflicts" :key="c.keyword" data-slot="keyword-conflict" class="flex flex-col gap-2 rounded-card border border-border p-3">
              <span dir="auto" class="text-label text-foreground">{{ c.keyword }}</span>
              <ul class="flex flex-col divide-y divide-border">
                <li v-for="u in c.urls" :key="u.url" class="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span class="flex min-w-0 items-center gap-2">
                    <NqBadge v-if="isKeep(u.url, c.keep)" variant="success">
                      <Crown aria-hidden="true" />
                      {{ t.keep }}
                    </NqBadge>
                    <bdi dir="ltr" class="truncate text-body-sm text-foreground">{{ u.url }}</bdi>
                  </span>
                  <span class="flex items-center gap-3">
                    <span class="text-caption text-muted-foreground"><bdi>{{ t.positionShort(u.position) }}</bdi></span>
                    <NqButton v-if="props.onAssignOwner && rowFor(c.keyword) && !isKeep(u.url, c.keep)" size="sm" variant="secondary" @click="assign(rowFor(c.keyword)!.id, u.url)">{{ t.keepThis }}</NqButton>
                  </span>
                </li>
              </ul>
            </li>
          </ul>
        </NqTabsPanel>
      </NqTabs>
    </NqCardContent>
  </NqCard>
</template>
