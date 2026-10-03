<script setup lang="ts">
import { ArrowDown, ArrowUp, Pencil, Plus, RotateCcw, Trash2 } from "lucide-vue-next";
import { computed, h, ref } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDataTable, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import NqApplyBar from "./NqApplyBar.vue";
import NqFirewallDialog from "./NqFirewallDialog.vue";
import { formatProtocolPort, lockoutRisk, rulesToApply, type FirewallRule, type RuleState } from "./format";
import { useStagedRules } from "./staged";
import type { NetworkRulesResult, NetworkStrings } from "./strings";

// The firewall tab: ordered allow / deny rules, staged edits, the lockout warning and the apply bar. Internal.
const props = defineProps<{ applied: readonly FirewallRule[]; onApply: (rules: FirewallRule[]) => Promise<NetworkRulesResult>; loading: boolean; t: NetworkStrings }>();

type Row = { id: string; rule: FirewallRule; state: RuleState; index: number };

const s = useStagedRules<FirewallRule>(() => props.applied);
const editing = ref<FirewallRule | null>(null);
const open = ref(false);
const applying = ref(false);
const message = ref<{ tone: "danger" | "success"; text: string } | null>(null);

const rows = computed<Row[]>(() => s.staged.value.map((rule, index) => ({ id: rule.id, rule, index, state: s.diff.value.states.get(rule.id) ?? "added" })));
const risk = computed(() => lockoutRisk(rulesToApply(s.staged.value, s.removed.value)));

const strike = (state: RuleState) => (state === "removed" ? "line-through opacity-60" : undefined);
const stateBadge = (r: Row) => (r.state === "unchanged" ? null : h(NqBadge, { variant: r.state === "removed" ? "danger" : r.state === "added" ? "success" : "info" }, () => props.t.states[r.state]));

const columns = computed<DataTableColumn<Row>[]>(() => {
  const t = props.t;
  return [
    { id: "order", header: t.cols.order, cell: (r) => h("bdi", { class: cn("tabular-nums text-muted-foreground", strike(r.state)) }, String(r.index + 1)), className: "w-10" },
    {
      id: "action",
      header: t.cols.action,
      label: t.cols.action,
      cell: (r) => h(NqBadge, { variant: r.rule.action === "allow" ? "success" : "danger", class: strike(r.state) }, () => (r.rule.action === "allow" ? t.allow : t.deny)),
    },
    { id: "protocol", header: t.cols.protocol, label: t.cols.protocol, cell: (r) => h("bdi", { dir: "ltr", class: cn("font-mono text-body-sm", strike(r.state)) }, formatProtocolPort(r.rule)), searchValue: (r) => formatProtocolPort(r.rule) },
    { id: "source", header: t.cols.source, label: t.cols.source, cell: (r) => h("bdi", { dir: "ltr", class: cn("font-mono text-body-sm", strike(r.state)) }, r.rule.source === "any" ? t.anySource : r.rule.source), searchValue: (r) => r.rule.source },
    { id: "note", header: t.cols.note, label: t.cols.note, cell: (r) => h("span", { dir: "auto", class: cn("text-muted-foreground", strike(r.state)) }, r.rule.note), searchValue: (r) => r.rule.note ?? "", className: "max-sm:hidden", headerClassName: "max-sm:hidden" },
    { id: "state", header: t.cols.state, label: t.cols.state, cell: stateBadge },
  ];
});
const table = useDataTable({ data: () => rows.value, columns, getRowId: (r) => r.id });
const nameOf = (r: Row) => `${r.rule.action === "allow" ? props.t.allow : props.t.deny} ${formatProtocolPort(r.rule)} ${r.rule.source}`;

function actions(r: Row): DataTableRowAction[] {
  const t = props.t;
  if (r.state === "removed") return [{ id: "restore", label: t.restore, icon: RotateCcw, onSelect: () => s.restore(r.id) }];
  return [
    { id: "edit", label: t.edit, icon: Pencil, group: "edit", onSelect: () => openEdit(r.rule) },
    { id: "up", label: t.moveUp, icon: ArrowUp, group: "order", disabled: r.index === 0, onSelect: () => s.move(r.id, -1) },
    { id: "down", label: t.moveDown, icon: ArrowDown, group: "order", disabled: r.index === rows.value.length - 1, onSelect: () => s.move(r.id, 1) },
    { id: "remove", label: t.remove, icon: Trash2, group: "danger", danger: true, onSelect: () => s.remove(r.id) },
  ];
}

function openEdit(rule: FirewallRule | null) {
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
      <p class="min-w-0 flex-1 text-body-sm text-muted-foreground">{{ props.t.firewallBody }}</p>
      <NqButton type="button" size="sm" variant="secondary" @click="openEdit(null)">
        <Plus aria-hidden="true" />
        {{ props.t.addRule }}
      </NqButton>
    </div>
    <NqAlert v-if="risk" tone="warning">{{ props.t.lockout }}</NqAlert>
    <NqAlert v-if="message" :tone="message.tone" dismissible @dismiss="message = null">{{ message.text }}</NqAlert>
    <NqDataTable :table="table" :label="props.t.tableFirewall" :row-label="nameOf" :row-actions="actions" :loading="props.loading" :labels="{ empty: props.t.emptyFirewall }" />
    <NqApplyBar :count="s.diff.value.count" :applying="applying" :t="props.t" :warning="risk ? props.t.lockout : null" @apply="apply" @discard="s.discard" />
    <NqFirewallDialog v-model:open="open" :rule="editing" :t="props.t" @save="s.upsert" />
  </div>
</template>
