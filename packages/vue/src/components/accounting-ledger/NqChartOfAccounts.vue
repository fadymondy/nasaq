<script setup lang="ts">
import { Archive, ChevronDown, FolderPlus, ListTree } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqLineItemActionsMenu } from "../line-item-editor";
import { NqEmptyState } from "../states";
import { accountingBalances, accountingTree, type AccountingAccount, type AccountingAccountType, type AccountingEntry } from "./accounting-math";
import NqAccountingFigure from "./NqAccountingFigure.vue";
import { useAccountingLedgerStrings, type AccountingLedgerLabels } from "./strings";

// The account tree: code, name, type and balance per row, groups that collapse, and a row menu that mirrors the context menu.
interface Props {
  accounts: readonly AccountingAccount[];
  /** Posted entries give each row its balance, and a group the sum of its branch. */
  entries?: readonly AccountingEntry[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  selectedId?: string | null;
  /** Open the statement of this account. */
  onSelectAccount?: (account: AccountingAccount) => void;
  /** Adds the "Add sub-account" action. */
  onAddChild?: (parent: AccountingAccount) => void;
  /** Adds archive and restore. */
  onArchiveChange?: (account: AccountingAccount, archived: boolean) => void;
  labels?: AccountingLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  entries: () => [],
  currency: undefined,
  selectedId: undefined,
  onSelectAccount: undefined,
  onAddChild: undefined,
  onArchiveChange: undefined,
  labels: undefined,
});
const currency = useCurrency(() => props.currency);
const { t } = useAccountingLedgerStrings(() => props.labels);
const collapsed = ref<ReadonlySet<string>>(new Set());
const tree = computed(() => accountingTree(props.accounts));
const balances = computed(() => accountingBalances(props.accounts, props.entries, { rollup: true }));
const byId = computed(() => new Map(props.accounts.map((a) => [a.id, a])));

const TYPE_VARIANT: Record<AccountingAccountType, "info" | "warning" | "neutral" | "success" | "danger"> = {
  asset: "info",
  liability: "warning",
  equity: "neutral",
  revenue: "success",
  expense: "danger",
};
const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";

function hidden(a: AccountingAccount): boolean {
  let p = a.parentId ? byId.value.get(a.parentId) : undefined;
  const seen = new Set<string>();
  while (p && !seen.has(p.id)) {
    if (collapsed.value.has(p.id)) return true;
    seen.add(p.id);
    p = p.parentId ? byId.value.get(p.parentId) : undefined;
  }
  return false;
}
function toggle(id: string) {
  const n = new Set(collapsed.value);
  if (n.has(id)) n.delete(id);
  else n.add(id);
  collapsed.value = n;
}
function actionsFor(a: AccountingAccount): ContextMenuAction[] {
  return [
    ...(props.onSelectAccount ? [{ id: "statement", label: t.value.viewStatement, icon: ListTree, onSelect: () => props.onSelectAccount?.(a), group: "open" }] : []),
    ...(props.onAddChild ? [{ id: "child", label: t.value.addChild, icon: FolderPlus, onSelect: () => props.onAddChild?.(a), group: "open" }] : []),
    ...(props.onArchiveChange ? [{ id: "archive", label: a.archived ? t.value.restore : t.value.archive, icon: Archive, danger: !a.archived, onSelect: () => props.onArchiveChange?.(a, !a.archived), group: "danger" }] : []),
  ];
}
</script>

<template>
  <NqEmptyState v-if="props.accounts.length === 0" :icon="ListTree" :title="t.noAccounts" :description="t.noAccountsText" :class="props.class" />
  <div v-else data-slot="chart-of-accounts" :class="cn('relative w-full overflow-x-auto rounded-card border border-border bg-card', props.class)">
    <table class="w-full min-w-[32rem] border-collapse">
      <caption class="sr-only">{{ t.chart }}</caption>
      <thead class="border-b border-border">
        <tr>
          <th scope="col" :class="th">{{ t.account }}</th>
          <th scope="col" :class="cn(th, 'w-28')">{{ t.type }}</th>
          <th scope="col" dir="ltr" :class="cn(thNum, 'w-36')">{{ t.balance }}</th>
          <th scope="col" class="w-10"><span class="sr-only">{{ t.rowActions }}</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <template v-for="{ account: a, depth, hasChildren } in tree" :key="a.id">
          <NqContextMenuActions
            v-if="!hidden(a)"
            as="tr"
            :actions="actionsFor(a)"
            :class="cn(props.selectedId === a.id && 'bg-nq-hover', a.archived && 'opacity-60')"
          >
            <td :class="td">
              <div class="flex items-center gap-2" :style="{ paddingInlineStart: `${depth * 1.25}rem` }">
                <NqButton
                  v-if="hasChildren"
                  variant="ghost"
                  size="icon-sm"
                  :aria-expanded="!collapsed.has(a.id)"
                  :aria-label="`${collapsed.has(a.id) ? t.expand : t.collapse}, ${a.name}`"
                  @click="toggle(a.id)"
                >
                  <ChevronDown aria-hidden="true" :class="cn('transition-transform', collapsed.has(a.id) && '-rotate-90 rtl:rotate-90')" />
                </NqButton>
                <span v-else aria-hidden="true" class="size-control-sm shrink-0" />
                <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ a.code }}</bdi>
                <button v-if="props.onSelectAccount" type="button" :class="cn('min-w-0 truncate text-start hover:underline', hasChildren && 'font-medium')" @click="props.onSelectAccount(a)">{{ a.name }}</button>
                <span v-else :class="cn('min-w-0 truncate', hasChildren && 'font-medium')">{{ a.name }}</span>
                <NqBadge v-if="a.archived" variant="outline">{{ t.archived }}</NqBadge>
              </div>
            </td>
            <td :class="td"><NqBadge :variant="TYPE_VARIANT[a.type]">{{ t[a.type] }}</NqBadge></td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="balances.get(a.id)?.balance ?? 0" :currency="currency" /></td>
            <td class="px-1"><NqLineItemActionsMenu :actions="actionsFor(a)" :label="`${t.rowActions}, ${a.name}`" /></td>
          </NqContextMenuActions>
        </template>
      </tbody>
    </table>
  </div>
</template>
