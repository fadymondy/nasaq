<script setup lang="ts">
import { Globe, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import {
  NqDataTable,
  NqDataTableFacetFilter,
  NqDataTablePagination,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableColumn,
} from "../data-table";
import { NqEmptyState } from "../states";
import { NqSwitch } from "../switch";
import NqDnsRecordDialog from "./NqDnsRecordDialog.vue";
import { DEFAULT_TTLS, DNS_TYPES, fqdn, formatTtl, isProxiable, relativeName } from "./format";
import { DNS_STRINGS, type DnsManagementLabels } from "./strings";
import type { DnsRecord, DnsRecordInput, DnsResult } from "./types";

// A zone's DNS records in a searchable, sortable table (A, AAAA, CNAME, MX, TXT and more) with an add and
// edit form, TTL choices, a proxy switch per record and a confirmed delete. The form checks the value
// against the type (IPv4, IPv6, host name, priority) and against the zone (a CNAME cannot share a name,
// no duplicates). It is presentational: your callbacks talk to the DNS provider and you pass `records` back.
const props = withDefaults(
  defineProps<{
    /** The domain these records belong to, such as `example.com`. */
    zone: string;
    records: readonly DnsRecord[];
    /** Record types offered in the form. Default: A, AAAA, CNAME, MX, TXT, NS, SRV, CAA. */
    types?: readonly string[];
    /** TTL choices in seconds; 1 is Auto. Default: Auto, 1 min, 5 min, 15 min, 1 h, 4 h, 1 day. */
    ttlOptions?: readonly number[];
    /** Hide the proxy column and switch, for zones without a proxy. */
    proxy?: boolean;
    loading?: boolean;
    /** Add or edit a record. Resolve, or resolve `{ error }` to show it in the form. The host then passes the updated `records`. */
    onSave: (input: DnsRecordInput) => Promise<DnsResult>;
    /** Delete a record. Shows Delete in the row menu. */
    onDelete?: (id: string) => Promise<DnsResult>;
    /** Flip the proxy of a record right from the table. */
    onToggleProxy?: (id: string, proxied: boolean) => Promise<DnsResult>;
    /** Override any string. Defaults to English or Arabic by the Nasaq locale. */
    labels?: Partial<DnsManagementLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { types: () => DNS_TYPES, ttlOptions: () => DEFAULT_TTLS, proxy: true, loading: false, onDelete: undefined, onToggleProxy: undefined, labels: undefined },
);

const nasaq = useNasaq();
const t = computed<DnsManagementLabels>(() => ({ ...DNS_STRINGS[nasaq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const formOpen = ref(false);
const editing = ref<DnsRecord | null>(null);
const deleting = ref<DnsRecord | null>(null);
const deletePending = ref(false);
const error = ref<string | null>(null);
const flipping = ref<Record<string, boolean>>({});

async function toggle(record: DnsRecord, next: boolean) {
  if (!props.onToggleProxy) return;
  error.value = null;
  flipping.value = { ...flipping.value, [record.id]: next };
  try {
    const result = await props.onToggleProxy(record.id, next);
    if (result && result.error) error.value = result.error;
  } catch {
    error.value = t.value.genericError;
  } finally {
    const { [record.id]: _gone, ...rest } = flipping.value;
    flipping.value = rest;
  }
}

async function confirmDelete() {
  if (!deleting.value || !props.onDelete) return;
  deletePending.value = true;
  try {
    const result = await props.onDelete(deleting.value.id);
    if (result && result.error) error.value = result.error;
    deleting.value = null;
  } catch {
    error.value = t.value.genericError;
    deleting.value = null;
  } finally {
    deletePending.value = false;
  }
}

const typeTone: Record<string, "info" | "success" | "warning" | "neutral"> = { A: "info", AAAA: "info", CNAME: "success", MX: "warning" };

const columns = computed<DataTableColumn<DnsRecord>[]>(() => {
  const tt = t.value;
  const zone = props.zone;
  const base: DataTableColumn<DnsRecord>[] = [
    {
      id: "type",
      header: tt.type,
      label: tt.type,
      cell: (r) => h(NqBadge, { variant: typeTone[r.type] ?? "neutral" }, () => h("bdi", { dir: "ltr" }, r.type)),
      sortValue: (r) => r.type,
      filterValue: (r) => r.type,
      searchValue: (r) => r.type,
    },
    {
      id: "name",
      header: tt.name,
      label: tt.name,
      cell: (r) => h("span", { dir: "ltr", class: "block max-w-56 truncate text-start font-mono text-code text-foreground", title: fqdn(r.name, zone) }, relativeName(r.name, zone)),
      sortValue: (r) => relativeName(r.name, zone),
      searchValue: (r) => `${r.name} ${fqdn(r.name, zone)} ${r.comment ?? ""}`,
    },
    {
      id: "content",
      header: tt.content,
      label: tt.content,
      cell: (r) =>
        h("span", { dir: "ltr", class: "flex max-w-80 min-w-0 items-center gap-2 text-start font-mono text-code text-muted-foreground" }, [
          r.priority != null ? h(NqBadge, { variant: "outline" }, () => String(r.priority)) : null,
          h("span", { class: "truncate", title: r.content }, r.content),
        ]),
      sortValue: (r) => r.content,
      searchValue: (r) => r.content,
    },
    {
      id: "ttl",
      header: tt.ttl,
      label: tt.ttl,
      cell: (r) => h("span", { class: "whitespace-nowrap tabular-nums" }, formatTtl(r.ttl, tt.ttlUnits)),
      sortValue: (r) => r.ttl,
    },
  ];
  if (!props.proxy) return base;
  base.push({
    id: "proxy",
    header: tt.proxy,
    label: tt.proxy,
    cell: (r) => {
      if (!isProxiable(r.type)) return h("span", { class: "text-muted-foreground" }, "-");
      const on = flipping.value[r.id] ?? Boolean(r.proxied);
      return h("span", { class: "inline-flex items-center gap-2" }, [
        h(NqSwitch, {
          "aria-label": tt.proxyFor(relativeName(r.name, zone)),
          modelValue: on,
          disabled: !props.onToggleProxy || r.id in flipping.value,
          "onUpdate:modelValue": (next: boolean) => void toggle(r, next),
        }),
        h("span", { class: "text-caption text-muted-foreground" }, on ? tt.proxied : tt.dnsOnly),
      ]);
    },
    sortValue: (r) => (isProxiable(r.type) ? Number(Boolean(r.proxied)) : -1),
  });
  return base;
});

const table = useDataTable({ data: () => [...props.records], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "type", direction: "asc" } });
const usedTypes = computed(() => [...new Set(props.records.map((r) => r.type))]);

function openAdd() {
  editing.value = null;
  formOpen.value = true;
}

function actions(r: DnsRecord) {
  return [
    {
      id: "edit",
      label: t.value.edit,
      icon: Pencil,
      onSelect: () => {
        editing.value = r;
        formOpen.value = true;
      },
    },
    ...(props.onDelete ? [{ id: "delete", label: t.value.remove, icon: Trash2, danger: true, group: "danger", onSelect: () => (deleting.value = r) }] : []),
  ];
}
</script>

<template>
  <NqCard data-slot="dns-management" :class="cn('w-full max-w-5xl', props.class)">
    <NqCardHeader class="sm:flex sm:items-start sm:justify-between sm:gap-4">
      <div class="flex flex-col gap-1.5">
        <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
        <NqCardDescription>{{ t.description(props.zone) }}</NqCardDescription>
        <span dir="ltr" class="inline-flex w-fit items-center gap-1.5 font-mono text-code text-foreground">
          <Globe aria-hidden="true" class="size-3.5 text-muted-foreground" />
          {{ props.zone }}
        </span>
      </div>
      <NqButton type="button" variant="primary" class="mt-3 sm:mt-0" @click="openAdd">
        <Plus aria-hidden="true" />
        {{ t.add }}
      </NqButton>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-3">
      <NqAlert v-if="error" tone="danger" dismissible @dismiss="error = null">{{ error }}</NqAlert>
      <NqDataTableToolbar>
        <NqDataTableSearch :table="table" :placeholder="t.search" />
        <NqDataTableFacetFilter :table="table" column="type" :title="t.typeFilter" :options="usedTypes.map((v) => ({ value: v, label: v }))" />
      </NqDataTableToolbar>
      <NqDataTable :table="table" :label="t.table" :row-label="(r: DnsRecord) => `${r.type} ${relativeName(r.name, props.zone)}`" :loading="props.loading" :row-actions="actions">
        <template #empty>
          <NqEmptyState :icon="Globe" :title="t.emptyTitle" :description="t.emptyBody" />
        </template>
      </NqDataTable>
      <NqDataTablePagination :table="table" />
    </NqCardContent>
    <NqDnsRecordDialog
      v-model:open="formOpen"
      :editing="editing"
      :zone="props.zone"
      :records="props.records"
      :types="props.types"
      :ttl-options="props.ttlOptions"
      :proxy="props.proxy"
      :on-save="props.onSave"
      :t="t"
    />
    <NqAlertDialog :open="deleting !== null" @update:open="(open: boolean) => !open && !deletePending && (deleting = null)">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ deleting ? t.deleteTitle(`${deleting.type} ${relativeName(deleting.name, props.zone)}`) : "" }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>{{ t.deleteBody }}</NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel :disabled="deletePending">{{ t.cancel }}</NqAlertDialogCancel>
          <NqButton variant="danger" :loading="deletePending" @click="confirmDelete">{{ t.deleteConfirm }}</NqButton>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </NqCard>
</template>
