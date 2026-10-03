<script setup lang="ts">
import { CircleX, Gift, Plus } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqDataTable, NqDataTableFacetFilter, NqDataTableSearch, NqDataTableToolbar, useDataTable, type DataTableColumn, type DataTableRowAction } from "../data-table";
import { formatDate } from "../numeric";
import { NqSheet, NqSheetContent } from "../sheet";
import { NqEmptyState } from "../states";
import { NqStatus } from "../status";
import GiftCardDetail from "./GiftCardDetail.vue";
import GiftCardIssueDialog from "./GiftCardIssueDialog.vue";
import StoreMoney from "./StoreMoney.vue";
import { giftCardBalance, giftCardStatus, initialValue, type GiftCard, type GiftCardStatus } from "./gift-card-logic";
import type { SettingsResult, StoreSettingsLabels } from "./strings";
import { useAction, useSettingsStrings } from "./use-settings";

// Gift cards for the merchant: issue with a generated code (with a check character), see each card's balance and full
// ledger history, redeem an amount, add or remove balance by hand, and disable a card. The balance is never stored, it
// is the sum of the ledger. Money is integer minor units.
const props = withDefaults(
  defineProps<{
    cards: readonly GiftCard[];
    /** ISO 4217 code of the store. New cards are issued in it. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Today. Defaults to the current time. */
    now?: Date;
    /** Saves a newly issued card (its ledger holds the issue entry). Resolve `{ error }` to keep the dialog open. */
    onIssue: (card: GiftCard) => Promise<SettingsResult>;
    /** Saves a card after a redeem, an adjustment or a disable. It arrives with its new ledger entry. */
    onUpdate: (card: GiftCard) => Promise<SettingsResult>;
    /** Who is acting, recorded on ledger entries. */
    actor?: string;
    loading?: boolean;
    error?: string;
    onRetry?: () => void;
    labels?: StoreSettingsLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { currency: undefined, now: undefined, actor: undefined, loading: false, error: undefined, onRetry: undefined, labels: undefined },
);

const STATUSES: GiftCardStatus[] = ["active", "depleted", "expired", "disabled"];
const STATUS_TONE = { active: "success", depleted: "neutral", expired: "warning", disabled: "danger" } as const;

const currency = useCurrency(() => props.currency);
const { t, locale } = useSettingsStrings(() => props.labels);
const today = computed(() => props.now ?? new Date());
const issuing = ref(false);
const openId = ref<string | null>(null);
const action = useAction(() => t.value.saveFailed);
const open = computed(() => props.cards.find((c) => c.id === openId.value) ?? null);
const dateOf = (iso: string) => formatDate(iso, locale.value, { dateStyle: "medium" });

const columns = computed<DataTableColumn<GiftCard>[]>(() => {
  const tt = t.value;
  const st = (c: GiftCard) => giftCardStatus(c, today.value);
  return [
    {
      id: "code",
      header: tt.code,
      label: tt.code,
      cell: (c) =>
        h("div", { class: "flex min-w-0 flex-col" }, [
          h("bdi", { dir: "ltr", class: "truncate font-mono text-body-sm font-medium text-foreground" }, c.code),
          c.recipient?.name ? h("span", { class: "truncate text-caption text-muted-foreground" }, c.recipient.name) : null,
        ]),
      sortValue: (c) => c.code,
      searchValue: (c) => `${c.code} ${c.recipient?.name ?? ""} ${c.recipient?.email ?? ""}`,
    },
    { id: "status", header: tt.statusCol, label: tt.statusCol, cell: (c) => h(NqStatus, { tone: STATUS_TONE[st(c)] }, () => tt.giftStatuses[st(c)]), sortValue: (c) => st(c), filterValue: (c) => st(c) },
    { id: "balance", header: tt.balance, label: tt.balance, align: "end", cell: (c) => h(StoreMoney, { minor: giftCardBalance(c, today.value), currency: c.currency, class: "font-medium" }), sortValue: (c) => giftCardBalance(c, today.value) },
    { id: "issued", header: tt.issuedValue, label: tt.issuedValue, align: "end", defaultHidden: true, cell: (c) => h(StoreMoney, { minor: initialValue(c), currency: c.currency }), sortValue: (c) => initialValue(c) },
    { id: "expires", header: tt.expires, label: tt.expires, cell: (c) => (c.expiresAt ? dateOf(c.expiresAt) : h("span", { class: "text-muted-foreground" }, tt.never)), sortValue: (c) => c.expiresAt ?? "9999" },
  ];
});
const table = useDataTable({ data: () => [...props.cards], columns, getRowId: (c) => c.id, pageSize: 10, defaultSort: { id: "status", direction: "asc" } });
const statusOptions = computed(() => STATUSES.map((s) => ({ value: s, label: t.value.giftStatuses[s] })));

function openCard(c: GiftCard) {
  action.error.value = null;
  openId.value = c.id;
}
function startIssue() {
  action.error.value = null;
  issuing.value = true;
}
function rowActions(c: GiftCard): DataTableRowAction[] {
  const tt = t.value;
  return [
    { id: "open", label: tt.openCard, icon: Gift, onSelect: () => openCard(c) },
    { id: "toggle", label: c.disabled ? tt.enable : tt.disable, group: "state", onSelect: () => void action.run(() => props.onUpdate({ ...c, disabled: !c.disabled })) },
  ];
}
async function issue(card: GiftCard) {
  if (await action.run(() => props.onIssue(card))) issuing.value = false;
}
const update = (c: GiftCard) => action.run(() => props.onUpdate(c));
</script>

<template>
  <section data-slot="gift-cards-manager" :aria-label="t.giftCards" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-h3 text-foreground">{{ t.giftCards }}</h2>
      <NqButton variant="primary" @click="startIssue">
        <Plus aria-hidden="true" />
        {{ t.issueCard }}
      </NqButton>
    </div>
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="t.searchCards" />
      <NqDataTableFacetFilter :table="table" column="status" :title="t.statusCol" :options="statusOptions" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" :label="t.giftCards" :row-label="(c: GiftCard) => c.code" :loading="props.loading" :error="props.error" :on-retry="props.onRetry" :on-row-click="openCard" :row-actions="rowActions">
      <template #empty>
        <NqEmptyState :icon="Gift" :title="t.cardsEmpty" :description="t.cardsEmptyHint" class="border-0">
          <template #actions>
            <NqButton size="sm" @click="issuing = true">{{ t.issueCard }}</NqButton>
          </template>
        </NqEmptyState>
      </template>
    </NqDataTable>
    <p v-if="action.error.value && !issuing && !open" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
      <CircleX aria-hidden="true" class="size-4" />
      {{ action.error.value }}
    </p>

    <GiftCardIssueDialog v-if="issuing" :currency="currency" :now="today" :existing="props.cards.map((c) => c.code)" :actor="props.actor" :busy="action.busy.value" :error="action.error.value" :labels="props.labels" @cancel="issuing = false" @issue="issue" />

    <NqSheet :open="open !== null" @update:open="(o: boolean) => !o && !action.busy.value && (openId = null)">
      <NqSheetContent class="sm:max-w-lg">
        <GiftCardDetail v-if="open" :card="open" :now="today" :actor="props.actor" :busy="action.busy.value" :error="action.error.value" :labels="props.labels" :update="update" />
      </NqSheetContent>
    </NqSheet>
  </section>
</template>
