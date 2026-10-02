<script setup lang="ts">
import { PackageCheck, Power, RefreshCw, ShieldAlert } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import {
  NqDataTable,
  NqDataTableBulkActions,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableColumn,
} from "../data-table";
import { NqDateTime } from "../numeric";
import { NqSpinner } from "../spinner";
import { NqEmptyState } from "../states";
import { formatBytes, kindRank, summarizeUpdates, type PackageKind, type ServerDateLike } from "./format";
import NqServerAdminConfirm from "./NqServerAdminConfirm.vue";
import { useServerAdminLabels, type ServerAdminLabels } from "./strings";
import type { ConfirmRequest, PackageUpdate, ServerAdminResult } from "./types";
import { useRunner } from "./use-runner";

// The updates waiting on a server: counts by type (security first), the download size, a table with the current and new version
// of each package, update selected or update all, a check button, and a banner when the server has to restart.
const props = withDefaults(
  defineProps<{
    packages: readonly PackageUpdate[];
    lastCheckedAt?: ServerDateLike | null;
    /** The server must restart to finish an update. */
    rebootRequired?: boolean;
    /** Names of packages being updated now: they show a spinner and cannot be picked. */
    updating?: readonly string[];
    /** A check for new updates is running. */
    checking?: boolean;
    /** Look for new updates. */
    onCheck: () => Promise<ServerAdminResult>;
    /** Install these packages (the rows chosen, or all of them). */
    onUpdate: (names: string[]) => Promise<ServerAdminResult>;
    /** Restart the server. Shows the button when a restart is required. */
    onReboot?: () => Promise<ServerAdminResult>;
    loading?: boolean;
    labels?: Partial<ServerAdminLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { lastCheckedAt: undefined, rebootRequired: false, updating: () => [], checking: false, onReboot: undefined, loading: false, labels: undefined },
);

const t = useServerAdminLabels(() => props.labels);
const runner = useRunner(() => t.value.genericError);
const confirm = ref<ConfirmRequest | null>(null);
const summary = computed(() => summarizeUpdates(props.packages));
const busyNames = computed(() => new Set(props.updating));
const kindBadge: Record<PackageKind, "danger" | "warning" | "outline"> = { security: "danger", kernel: "warning", regular: "outline" };

const columns = computed<DataTableColumn<PackageUpdate>[]>(() => {
  const tt = t.value;
  return [
    {
      id: "package",
      header: tt.package,
      label: tt.package,
      hideable: false,
      sortValue: (p) => p.name,
      searchValue: (p) => p.name,
      cell: (p) =>
        h("bdi", { dir: "ltr", class: "inline-flex items-center gap-2 font-mono text-code text-foreground" }, [
          p.name,
          busyNames.value.has(p.name) || runner.busy.value.has(p.name) ? h(NqSpinner, { label: tt.updating }) : null,
        ]),
    },
    {
      id: "version",
      header: tt.version,
      label: tt.version,
      cell: (p) => h("bdi", { dir: "ltr", class: "font-mono text-code text-muted-foreground" }, [`${p.currentVersion} → `, h("span", { class: "text-foreground" }, p.newVersion)]),
    },
    {
      id: "kind",
      header: tt.kind,
      label: tt.kind,
      sortValue: (p) => kindRank(p.kind),
      filterValue: (p) => p.kind,
      cell: (p) => h(NqBadge, { variant: kindBadge[p.kind] }, () => tt.kinds[p.kind]),
    },
    {
      id: "size",
      header: tt.size,
      label: tt.size,
      align: "end",
      sortValue: (p) => p.sizeBytes ?? -1,
      cell: (p) => (p.sizeBytes === undefined ? h("span", { class: "text-muted-foreground" }, "—") : h("bdi", { dir: "ltr", class: "tabular-nums" }, formatBytes(p.sizeBytes))),
    },
  ];
});

const table = useDataTable<PackageUpdate>({ data: () => [...props.packages], columns, getRowId: (p) => p.name, selectable: true, defaultSort: { id: "kind", direction: "asc" }, pageSize: 10 });

const install = (names: string[]) => runner.run(names, () => props.onUpdate(names));
const selected = computed(() => table.selectedRows.filter((p) => !busyNames.value.has(p.name)).map((p) => p.name));

function askUpdateAll() {
  confirm.value = {
    title: t.value.updateAllTitle(summary.value.total),
    body: t.value.updateAllBody,
    confirm: t.value.updateAll,
    danger: false,
    run: () => install(props.packages.map((p) => p.name)),
  };
}
function askReboot() {
  confirm.value = { title: t.value.rebootConfirmTitle, body: t.value.rebootConfirmBody, confirm: t.value.reboot, run: () => runner.run(["reboot"], props.onReboot!) };
}
const rowActions = (p: PackageUpdate) => [{ id: "update", label: t.value.updateOne, icon: PackageCheck, disabled: busyNames.value.has(p.name), onSelect: () => void install([p.name]) }];
</script>

<template>
  <NqCard data-slot="package-updates" :class="cn('w-full', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.packagesTitle }}</NqCardTitle>
        <NqCardDescription>{{ t.packagesDescription }}</NqCardDescription>
      </div>
      <NqCardAction class="mt-3 flex flex-wrap gap-2 sm:mt-0">
        <NqButton type="button" variant="secondary" :loading="props.checking || runner.busy.value.has('check')" @click="runner.run(['check'], props.onCheck)">
          <RefreshCw aria-hidden="true" />
          {{ props.checking ? t.checking : t.checkNow }}
        </NqButton>
        <NqButton v-if="summary.total > 0" type="button" variant="primary" @click="askUpdateAll">
          <PackageCheck aria-hidden="true" />
          {{ t.updateAll }}
        </NqButton>
      </NqCardAction>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="props.rebootRequired" tone="warning" :title="t.rebootTitle">
        {{ t.rebootBody }}
        <template v-if="props.onReboot" #action>
          <NqButton type="button" size="sm" variant="secondary" @click="askReboot">
            <Power aria-hidden="true" />
            {{ t.reboot }}
          </NqButton>
        </template>
      </NqAlert>
      <NqAlert v-if="runner.error.value" tone="danger" dismissible :dismiss-label="t.dismiss" @dismiss="runner.error.value = null">{{ runner.error.value }}</NqAlert>
      <div class="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-body-sm text-muted-foreground">
        <span class="text-label text-foreground">{{ t.totalCount(summary.total) }}</span>
        <NqBadge v-if="summary.security > 0" variant="danger">
          <ShieldAlert aria-hidden="true" />
          {{ t.securityCount(summary.security) }}
        </NqBadge>
        <span v-if="summary.downloadBytes > 0">{{ t.download(formatBytes(summary.downloadBytes)) }}</span>
        <span>
          {{ t.lastChecked }}: <NqDateTime v-if="props.lastCheckedAt" :value="props.lastCheckedAt" relative /><template v-else>{{ t.neverChecked }}</template>
        </span>
      </div>
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.search" />
        <NqDataTableFacetFilter :table="table" column="kind" :title="t.kind" :options="(Object.keys(t.kinds) as PackageKind[]).map((k) => ({ value: k, label: t.kinds[k] }))" />
      </NqDataTableToolbar>
      <NqDataTableBulkActions :table="table">
        <NqButton type="button" size="sm" variant="primary" :disabled="selected.length === 0" @click="install(selected)">{{ t.updateSelected }}</NqButton>
      </NqDataTableBulkActions>
      <NqDataTable :table="table" :label="t.packagesTable" :row-label="(p: PackageUpdate) => p.name" :loading="props.loading" :row-actions="rowActions">
        <template #empty>
          <NqEmptyState :icon="PackageCheck" :title="t.upToDate" :description="t.upToDateBody" />
        </template>
      </NqDataTable>
      <NqDataTablePagination :table="table" />
    </NqCardContent>
    <NqServerAdminConfirm :request="confirm" :cancel="t.cancel" @close="confirm = null" />
  </NqCard>
</template>
