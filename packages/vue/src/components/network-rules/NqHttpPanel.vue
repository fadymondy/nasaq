<script setup lang="ts">
import { Pencil, Plus, RotateCcw, Trash2 } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import NqApplyBar from "./NqApplyBar.vue";
import NqHttpDialog from "./NqHttpDialog.vue";
import { rulesToApply, type HttpRule, type RuleState } from "./format";
import { useStagedRules } from "./staged";
import type { NetworkRulesResult, NetworkStrings } from "./strings";

// The HTTP tab: redirects, headers, passwords and IP limits, with staged edits and the apply bar. Internal.
const props = defineProps<{ applied: readonly HttpRule[]; onApply: (rules: HttpRule[]) => Promise<NetworkRulesResult>; loading: boolean; t: NetworkStrings }>();

type Row = { id: string; rule: HttpRule; state: RuleState; index: number };

const s = useStagedRules<HttpRule>(() => props.applied);
const editing = ref<HttpRule | null>(null);
const open = ref(false);
const applying = ref(false);
const message = ref<{ tone: "danger" | "success"; text: string } | null>(null);

const rows = computed<Row[]>(() => s.staged.value.map((rule, index) => ({ id: rule.id, rule, index, state: s.diff.value.states.get(rule.id) ?? "added" })));

const strike = (state: RuleState) => (state === "removed" ? "line-through opacity-60" : undefined);
const stateBadge = (r: Row) => (r.state === "unchanged" ? null : h(NqBadge, { variant: r.state === "removed" ? "danger" : r.state === "added" ? "success" : "info" }, () => props.t.states[r.state]));

function detail(r: HttpRule): string {
  switch (r.type) {
    case "redirect":
      return `${r.status ?? 301} → ${r.target ?? ""}`;
    case "header":
      return `${r.name ?? ""}: ${r.value ?? ""}`;
    case "basic-auth":
      return r.username ?? "";
    default:
      return r.cidr ?? props.t.anySource;
  }
}

const columns = computed<DataTableColumn<Row>[]>(() => {
  const t = props.t;
  return [
    {
      id: "type",
      header: t.cols.type,
      label: t.cols.type,
      cell: (r) => h(NqBadge, { variant: r.rule.type === "ip-deny" ? "danger" : r.rule.type === "ip-allow" ? "success" : "neutral", class: strike(r.state) }, () => t.httpTypes[r.rule.type]),
      sortValue: (r) => r.rule.type,
      filterValue: (r) => r.rule.type,
    },
    { id: "path", header: t.cols.path, label: t.cols.path, cell: (r) => h("bdi", { dir: "ltr", class: cn("font-mono text-body-sm", strike(r.state)) }, r.rule.path), searchValue: (r) => r.rule.path },
    { id: "detail", header: t.cols.detail, label: t.cols.detail, cell: (r) => h("bdi", { dir: "ltr", class: cn("break-all font-mono text-body-sm text-muted-foreground", strike(r.state)) }, detail(r.rule)), searchValue: (r) => detail(r.rule) },
    { id: "state", header: t.cols.state, label: t.cols.state, cell: stateBadge },
  ];
});
const table = useDataTable({ data: () => rows.value, columns, getRowId: (r) => r.id });

function actions(r: Row): DataTableRowAction[] {
  const t = props.t;
  if (r.state === "removed") return [{ id: "restore", label: t.restore, icon: RotateCcw, onSelect: () => s.restore(r.id) }];
  return [
    { id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => openEdit(r.rule) },
    { id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => s.remove(r.id) },
  ];
}

function openEdit(rule: HttpRule | null) {
  editing.value = rule;
  open.value = true;
}

async function apply() {
  applying.value = true;
  message.value = null;
  try {
    const result = await props.onApply(rulesToApply(s.staged.value, s.removed.value));
    message.value = result && result.error ? { tone: "danger", text: result.error } : { tone: "success", text: props.t.applied };
  } catch {
    message.value = { tone: "danger", text: props.t.genericError };
  } finally {
    applying.value = false;
  }
}
</script>

<template>
  <div class="grid gap-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="min-w-0 flex-1 text-body-sm text-muted-foreground">{{ props.t.httpBody }}</p>
      <NqButton type="button" size="sm" variant="secondary" @click="openEdit(null)">
        <Plus aria-hidden="true" />
        {{ props.t.addRule }}
      </NqButton>
    </div>
    <NqAlert v-if="message" :tone="message.tone" dismissible @dismiss="message = null">{{ message.text }}</NqAlert>
    <NqDataTable :table="table" :label="props.t.tableHttp" :row-label="(r: Row) => `${props.t.httpTypes[r.rule.type]} ${r.rule.path}`" :row-actions="actions" :loading="props.loading" :labels="{ empty: props.t.emptyHttp }" />
    <NqApplyBar :count="s.diff.value.count" :applying="applying" :t="props.t" @apply="apply" @discard="s.discard" />
    <NqHttpDialog v-model:open="open" :rule="editing" :t="props.t" @save="s.upsert" />
  </div>
</template>
