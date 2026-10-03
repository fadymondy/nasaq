<script setup lang="ts">
import { ArrowRight, Pencil, Plus, Trash2 } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { NqDomainChips } from "../domains-manager";
import { NqStatus, type StatusTone } from "../status";
import { NqSwitch } from "../switch";
import NqProxyHostDialog from "./NqProxyHostDialog.vue";
import { PROXY_STRINGS, type ProxyHost, type ProxyHostInput, type ProxyHostsLabels, type ProxyHostsResult, type ProxyHostsStrings } from "./strings";

// Reverse-proxy hosts: a table of domains and where they forward to, with the TLS mode, WebSocket support and an
// enable switch, and a dialog editor (domains, upstream, TLS mode, WebSockets). Row actions open on context-click too.
// Presentational: your callbacks talk to the proxy and you pass the updated `hosts` back.
const props = withDefaults(
  defineProps<{
    hosts: readonly ProxyHost[];
    loading?: boolean;
    /** Create (no `id`) or update a host. Resolve `{ error }` to show it in the dialog. */
    onSave: (input: ProxyHostInput, id?: string) => Promise<ProxyHostsResult>;
    onDelete: (id: string) => Promise<ProxyHostsResult>;
    /** Flip the switch in the table. Shows the Enabled column when set. */
    onToggle?: (id: string, enabled: boolean) => Promise<ProxyHostsResult>;
    labels?: ProxyHostsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { loading: false },
);

const STATUS_TONE = { online: "success", offline: "danger", unknown: "neutral" } as const satisfies Record<string, StatusTone>;

const nq = useNasaq();
const t = computed<ProxyHostsStrings>(() => ({ ...PROXY_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));

const dialogTarget = ref<ProxyHost | "new" | null>(null);
const deleting = ref<ProxyHost | null>(null);
const heldDeleting = ref<ProxyHost | null>(null);
const notice = ref<string | null>(null);
const flipping = ref<ReadonlySet<string>>(new Set());

async function toggle(host: ProxyHost, next: boolean) {
  if (!props.onToggle) return;
  notice.value = null;
  flipping.value = new Set(flipping.value).add(host.id);
  try {
    const result = await props.onToggle(host.id, next);
    if (result && result.error) notice.value = result.error;
  } catch {
    notice.value = t.value.genericError;
  } finally {
    const rest = new Set(flipping.value);
    rest.delete(host.id);
    flipping.value = rest;
  }
}

async function confirmDelete() {
  const target = deleting.value ?? heldDeleting.value;
  if (!target) return;
  deleting.value = null;
  try {
    const result = await props.onDelete(target.id);
    if (result && result.error) notice.value = result.error;
  } catch {
    notice.value = t.value.genericError;
  }
}

const columns = computed<DataTableColumn<ProxyHost>[]>(() => {
  const s = t.value;
  return [
    {
      id: "hosts",
      header: s.cols.hosts,
      label: s.cols.hosts,
      sortValue: (h) => h.hosts[0],
      searchValue: (h) => `${h.hosts.join(" ")} ${h.upstream}`,
      cell: (r) =>
        h(NqDomainChips, {
          domains: r.hosts.map((host) => ({ id: host, host, check: "verified" as const })),
          max: 2,
          class: "[&_[data-slot=badge]]:border-border [&_[data-slot=badge]]:bg-secondary [&_[data-slot=badge]]:text-foreground",
        }),
    },
    {
      id: "upstream",
      header: s.cols.upstream,
      label: s.cols.upstream,
      sortValue: (r) => r.upstream,
      cell: (r) =>
        h("span", { class: "inline-flex items-center gap-1.5" }, [
          h(ArrowRight, { "aria-hidden": "true", class: "size-3.5 shrink-0 text-muted-foreground rtl:rotate-180" }),
          h("bdi", { dir: "ltr", class: "font-mono text-body-sm" }, r.upstream),
        ]),
    },
    {
      id: "tls",
      header: s.cols.tls,
      label: s.cols.tls,
      sortValue: (r) => r.tlsMode,
      filterValue: (r) => r.tlsMode,
      cell: (r) => h(NqBadge, { variant: r.tlsMode === "off" ? "warning" : "outline" }, () => s.tlsShort[r.tlsMode]),
      className: "max-md:hidden",
      headerClassName: "max-md:hidden",
    },
    {
      id: "ws",
      header: s.cols.websockets,
      label: s.cols.websockets,
      cell: (r) => h("span", { class: "text-body-sm text-muted-foreground" }, r.websockets ? s.on : s.off),
      className: "max-lg:hidden",
      headerClassName: "max-lg:hidden",
    },
    {
      id: "status",
      header: s.cols.status,
      label: s.cols.status,
      sortValue: (r) => r.status ?? "unknown",
      cell: (r) => h(NqStatus, { tone: STATUS_TONE[r.status ?? "unknown"] }, () => s.states[r.status ?? "unknown"]),
    },
    ...(props.onToggle
      ? ([
          {
            id: "enabled",
            header: s.cols.enabled,
            label: s.cols.enabled,
            align: "end",
            cell: (r) =>
              h(NqSwitch, {
                "aria-label": s.toggleFor(r.hosts[0] ?? ""),
                modelValue: r.enabled,
                disabled: flipping.value.has(r.id),
                "onUpdate:modelValue": (v: boolean) => void toggle(r, v),
              }),
          },
        ] satisfies DataTableColumn<ProxyHost>[])
      : []),
  ];
});

const table = useDataTable({ data: () => [...props.hosts], columns: () => columns.value, getRowId: (r: ProxyHost) => r.id });

const actions = (r: ProxyHost): DataTableRowAction[] => [
  { id: "edit", label: t.value.edit, icon: Pencil, group: "edit", onSelect: () => (dialogTarget.value = r) },
  { id: "delete", label: t.value.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => ((deleting.value = r), (heldDeleting.value = r)) },
];
</script>

<template>
  <div data-slot="proxy-hosts" :class="cn('grid w-full gap-3', props.class)">
    <NqDataTableToolbar class="justify-between">
      <NqDataTableSearch :table="table" :placeholder="t.search" />
      <NqButton type="button" variant="primary" size="sm" @click="dialogTarget = 'new'">
        <Plus aria-hidden="true" />
        {{ t.add }}
      </NqButton>
    </NqDataTableToolbar>
    <NqAlert v-if="notice" tone="danger" dismissible @dismiss="notice = null">{{ notice }}</NqAlert>
    <NqDataTable :table="table" :label="t.table" :row-label="(r: ProxyHost) => r.hosts[0] ?? r.id" :row-actions="actions" :loading="props.loading" :labels="{ empty: t.empty }" />
    <NqProxyHostDialog :target="dialogTarget" :t="t" :on-save="props.onSave" @close="dialogTarget = null" />
    <NqAlertDialog :open="deleting !== null" @update:open="(o: boolean) => !o && (deleting = null)">
      <NqAlertDialogContent>
        <template v-if="deleting">
          <NqAlertDialogHeader>
            <NqAlertDialogTitle>{{ t.deleteTitle(deleting.hosts[0] ?? "") }}</NqAlertDialogTitle>
            <NqAlertDialogDescription>{{ t.deleteBody }}</NqAlertDialogDescription>
          </NqAlertDialogHeader>
          <NqAlertDialogFooter>
            <NqAlertDialogCancel>{{ t.cancel }}</NqAlertDialogCancel>
            <NqAlertDialogAction @click="confirmDelete">{{ t.remove }}</NqAlertDialogAction>
          </NqAlertDialogFooter>
        </template>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
