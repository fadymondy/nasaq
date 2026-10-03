<script setup lang="ts">
import { Activity, CirclePause, Pencil, Play, Plus, RefreshCw, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import {
  NqAlertDialog,
  NqAlertDialogAction,
  NqAlertDialogCancel,
  NqAlertDialogContent,
  NqAlertDialogDescription,
  NqAlertDialogFooter,
  NqAlertDialogHeader,
  NqAlertDialogTitle,
} from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqDataTable, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDateTime, NqNum } from "../numeric";
import { NqStatus, type StatusTone } from "../status";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import NqIncidentList from "./NqIncidentList.vue";
import NqMonitorDialog from "./NqMonitorDialog.vue";
import NqUptimeBadge from "./NqUptimeBadge.vue";
import NqUptimeBar from "./NqUptimeBar.vue";
import { formatUptime, isOpenIncident, overallStatus, responseLabel, UPTIME_PERIODS, type MonitorStatus, type UptimePeriod } from "./format";
import { useUptimeStrings, type UptimeMonitorsLabels } from "./strings";
import type { Incident, MonitorInput, UptimeMonitor, UptimeResult } from "./types";

// The admin side of uptime: a table of monitors with status, a recent-checks strip, an uptime badge for 24 hours,
// 7 days or 30 days (switch the period above the table), response time and last check, plus the incidents they
// raised. Check now, pause, resume, edit and delete are row actions and also open on context-click.
// Presentational: your callbacks act and you pass the updated `monitors` back.
const props = withDefaults(
  defineProps<{
    monitors: readonly UptimeMonitor[];
    incidents?: readonly Incident[];
    loading?: boolean;
    /** Which period the uptime badge shows first. Default "30d". */
    defaultPeriod?: UptimePeriod;
    /** Create (no `id`) or edit a monitor. Shows Add monitor and Edit when set. */
    onSave?: (input: MonitorInput, id?: string) => Promise<UptimeResult>;
    onDelete?: (id: string) => Promise<UptimeResult>;
    onPause?: (id: string) => Promise<UptimeResult>;
    onResume?: (id: string) => Promise<UptimeResult>;
    onCheckNow?: (id: string) => Promise<UptimeResult>;
    labels?: UptimeMonitorsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { incidents: () => [], loading: false, defaultPeriod: "30d", onSave: undefined, onDelete: undefined, onPause: undefined, onResume: undefined, onCheckNow: undefined, labels: undefined },
);

const monitorTone: Record<MonitorStatus, StatusTone> = { up: "success", degraded: "warning", down: "danger", paused: "neutral", unknown: "neutral" };

const t = useUptimeStrings(() => props.labels);
const period = ref<UptimePeriod>(props.defaultPeriod);
const editing = ref<UptimeMonitor | null>(null);
const open = ref(false);
const deleting = ref<UptimeMonitor | null>(null);
const notice = ref<string | null>(null);

async function run(fn: () => Promise<UptimeResult>) {
  notice.value = null;
  try {
    const result = await fn();
    if (result && result.error) notice.value = result.error;
  } catch {
    notice.value = t.value.genericError;
  }
}

const columns = computed<DataTableColumn<UptimeMonitor>[]>(() => {
  const tt = t.value;
  const p = period.value;
  return [
    {
      id: "monitor",
      header: tt.cols.monitor,
      label: tt.cols.monitor,
      sortValue: (m) => m.name,
      searchValue: (m) => `${m.name} ${m.target}`,
      cell: (m) =>
        h("span", { class: "grid min-w-0 gap-0.5" }, [
          h("span", { class: "truncate text-label text-foreground", dir: "auto" }, m.name),
          h("bdi", { dir: "ltr", class: "truncate font-mono text-caption text-muted-foreground" }, m.target),
        ]),
    },
    {
      id: "status",
      header: tt.cols.status,
      label: tt.cols.status,
      sortValue: (m) => m.status,
      filterValue: (m) => m.status,
      cell: (m) => h(NqStatus, { tone: monitorTone[m.status] }, () => tt.status[m.status]),
    },
    {
      id: "history",
      header: tt.cols.history,
      label: tt.cols.history,
      cell: (m) =>
        m.checks?.length
          ? h(NqUptimeBar, {
              checks: m.checks,
              labels: props.labels,
              label: tt.historyFor(m.name, m.checks.filter((c) => c !== "none" && c !== "down").length, m.checks.filter((c) => c !== "none").length),
              class: "w-40",
            })
          : null,
      className: "max-md:hidden",
      headerClassName: "max-md:hidden",
    },
    {
      id: "uptime",
      header: `${tt.cols.uptime} (${tt.periodShort[p]})`,
      label: tt.cols.uptime,
      sortValue: (m) => m.uptime[p] ?? -1,
      cell: (m) => h(NqUptimeBadge, { percent: m.uptime[p], "aria-label": tt.uptimeFor(formatUptime(m.uptime[p]), tt.periods[p]) }),
    },
    {
      id: "response",
      header: tt.cols.response,
      label: tt.cols.response,
      sortValue: (m) => m.responseMs,
      cell: (m) => h("bdi", { dir: "ltr", class: "tabular-nums text-body-sm text-muted-foreground" }, responseLabel(m.responseMs)),
      align: "end",
      className: "max-lg:hidden",
      headerClassName: "max-lg:hidden",
    },
    {
      id: "checked",
      header: tt.cols.checked,
      label: tt.cols.checked,
      sortValue: (m) => (m.lastCheckAt ? new Date(m.lastCheckAt) : null),
      cell: (m) => (m.lastCheckAt ? h(NqDateTime, { value: m.lastCheckAt, relative: true, class: "text-muted-foreground" }) : null),
      className: "max-lg:hidden",
      headerClassName: "max-lg:hidden",
    },
  ];
});
const table = useDataTable({ data: () => [...props.monitors], columns, getRowId: (m) => m.id });

function actions(m: UptimeMonitor): DataTableRowAction[] {
  const paused = m.status === "paused";
  return [
    ...(props.onCheckNow ? [{ id: "check", label: t.value.checkNow, icon: RefreshCw, group: "run", disabled: paused, onSelect: () => void run(() => props.onCheckNow!(m.id)) }] : []),
    ...(paused && props.onResume ? [{ id: "resume", label: t.value.resume, icon: Play, group: "run", onSelect: () => void run(() => props.onResume!(m.id)) }] : []),
    ...(!paused && props.onPause ? [{ id: "pause", label: t.value.pause, icon: CirclePause, group: "run", onSelect: () => void run(() => props.onPause!(m.id)) }] : []),
    ...(props.onSave
      ? [
          {
            id: "edit",
            label: t.value.edit,
            icon: Pencil,
            group: "edit",
            onSelect: () => {
              editing.value = m;
              open.value = true;
            },
          },
        ]
      : []),
    ...(props.onDelete ? [{ id: "delete", label: t.value.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => (deleting.value = m) }] : []),
  ];
}

function openAdd() {
  editing.value = null;
  open.value = true;
}

function confirmDelete() {
  if (!deleting.value) return;
  const id = deleting.value.id;
  deleting.value = null;
  if (props.onDelete) void run(() => props.onDelete!(id));
}

const openCount = computed(() => props.incidents.filter(isOpenIncident).length);
const overall = computed(() =>
  overallStatus(
    props.monitors.map((m) => m.status),
    false,
  ),
);
const overallVariant = computed(() => (overall.value === "operational" ? "success" : overall.value === "degraded" || overall.value === "partial-outage" ? "warning" : overall.value === "maintenance" ? "info" : "danger"));
</script>

<template>
  <NqCard data-slot="uptime-monitors" :class="cn('w-full', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h3" class="flex items-center gap-2">
          <Activity aria-hidden="true" class="size-4 text-muted-foreground" />
          {{ t.title }}
        </NqCardTitle>
        <NqBadge :variant="overallVariant">{{ t.overall[overall] }}</NqBadge>
      </div>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent class="grid gap-5">
      <NqDataTableToolbar class="justify-between">
        <div class="flex flex-wrap items-center gap-2">
          <NqDataTableSearch :table="table" :placeholder="t.search" />
          <NqToggleGroup :aria-label="t.period" :model-value="[period]" @update:model-value="(v: string[]) => v[0] && (period = v[0] as UptimePeriod)">
            <NqToggle v-for="p in UPTIME_PERIODS" :key="p" :value="p" :aria-label="t.periods[p]">
              <bdi>{{ t.periodShort[p] }}</bdi>
            </NqToggle>
          </NqToggleGroup>
        </div>
        <NqButton v-if="props.onSave" type="button" variant="primary" size="sm" @click="openAdd">
          <Plus aria-hidden="true" />
          {{ t.add }}
        </NqButton>
      </NqDataTableToolbar>
      <NqAlert v-if="notice" tone="danger" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>
      <NqDataTable :table="table" :label="t.table" :row-label="(m: UptimeMonitor) => m.name" :row-actions="actions" :loading="props.loading" :labels="{ empty: t.empty }" />
      <section v-if="props.incidents.length || !props.loading" aria-labelledby="uptime-incidents" class="grid gap-3">
        <h4 id="uptime-incidents" class="flex items-center gap-2 text-label text-foreground">
          {{ t.incidents }}
          <NqBadge v-if="openCount" variant="warning"><NqNum :value="openCount" /> {{ t.open }}</NqBadge>
        </h4>
        <NqIncidentList :incidents="props.incidents" :labels="props.labels" />
      </section>
    </NqCardContent>
    <NqMonitorDialog v-if="props.onSave" v-model:open="open" :monitor="editing" :on-save="props.onSave" :t="t" />
    <NqAlertDialog :open="deleting !== null" @update:open="(o: boolean) => !o && (deleting = null)">
      <NqAlertDialogContent>
        <template v-if="deleting">
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ t.deleteTitle(deleting.name) }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ t.deleteBody }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction @click="confirmDelete">{{ t.remove }}</NqAlertDialogAction>
          </NqAlertDialogFooter>
        </template>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </NqCard>
</template>
