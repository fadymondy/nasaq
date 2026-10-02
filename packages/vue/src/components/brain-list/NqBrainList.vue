<script setup lang="ts">
import { Brain } from "lucide-vue-next";
import { computed, h } from "vue";
import { useNasaq } from "../../provider";
import type { DataTableColumn } from "../data-table";
import { NqActivityCell, NqAvatarStack, NqEntityList, NqTagList, type EntityFacet, type EntityListContext } from "../entity-list";
import { formatNumber } from "../numeric";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import NqBrainCard from "./NqBrainCard.vue";
import NqBrainMark from "./NqBrainMark.vue";
import { brainStrings, type BrainLabelOverrides } from "./strings";
import type { BrainSummary } from "./types";
import { BRAIN_STATUS_ORDER, BRAIN_STATUS_VIEW, BRAIN_VISIBILITY_ORDER, BRAIN_VISIBILITY_VIEW } from "./view";

// A list of brains as a table or as cards: status, access, memory / source / chat counts, members, tags and last
// activity, with search, filters and bulk select. Built on NqEntityList: its other props (`rowActions`, `actions`,
// `view`, `pageSize`, `onRowClick`, `loading`, …) and its slots (`toolbar`, `bulk`, `empty`) pass straight through.
const props = defineProps<{
  brains: BrainSummary[];
  /** The list's accessible name. Default "Brains" / "العقول". */
  label?: string;
  /** Override any built-in string, including status and access names. */
  labels?: BrainLabelOverrides & Record<string, unknown>;
}>();
defineSlots<{ empty?: () => unknown; toolbar?: (p: EntityListContext<BrainSummary>) => unknown; bulk?: (p: EntityListContext<BrainSummary>) => unknown }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => brainStrings(locale.value, props.labels as BrainLabelOverrides));

const columns = computed<DataTableColumn<BrainSummary>[]>(() => {
  const s = t.value;
  const loc = locale.value;
  return [
    {
      id: "name",
      header: s.name,
      hideable: false,
      cell: (b) =>
        h("span", { class: "flex min-w-0 items-center gap-3" }, [
          h(NqBrainMark, { brain: b }),
          h("span", { class: "flex min-w-0 flex-col" }, [
            h("span", { class: "truncate text-label text-foreground" }, b.name),
            b.description ? h("span", { class: "truncate text-body-sm text-muted-foreground" }, b.description) : null,
          ]),
        ]),
      sortValue: (b) => b.name,
      searchValue: (b) => `${b.name} ${b.description ?? ""} ${b.model ?? ""}`,
      className: "min-w-64",
    },
    {
      id: "status",
      header: s.status,
      cell: (b) => h(NqStatus, { tone: BRAIN_STATUS_VIEW[b.status].tone, icon: BRAIN_STATUS_VIEW[b.status].icon }, () => s.statuses[b.status]),
      sortValue: (b) => BRAIN_STATUS_ORDER.indexOf(b.status),
    },
    {
      id: "visibility",
      header: s.visibility,
      cell: (b) =>
        h("span", { class: "inline-flex items-center gap-1.5 text-body-sm" }, [
          h(BRAIN_VISIBILITY_VIEW[b.visibility], { class: "size-3.5 text-muted-foreground", "aria-hidden": "true" }),
          s.visibilities[b.visibility],
        ]),
      sortValue: (b) => BRAIN_VISIBILITY_ORDER.indexOf(b.visibility),
    },
    { id: "memories", header: s.memories, align: "end", cell: (b) => h("span", { class: "tabular-nums" }, formatNumber(b.memories, loc)), sortValue: (b) => b.memories },
    { id: "sources", header: s.sources, align: "end", cell: (b) => h("span", { class: "tabular-nums" }, formatNumber(b.sources, loc)), sortValue: (b) => b.sources },
    {
      id: "chats",
      header: s.chats,
      align: "end",
      cell: (b) => h("span", { class: "tabular-nums" }, b.chats == null ? "—" : formatNumber(b.chats, loc)),
      sortValue: (b) => b.chats ?? 0,
      defaultHidden: true,
    },
    { id: "members", header: s.members, cell: (b) => h(NqAvatarStack, { people: b.members ?? [] }) },
    {
      id: "model",
      header: s.model,
      cell: (b) => (b.model ? h("bdi", { dir: "ltr", class: "font-mono text-code" }, b.model) : "—"),
      sortValue: (b) => b.model,
      defaultHidden: true,
    },
    { id: "tags", header: s.tags, cell: (b) => h(NqTagList, { tags: b.tags ?? [] }), defaultHidden: true },
    {
      id: "lastActive",
      header: s.lastActive,
      cell: (b) => h(NqActivityCell, { value: b.lastActive }),
      sortValue: (b) => (b.lastActive == null ? null : new Date(b.lastActive)),
      align: "end",
    },
  ];
});

const facets = computed<EntityFacet<BrainSummary>[]>(() => {
  const s = t.value;
  const tags = new Set<string>();
  for (const b of props.brains) for (const tag of b.tags ?? []) tags.add(tag.label);
  return [
    {
      id: "status",
      title: s.status,
      options: BRAIN_STATUS_ORDER.map((k) => ({ value: k, label: s.statuses[k], icon: BRAIN_STATUS_VIEW[k].icon })),
      getValues: (b: BrainSummary) => [b.status],
    },
    {
      id: "visibility",
      title: s.visibility,
      options: BRAIN_VISIBILITY_ORDER.map((v) => ({ value: v, label: s.visibilities[v], icon: BRAIN_VISIBILITY_VIEW[v] })),
      getValues: (b: BrainSummary) => [b.visibility],
    },
    {
      id: "tags",
      title: s.tags,
      options: [...tags].sort((a, b) => a.localeCompare(b, locale.value)).map((v) => ({ value: v, label: v })),
      getValues: (b: BrainSummary) => (b.tags ?? []).map((tag) => tag.label),
    },
  ].filter((f) => f.options.length > 0);
});
</script>

<template>
  <NqEntityList
    :data="props.brains"
    :columns="columns"
    :get-row-id="(b: BrainSummary) => b.id"
    :row-label="(b: BrainSummary) => b.name"
    :label="props.label ?? t.label"
    :facets="facets"
    :search-placeholder="t.search"
    :default-sort="{ id: 'lastActive', direction: 'desc' }"
    :labels="props.labels as never"
  >
    <template #card="{ row }"><NqBrainCard :brain="row" :labels="props.labels as BrainLabelOverrides" /></template>
    <template v-if="$slots.toolbar" #toolbar="ctx"><slot name="toolbar" v-bind="ctx" /></template>
    <template v-if="$slots.bulk" #bulk="ctx"><slot name="bulk" v-bind="ctx" /></template>
    <template #empty><slot name="empty"><NqEmptyState :icon="Brain" :title="t.empty" :description="t.emptyHint" class="border-0" /></slot></template>
  </NqEntityList>
</template>
