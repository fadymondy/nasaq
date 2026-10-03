<script setup lang="ts">
import { Ban, CirclePlay, CircleStop, ListRestart, Power, RotateCw, ServerCog } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDateTime } from "../numeric";
import { NqSpinner } from "../spinner";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { formatBytes, isDisruptive, serviceActionsFor, type ServiceAction, type ServiceState } from "./format";
import NqServerAdminConfirm from "./NqServerAdminConfirm.vue";
import { useServerAdminLabels, type ServerAdminLabels } from "./strings";
import type { ConfirmRequest, ServerAdminResult, ServiceUnit } from "./types";
import { useRunner } from "./use-runner";

// The systemd units of one server: state, whether they start at boot, memory and uptime, with start, stop, restart, reload and
// enable or disable in the row menu (also from the context menu). Stopping, restarting and disabling ask first.
const props = withDefaults(
  defineProps<{
    services: readonly ServiceUnit[];
    /** Run an action. Resolve, or resolve `{ error }` to show it. The host then passes the updated `services`. */
    onAction: (id: string, action: ServiceAction) => Promise<ServerAdminResult>;
    /** Adds View logs to the row menu. */
    onViewLogs?: (id: string) => void;
    loading?: boolean;
    /** Replaces the rows with an error state. */
    error?: string;
    onRetry?: () => void;
    labels?: Partial<ServerAdminLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { loading: false, onViewLogs: undefined, error: undefined, onRetry: undefined, labels: undefined },
);

const t = useServerAdminLabels(() => props.labels);
const runner = useRunner(() => t.value.genericError);
const confirm = ref<ConfirmRequest | null>(null);

const stateTone: Record<ServiceState, StatusTone> = { active: "success", inactive: "neutral", failed: "danger", activating: "info", deactivating: "info", reloading: "info" };
const actionIcon = { start: CirclePlay, stop: CircleStop, restart: ListRestart, reload: RotateCw, enable: Power, disable: Ban } as const;
const dash = () => h("span", { class: "text-muted-foreground" }, "—");

const columns = computed<DataTableColumn<ServiceUnit>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "service",
      header: tt.service,
      label: tt.service,
      hideable: false,
      sortValue: (s) => s.name,
      searchValue: (s) => `${s.name} ${s.description ?? ""}`,
      cell: (s) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "truncate text-start font-mono text-code text-foreground" }, s.name),
          s.description ? h("span", { dir: "auto", class: "truncate text-caption text-muted-foreground" }, s.description) : null,
        ]),
    },
    {
      id: "state",
      header: tt.state,
      label: tt.state,
      sortValue: (s) => s.state,
      filterValue: (s) => s.state,
      cell: (s) =>
        runner.busy.value.has(s.id)
          ? h("span", { class: "inline-flex items-center gap-1.5 text-body-sm text-muted-foreground" }, [h(NqSpinner), ` ${tt.working}`])
          : h(NqStatus, { tone: stateTone[s.state] }, () => tt.states[s.state]),
    },
    {
      id: "boot",
      header: tt.boot,
      label: tt.boot,
      sortValue: (s) => (s.enabled ? 1 : 0),
      cell: (s) => h(NqBadge, { variant: s.enabled ? "neutral" : "outline" }, () => (s.enabled ? tt.enabledAtBoot : tt.disabledAtBoot)),
    },
    {
      id: "memory",
      header: tt.memory,
      label: tt.memory,
      align: "end",
      sortValue: (s) => s.memoryBytes ?? -1,
      cell: (s) => (s.memoryBytes === undefined ? dash() : h("bdi", { dir: "ltr", class: "tabular-nums" }, formatBytes(s.memoryBytes))),
    },
    {
      id: "since",
      header: tt.since,
      label: tt.since,
      sortValue: (s) => (s.since === undefined ? null : new Date(s.since)),
      cell: (s) => (s.since === undefined ? dash() : h(NqDateTime, { value: s.since, relative: true, class: "text-muted-foreground" })),
    },
  ];
});

const table = useDataTable<ServiceUnit>({ data: () => [...props.services], columns, getRowId: (s) => s.id, defaultSort: { id: "service", direction: "asc" }, pageSize: 10 });

function perform(unit: ServiceUnit, action: ServiceAction) {
  const start = () => runner.run([unit.id], () => props.onAction(unit.id, action));
  if (!isDisruptive(action)) return void start();
  const label = t.value.actions[action];
  confirm.value = {
    title: t.value.confirmAction(label, unit.name),
    body: action === "stop" ? t.value.confirmStop : action === "restart" ? t.value.confirmRestart : t.value.confirmDisable,
    confirm: label,
    danger: action !== "restart",
    run: start,
  };
}

function rowActions(unit: ServiceUnit): DataTableRowAction[] {
  const locked = runner.busy.value.has(unit.id);
  const list: DataTableRowAction[] = serviceActionsFor(unit).map((action) => ({
    id: action,
    label: t.value.actions[action],
    icon: actionIcon[action],
    disabled: locked,
    danger: action === "stop",
    group: action === "enable" || action === "disable" ? "boot" : "run",
    onSelect: () => perform(unit, action),
  }));
  if (props.onViewLogs) list.push({ id: "logs", label: t.value.viewLogs, icon: ServerCog, group: "inspect", onSelect: () => props.onViewLogs?.(unit.id) });
  return list;
}
</script>

<template>
  <NqCard data-slot="service-units" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2">{{ t.servicesTitle }}</NqCardTitle>
      <NqCardDescription>{{ t.servicesDescription }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="runner.error.value" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="runner.error.value = null">{{ runner.error.value }}</NqAlert>
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.search" />
        <NqDataTableFacetFilter :table="table" column="state" :title="t.state" :options="(Object.keys(t.states) as ServiceState[]).map((s) => ({ value: s, label: t.states[s] }))" />
      </NqDataTableToolbar>
      <NqDataTable
        :table="table"
        :label="t.servicesTable"
        :row-label="(s: ServiceUnit) => s.name"
        :loading="props.loading"
        :error="props.error"
        :on-retry="props.onRetry"
        :row-actions="rowActions"
      >
        <template #empty>
          <NqEmptyState :icon="ServerCog" :title="t.servicesEmpty" />
        </template>
      </NqDataTable>
      <NqDataTablePagination :table="table" />
    </NqCardContent>
    <NqServerAdminConfirm :request="confirm" :cancel="t.cancel" @close="confirm = null" />
  </NqCard>
</template>
