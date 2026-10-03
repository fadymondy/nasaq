<script setup lang="ts">
import { Bot, Cpu, Globe, RefreshCw, Server, UserRound } from "lucide-vue-next";
import { computed, h, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import type { DateRange } from "../calendar";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, NqDataTableViewOptions, useDataTable, type DataTableColumn } from "../data-table";
import { NqDateRangePicker } from "../date-picker";
import { NqDialog, NqDialogContent } from "../dialog";
import { NqDateTime } from "../numeric";
import { NqEmptyState } from "../states";
import { actorKey, AUDIT_CHANNELS, filterEntries, type AuditChannel, type AuditEntry } from "./audit-rules";
import { auditLogStrings, type AuditLogLabels } from "./audit-log-strings";
import type { AuditRetention } from "./audit-log-types";
import NqAuditLogDetails from "./NqAuditLogDetails.vue";
import NqAuditRetention from "./NqAuditRetention.vue";

// The audit log: who did what, to which entity, from where (web, API or MCP) and when. Filter by actor,
// action, entity, channel and dates; open a row to see the field-level before and after. A retention control
// sets how long entries are kept. You send the entries; filtering runs on them in the browser.
const props = withDefaults(
  defineProps<{
    entries: readonly AuditEntry[];
    /** Friendly names for action ids, for example `{ "member.role_changed": "Role changed" }`. Unknown ids show as they are. */
    actionLabels?: Record<string, string>;
    /** Friendly names for entity types. */
    entityLabels?: Record<string, string>;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    onRefresh?: () => void | Promise<void>;
    pageSize?: number;
    /** Shows the retention setting. */
    retention?: AuditRetention;
    /** Save a new retention. Reject or resolve `{ error }` to roll it back. Omit to show it read-only. */
    onChangeRetention?: (days: number | null) => Promise<void | { error?: string }>;
    labels?: AuditLogLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { pageSize: 10, actionLabels: undefined, entityLabels: undefined, error: undefined, onRetry: undefined, onRefresh: undefined, retention: undefined, onChangeRetention: undefined, labels: undefined },
);

const nq = useNasaq();
const t = computed(() => ({ ...auditLogStrings(nq.locale.value), ...props.labels }));
const actionName = (id: string) => props.actionLabels?.[id] ?? id;
const entityName = (id: string) => props.entityLabels?.[id] ?? id;

const range = ref<DateRange>({ from: null, to: null });
const openEntry = ref<AuditEntry | null>(null);
const refreshing = ref(false);

const dated = computed(() => filterEntries(props.entries, { from: range.value.from, to: range.value.to }) as AuditEntry[]);

const actors = computed(() => {
  const seen = new Map<string, string>();
  for (const e of props.entries) if (!seen.has(actorKey(e))) seen.set(actorKey(e), e.actor?.name ?? t.value.system);
  return [...seen].map(([value, label]) => ({ value, label }));
});
const actions = computed(() => [...new Set(props.entries.map((e) => e.action))].sort().map((value) => ({ value, label: actionName(value) })));
const entities = computed(() => [...new Set(props.entries.map((e) => e.entity.type))].sort().map((value) => ({ value, label: entityName(value) })));
const channels = computed(() => AUDIT_CHANNELS.map((c) => ({ value: c, label: t.value.channels[c] })));

const CHANNEL_ICON: Record<AuditChannel, Component> = { web: Globe, api: Server, mcp: Bot };

const columns = computed<DataTableColumn<AuditEntry>[]>(() => {
  const s = t.value;
  return [
    {
      id: "when",
      header: s.when,
      label: s.when,
      hideable: false,
      sortValue: (e) => new Date(e.at),
      cell: (e) => h("span", { class: "whitespace-nowrap text-body-sm text-foreground" }, [h(NqDateTime, { value: e.at, format: { dateStyle: "medium", timeStyle: "short" } })]),
    },
    {
      id: "actor",
      header: s.actor,
      label: s.actor,
      sortValue: (e) => e.actor?.name ?? s.system,
      searchValue: (e) => `${e.actor?.name ?? ""} ${e.actor?.email ?? ""}`,
      filterValue: actorKey,
      cell: (e) =>
        e.actor
          ? h("div", { class: "flex min-w-0 items-center gap-2" }, [
              h(NqAvatar, { name: e.actor.name, src: e.actor.avatar, size: "sm" }),
              h("div", { class: "flex min-w-0 flex-col" }, [
                h("span", { class: "truncate text-label text-foreground" }, e.actor.name),
                e.actor.email ? h("bdi", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, e.actor.email) : null,
              ]),
            ])
          : h("span", { class: "flex items-center gap-2 text-body-sm text-muted-foreground" }, [h(Cpu, { "aria-hidden": "true", class: "size-4" }), s.system]),
    },
    {
      id: "action",
      header: s.action,
      label: s.action,
      sortValue: (e) => actionName(e.action),
      searchValue: (e) => `${e.action} ${actionName(e.action)}`,
      filterValue: (e) => e.action,
      cell: (e) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "truncate text-label text-foreground" }, actionName(e.action)),
          props.actionLabels?.[e.action] ? h("bdi", { dir: "ltr", class: "truncate font-mono text-caption text-muted-foreground" }, e.action) : null,
        ]),
    },
    {
      id: "entity",
      header: s.entity,
      label: s.entity,
      sortValue: (e) => e.entity.label ?? e.entity.type,
      searchValue: (e) => `${e.entity.type} ${entityName(e.entity.type)} ${e.entity.label ?? ""} ${e.entity.id ?? ""}`,
      filterValue: (e) => e.entity.type,
      cell: (e) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "truncate text-body-sm text-foreground" }, e.entity.label ?? entityName(e.entity.type)),
          h("span", { class: "truncate text-caption text-muted-foreground" }, entityName(e.entity.type)),
        ]),
    },
    {
      id: "channel",
      header: s.channel,
      label: s.channel,
      sortValue: (e) => e.channel,
      filterValue: (e) => e.channel,
      cell: (e) => h(NqBadge, { variant: "outline" }, () => [h(CHANNEL_ICON[e.channel], { "aria-hidden": "true" }), s.channels[e.channel]]),
    },
    {
      id: "ip",
      header: s.ip,
      label: s.ip,
      defaultHidden: true,
      cell: (e) => (e.ip ? h("bdi", { dir: "ltr", class: "font-mono text-caption" }, e.ip) : h("span", { class: "text-muted-foreground" }, "-")),
    },
  ];
});

const table = useDataTable<AuditEntry>({ data: dated, columns, getRowId: (e) => e.id, pageSize: props.pageSize, defaultSort: { id: "when", direction: "desc" } });
const hasFilters = computed(() => !!(range.value.from || range.value.to));
const nothing = computed(() => !props.loading && !props.error && props.entries.length === 0);

async function refresh() {
  refreshing.value = true;
  try {
    await props.onRefresh?.();
  } finally {
    refreshing.value = false;
  }
}
</script>

<template>
  <div data-slot="audit-log" :class="cn('flex flex-col gap-4', props.class)">
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="actor" :title="t.actor" :options="actors" />
      <NqDataTableFacetFilter :table="table" column="action" :title="t.action" :options="actions" />
      <NqDataTableFacetFilter :table="table" column="entity" :title="t.entity" :options="entities" />
      <NqDataTableFacetFilter :table="table" column="channel" :title="t.channel" :options="channels" />
      <NqDateRangePicker v-model="range" :placeholder="t.datePlaceholder" :aria-label="t.dates" class="w-56" />
      <NqButton v-if="hasFilters" variant="ghost" size="sm" @click="range = { from: null, to: null }">{{ t.clearDates }}</NqButton>
      <NqDataTableViewOptions :table="table" />
      <NqButton v-if="props.onRefresh" variant="secondary" size="sm" class="ms-auto" :loading="refreshing" @click="refresh">
        <RefreshCw />
        {{ t.refresh }}
      </NqButton>
    </NqDataTableToolbar>

    <NqDataTable
      :table="table"
      :label="t.table"
      :row-label="(e: AuditEntry) => actionName(e.action)"
      :loading="props.loading"
      :error="props.error"
      :on-retry="props.onRetry"
      :on-row-click="(e: AuditEntry) => (openEntry = e)"
    >
      <template #empty>
        <NqEmptyState v-if="nothing" :icon="UserRound" :title="t.empty" :description="t.emptyHint" />
        <NqEmptyState v-else :title="t.noMatch" :description="t.noMatchHint" />
      </template>
    </NqDataTable>
    <NqDataTablePagination :table="table" />

    <NqAuditRetention v-if="props.retention" :retention="props.retention" :entries="props.entries" :on-change="props.onChangeRetention" :t="t" />

    <NqDialog :open="!!openEntry" @update:open="(o: boolean) => !o && (openEntry = null)">
      <NqDialogContent class="max-w-2xl" data-slot="audit-log-details">
        <NqAuditLogDetails v-if="openEntry" :entry="openEntry" :t="t" :action-name="actionName" :entity-name="entityName" />
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
