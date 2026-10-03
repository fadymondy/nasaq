<script setup lang="ts">
import { Scale } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqLineItemMoney } from "../line-item-editor";
import { NqEmptyState } from "../states";
import { accountingTrialBalance, type AccountingAccount, type AccountingEntry } from "./accounting-math";
import NqAccountingFigure from "./NqAccountingFigure.vue";
import { accountingDate, useAccountingLedgerStrings, type AccountingLedgerLabels } from "./strings";

// Net debit and credit per account with the two totals, and a plain statement of whether they agree.
interface Props {
  accounts: readonly AccountingAccount[];
  entries: readonly AccountingEntry[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** ISO date. Entries after it are left out. */
  asOf?: string;
  includeZero?: boolean;
  onSelectAccount?: (account: AccountingAccount) => void;
  labels?: AccountingLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, asOf: undefined, includeZero: undefined, onSelectAccount: undefined, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, locale } = useAccountingLedgerStrings(() => props.labels);
const tb = computed(() => accountingTrialBalance(props.accounts, props.entries, { asOf: props.asOf, includeZero: props.includeZero }));
const th = "px-3 py-2 text-start text-caption font-medium text-muted-foreground";
const thNum = "px-3 py-2 text-end text-caption font-medium text-muted-foreground";
const td = "px-3 py-2.5 text-body-sm text-foreground";
const tdNum = "px-3 py-2.5 text-end text-body-sm text-foreground tabular-nums";
</script>

<template>
  <NqEmptyState v-if="tb.rows.length === 0" :icon="Scale" :title="t.empty" :description="t.emptyText" :class="props.class" />
  <div v-else data-slot="trial-balance" :class="cn('flex w-full flex-col gap-2', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-2 text-caption text-muted-foreground">
      <span>{{ t.inCurrency }} <bdi dir="ltr">{{ currency }}</bdi></span>
      <span v-if="props.asOf">{{ t.asOf }} <bdi>{{ accountingDate(locale, props.asOf) }}</bdi></span>
    </div>
    <div class="w-full overflow-x-auto rounded-card border border-border bg-card">
      <table class="w-full min-w-[30rem] border-collapse">
        <caption class="sr-only">{{ t.trial }}</caption>
        <thead class="border-b border-border">
          <tr>
            <th scope="col" :class="th">{{ t.account }}</th>
            <th scope="col" dir="ltr" :class="cn(thNum, 'w-36')">{{ t.debit }}</th>
            <th scope="col" dir="ltr" :class="cn(thNum, 'w-36')">{{ t.credit }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-for="{ account: a, debit, credit } in tb.rows" :key="a.id">
            <td :class="td">
              <div class="flex items-center gap-2">
                <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ a.code }}</bdi>
                <button v-if="props.onSelectAccount" type="button" class="min-w-0 truncate text-start hover:underline" @click="props.onSelectAccount(a)">{{ a.name }}</button>
                <span v-else class="min-w-0 truncate">{{ a.name }}</span>
              </div>
            </td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="debit" :currency="currency" blank /></td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="credit" :currency="currency" blank /></td>
          </tr>
        </tbody>
        <tfoot class="border-t border-border">
          <tr>
            <th scope="row" :class="cn(td, 'text-start font-medium')">{{ t.total }}</th>
            <td dir="ltr" :class="cn(tdNum, 'font-medium')"><NqAccountingFigure :minor="tb.debit" :currency="currency" /></td>
            <td dir="ltr" :class="cn(tdNum, 'font-medium')"><NqAccountingFigure :minor="tb.credit" :currency="currency" /></td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="flex items-center justify-end gap-2" aria-live="polite">
      <NqBadge :variant="tb.balanced ? 'success' : 'danger'">{{ tb.balanced ? t.trialBalanced : t.trialOff }}</NqBadge>
      <NqLineItemMoney v-if="!tb.balanced" :minor="Math.abs(tb.debit - tb.credit)" :currency="currency" class="text-label" />
    </div>
  </div>
</template>
