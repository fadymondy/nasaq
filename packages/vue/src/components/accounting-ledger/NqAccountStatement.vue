<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqEmptyState } from "../states";
import { accountingNormalSide, accountingStatement, type AccountingAccount, type AccountingAccountType, type AccountingEntry } from "./accounting-math";
import NqAccountingFigure from "./NqAccountingFigure.vue";
import { accountingDate, useAccountingLedgerStrings, type AccountingLedgerLabels } from "./strings";

// The movements of one account with a running balance on its normal side.
interface Props {
  account: AccountingAccount;
  entries: readonly AccountingEntry[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Balance before the first row, on the account's normal side. */
  opening?: number;
  labels?: AccountingLedgerLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, opening: 0, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t, locale } = useAccountingLedgerStrings(() => props.labels);
const rows = computed(() => accountingStatement(props.account, props.entries, { opening: props.opening }));
const side = computed(() => accountingNormalSide(props.account.type));
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
</script>

<template>
  <div data-slot="account-statement" :class="cn('flex w-full flex-col gap-2', props.class)">
    <div class="flex flex-wrap items-center gap-2">
      <bdi dir="ltr" class="text-caption tabular-nums text-muted-foreground">{{ props.account.code }}</bdi>
      <h3 class="text-h3 text-foreground">{{ props.account.name }}</h3>
      <NqBadge :variant="TYPE_VARIANT[props.account.type]">{{ t[props.account.type] }}</NqBadge>
      <span class="ms-auto text-caption text-muted-foreground">{{ t.inCurrency }} <bdi dir="ltr">{{ currency }}</bdi></span>
    </div>
    <NqEmptyState v-if="rows.length === 0" :title="t.noMovements" />
    <div v-else class="w-full overflow-x-auto rounded-card border border-border bg-card">
      <table class="w-full min-w-[36rem] border-collapse">
        <caption class="sr-only">{{ `${t.statement}: ${props.account.name}` }}</caption>
        <thead class="border-b border-border">
          <tr>
            <th scope="col" :class="cn(th, 'w-32')">{{ t.date }}</th>
            <th scope="col" :class="cn(th, 'w-28')">{{ t.number }}</th>
            <th scope="col" :class="th">{{ t.memo }}</th>
            <th scope="col" dir="ltr" :class="cn(thNum, 'w-32')">{{ t.debit }}</th>
            <th scope="col" dir="ltr" :class="cn(thNum, 'w-32')">{{ t.credit }}</th>
            <th scope="col" dir="ltr" :class="cn(thNum, 'w-36')">{{ t.running }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <tr v-if="props.opening !== 0" class="text-muted-foreground">
            <td :class="td" colspan="5">{{ t.balance }}</td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="props.opening" :currency="currency" /></td>
          </tr>
          <tr v-for="(r, i) in rows" :key="`${r.entryId}-${i}`">
            <td :class="td"><bdi>{{ accountingDate(locale, r.date) }}</bdi></td>
            <td :class="td"><bdi dir="ltr" class="tabular-nums">{{ r.number }}</bdi></td>
            <td :class="cn(td, 'max-w-64 truncate')">{{ r.memo }}</td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="r.debit" :currency="currency" blank /></td>
            <td dir="ltr" :class="tdNum"><NqAccountingFigure :minor="r.credit" :currency="currency" blank /></td>
            <td dir="ltr" :class="cn(tdNum, 'font-medium')">
              <NqAccountingFigure :minor="r.balance" :currency="currency" />
              <span class="sr-only"> {{ t[side] }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
