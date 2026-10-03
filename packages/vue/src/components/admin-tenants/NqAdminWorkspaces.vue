<script setup lang="ts">
import { ArrowRightLeft, Building2, CirclePause, CirclePlay, ExternalLink } from "lucide-vue-next";
import { computed, h, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { defaultCurrency } from "../../lib/money";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTablePagination, NqDataTableSearch, NqDataTableToolbar, NqDataTableViewOptions, useDataTable, type DataTableColumn } from "../data-table";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldLabel } from "../field";
import { formatNumber, NqDateTime } from "../numeric";
import { NqMeter } from "../progress";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqEmptyState } from "../states";
import { NqStatCard, NqStatGrid } from "../stat-card";
import { NqStatus } from "../status";
import { adminTenantsStrings, type AdminTenantsLabels } from "./strings";
import { adminTenantsAttempt, type AdminPlan, type AdminTenantResult, type AdminWorkspace, type WorkspaceStatus } from "./types";

// The tenants console: every workspace with its owner, plan, seats and status; change a plan, suspend or
// reactivate, or open one. You own the data; actions are async callbacks and you send back new props.
const props = withDefaults(
  defineProps<{
    workspaces: readonly AdminWorkspace[];
    plans: readonly AdminPlan[];
    loading?: boolean;
    error?: string | boolean;
    onRetry?: () => void;
    pageSize?: number;
    onChangePlan?: (workspace: AdminWorkspace, planId: string) => Promise<AdminTenantResult> | AdminTenantResult;
    onSetSuspended?: (workspace: AdminWorkspace, suspended: boolean) => Promise<AdminTenantResult> | AdminTenantResult;
    /** Open the workspace, for example as its owner. */
    onOpen?: (workspace: AdminWorkspace) => void;
    hideStats?: boolean;
    labels?: AdminTenantsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { pageSize: 10, hideStats: false, error: undefined },
);

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...adminTenantsStrings(locale.value), ...props.labels }));

const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
let timer: ReturnType<typeof setTimeout> | undefined;
watch(notice, (v) => {
  clearTimeout(timer);
  if (v) timer = setTimeout(() => (notice.value = null), 6000);
});
onBeforeUnmount(() => clearTimeout(timer));

const changing = ref<AdminWorkspace | null>(null);
const suspending = ref<AdminWorkspace | null>(null);
const busy = ref(false);
const dialogError = ref<string | null>(null);
const nextPlan = ref<string | null>(null);

const planById = computed(() => new Map(props.plans.map((p) => [p.id, p])));
const statusLabel = computed<Record<WorkspaceStatus, string>>(() => ({ active: t.value.statusActive, trial: t.value.statusTrial, suspended: t.value.statusSuspended }));
const n = (v: number) => formatNumber(v, locale.value);

const columns = computed<DataTableColumn<AdminWorkspace>[]>(() => [
  {
    id: "workspace",
    header: t.value.workspace,
    label: t.value.workspace,
    hideable: false,
    sortValue: (w) => w.name,
    searchValue: (w) => `${w.name} ${w.slug} ${w.owner.name} ${w.owner.email}`,
    cell: (w) =>
      h("div", { class: "flex min-w-0 items-center gap-3" }, [
        h("span", { class: "flex size-8 shrink-0 items-center justify-center rounded-control border border-border bg-card text-muted-foreground [&_svg]:size-4" }, h(Building2, { "aria-hidden": "true" })),
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("span", { class: "truncate text-label text-foreground" }, w.name),
          h("bdi", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, w.slug),
        ]),
      ]),
  },
  {
    id: "owner",
    header: t.value.owner,
    label: t.value.owner,
    sortValue: (w) => w.owner.name,
    cell: (w) =>
      h("div", { class: "flex min-w-0 flex-col" }, [
        h("span", { class: "truncate text-body-sm text-foreground" }, w.owner.name),
        h("bdi", { dir: "ltr", class: "truncate text-caption text-muted-foreground" }, w.owner.email),
      ]),
  },
  {
    id: "plan",
    header: t.value.plan,
    label: t.value.plan,
    sortValue: (w) => planById.value.get(w.planId)?.priceMonthly,
    filterValue: (w) => w.planId,
    cell: (w) => h(NqBadge, { variant: "brand" }, () => planById.value.get(w.planId)?.name ?? w.planId),
  },
  {
    id: "seats",
    header: t.value.seats,
    label: t.value.seats,
    sortValue: (w) => w.seatsUsed,
    headerClassName: "w-44",
    cell: (w) => {
      const max = planById.value.get(w.planId)?.seats ?? null;
      return max === null
        ? h("span", { class: "text-body-sm text-muted-foreground" }, t.value.seatsUsed(n(w.seatsUsed)))
        : h(NqMeter, { size: "sm", min: 0, max, value: Math.min(w.seatsUsed, max), label: t.value.seatsOf(n(w.seatsUsed), n(max)), showValue: false });
    },
  },
  {
    id: "status",
    header: t.value.status,
    label: t.value.status,
    sortValue: (w) => w.status,
    filterValue: (w) => w.status,
    cell: (w) =>
      h("div", { class: "flex flex-col" }, [
        h(NqStatus, { tone: w.status === "active" ? "success" : w.status === "trial" ? "info" : "danger" }, () => statusLabel.value[w.status]),
        w.status === "trial" && w.trialEndsAt
          ? h("span", { class: "text-caption text-muted-foreground" }, [`${t.value.trialEnds} `, h(NqDateTime, { value: w.trialEndsAt, format: { dateStyle: "medium" } })])
          : null,
      ]),
  },
  {
    id: "created",
    header: t.value.created,
    label: t.value.created,
    align: "end",
    sortValue: (w) => new Date(w.createdAt),
    cell: (w) => h(NqDateTime, { value: w.createdAt, format: { dateStyle: "medium" }, class: "text-body-sm text-muted-foreground" }),
  },
]);
const table = useDataTable({ data: () => props.workspaces as AdminWorkspace[], columns: () => columns.value, getRowId: (w) => w.id, pageSize: props.pageSize, defaultSort: { id: "created", direction: "desc" } });

const stats = computed(() => {
  const paying = props.workspaces.filter((w) => w.status === "active");
  return {
    total: props.workspaces.length,
    trials: props.workspaces.filter((w) => w.status === "trial").length,
    suspended: props.workspaces.filter((w) => w.status === "suspended").length,
    revenue: paying.reduce((sum, w) => sum + (planById.value.get(w.planId)?.priceMonthly ?? 0), 0),
    currency: props.plans[0]?.currency ?? defaultCurrency(locale.value),
  };
});

function openChange(w: AdminWorkspace) {
  changing.value = w;
  nextPlan.value = w.planId;
  dialogError.value = null;
}
async function doChange() {
  const w = changing.value;
  const plan = nextPlan.value;
  if (!w || !plan) return;
  busy.value = true;
  const failure = await adminTenantsAttempt(() => props.onChangePlan?.(w, plan));
  busy.value = false;
  if (failure === null) {
    notice.value = { tone: "success", text: t.value.planOk(w.name, planById.value.get(plan)?.name ?? plan) };
    changing.value = null;
  } else dialogError.value = failure || t.value.failed;
}
async function doSuspend() {
  const w = suspending.value;
  if (!w) return;
  busy.value = true;
  const failure = await adminTenantsAttempt(() => props.onSetSuspended?.(w, true));
  busy.value = false;
  if (failure === null) {
    notice.value = { tone: "success", text: t.value.suspendOk(w.name) };
    suspending.value = null;
  } else dialogError.value = failure || t.value.failed;
}
async function reactivate(w: AdminWorkspace) {
  const failure = await adminTenantsAttempt(() => props.onSetSuspended?.(w, false));
  notice.value = failure === null ? { tone: "success", text: t.value.reactivateOk(w.name) } : { tone: "danger", text: failure || t.value.failed };
}

const chosen = computed(() => (nextPlan.value ? planById.value.get(nextPlan.value) : undefined));
const overSeats = computed(() => Boolean(chosen.value && changing.value && chosen.value.seats !== null && changing.value.seatsUsed > chosen.value.seats));
const planItems = computed(() => props.plans.map((p) => ({ value: p.id, label: p.name })));
const statusItems = computed(() => [
  { value: "active", label: t.value.statusActive },
  { value: "trial", label: t.value.statusTrial },
  { value: "suspended", label: t.value.statusSuspended },
]);

const rowActions = (w: AdminWorkspace) => [
  ...(props.onOpen ? [{ id: "open", label: t.value.open, icon: ExternalLink, onSelect: () => props.onOpen?.(w), group: "manage" }] : []),
  ...(props.onChangePlan ? [{ id: "plan", label: t.value.changePlan, icon: ArrowRightLeft, onSelect: () => openChange(w), group: "manage" }] : []),
  ...(props.onSetSuspended
    ? [
        w.status === "suspended"
          ? { id: "reactivate", label: t.value.reactivate, icon: CirclePlay, onSelect: () => void reactivate(w), group: "danger" }
          : {
              id: "suspend",
              label: t.value.suspend,
              icon: CirclePause,
              danger: true,
              onSelect: () => {
                suspending.value = w;
                dialogError.value = null;
              },
              group: "danger",
            },
      ]
    : []),
];
const rowLabel = (w: AdminWorkspace) => w.name;
</script>

<template>
  <div data-slot="admin-workspaces" :class="cn('flex flex-col gap-5', props.class)">
    <NqStatGrid v-if="!props.hideStats">
      <NqStatCard :label="t.total" :value="stats.total" :loading="props.loading"><template #icon><Building2 /></template></NqStatCard>
      <NqStatCard :label="t.trials" :value="stats.trials" :loading="props.loading"><template #icon><CirclePlay /></template></NqStatCard>
      <NqStatCard :label="t.suspendedStat" :value="stats.suspended" :loading="props.loading"><template #icon><CirclePause /></template></NqStatCard>
      <NqStatCard :label="t.mrr" :value="stats.revenue" :format="{ style: 'currency', currency: stats.currency, maximumFractionDigits: 0 }" :loading="props.loading" />
    </NqStatGrid>
    <NqAlert v-if="notice" :tone="notice.tone" dismissible :dismiss-label="t.dismiss" @dismiss="notice = null">{{ notice.text }}</NqAlert>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqDataTableFacetFilter :table="table" column="plan" :title="t.plan" :options="planItems" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.status" :options="statusItems" />
      <NqDataTableViewOptions :table="table" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" :label="t.workspaces" :row-label="rowLabel" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :row-actions="rowActions">
      <template #empty><NqEmptyState :icon="Building2" :title="t.empty" /></template>
    </NqDataTable>
    <NqDataTablePagination :table="table" />

    <NqDialog :open="!!changing" @update:open="(open: boolean) => !open && !busy && (changing = null)">
      <NqDialogContent class="max-w-md">
        <NqDialogHeader>
          <NqDialogTitle>{{ changing ? t.changeTitle(changing.name) : "" }}</NqDialogTitle>
          <NqDialogDescription>{{ t.changeBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField>
          <NqFieldLabel>{{ t.newPlan }}</NqFieldLabel>
          <NqSelect :model-value="nextPlan ?? undefined" @update:model-value="(v: string | number | null) => (nextPlan = v ? String(v) : null)">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem v-for="p in planItems" :key="p.value" :value="p.value">{{ p.label }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
          <p v-if="overSeats && chosen?.seats != null && changing" role="alert" class="text-caption text-nq-warning-text">{{ t.overSeats(n(changing.seatsUsed), n(chosen.seats)) }}</p>
        </NqField>
        <NqAlert v-if="dialogError" tone="danger" role="alert">{{ dialogError }}</NqAlert>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="changing = null">{{ t.cancel }}</NqButton>
          <NqButton variant="primary" :loading="busy" :disabled="!nextPlan || nextPlan === changing?.planId" @click="doChange">{{ t.saveChange }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>

    <NqAlertDialog :open="!!suspending" @update:open="(open: boolean) => !open && !busy && (suspending = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ suspending ? t.suspendTitle(suspending.name) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.suspendBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlert v-if="dialogError" tone="danger" role="alert">{{ dialogError }}</NqAlert>
        <NqAlertDialogFooter>
          <NqButton variant="ghost" :disabled="busy" @click="suspending = null">{{ t.cancel }}</NqButton>
          <NqButton variant="danger" :loading="busy" @click="doSuspend">{{ t.suspendConfirm }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
