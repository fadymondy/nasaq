<script setup lang="ts">
import { ArrowDownLeft, ArrowUpRight, Receipt, RotateCcw, Undo2, WalletCards } from "lucide-vue-next";
import { computed, ref, useId, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency, useNasaq } from "../../provider";
import { NqDateTime, NqNum, useFormatDate } from "../numeric";
import { NqEmptyState, NqSkeleton } from "../states";
import { NqStatus } from "../status";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { walletStrings, type WalletLabels } from "./strings";
import type { WalletTransaction, WalletTransactionStatus, WalletTransactionType } from "./types";
import { groupByDay } from "./wallet-math";

// Transactions grouped by day with a money in / out filter. Signed amounts, a type icon and a status on every row.
interface Props {
  transactions: readonly WalletTransaction[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  loading?: boolean;
  labels?: WalletLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, loading: false });

type Direction = "all" | "in" | "out";
const TYPE_ICON: Record<WalletTransactionType, Component> = { topup: ArrowDownLeft, payout: ArrowUpRight, payment: Receipt, refund: Undo2, fee: RotateCcw };
const STATUS_TONE = { completed: "success", pending: "warning", failed: "danger" } as const;

const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => walletStrings(nq.locale.value, props.labels));
const fmt = useFormatDate();
const titleId = `nq-wallet-${useId()}`;
const direction = ref<Direction>("all");
const shown = computed(() => props.transactions.filter((tx) => (direction.value === "in" ? tx.amount > 0 : direction.value === "out" ? tx.amount < 0 : true)));
const groups = computed(() => groupByDay(shown.value));
const typeLabel = computed<Record<WalletTransactionType, string>>(() => ({ topup: t.value.topup, payout: t.value.payoutType, payment: t.value.payment, refund: t.value.refund, fee: t.value.fee }));
const statusLabel = computed<Record<WalletTransactionStatus, string>>(() => ({ completed: t.value.completed, pending: t.value.pendingStatus, failed: t.value.failed }));
const moneyOf = computed(() => ({ style: "currency", currency: currency.value, signDisplay: "exceptZero" }) as const);

function dayLabel(date: Date) {
  const now = new Date();
  const diff = Math.round((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86_400_000);
  return diff === 0 ? t.value.today : diff === 1 ? t.value.yesterday : fmt.date(date, { dateStyle: "medium" });
}
function amountClass(tx: WalletTransaction) {
  return cn("text-label", tx.status === "failed" ? "text-muted-foreground line-through" : tx.amount > 0 ? "text-nq-success-text" : "text-foreground");
}
function onFilter(v: string[]) {
  if (v[0]) direction.value = v[0] as Direction;
}
</script>

<template>
  <section data-slot="wallet-transactions" :aria-labelledby="titleId" :class="cn('flex flex-col gap-4', props.class)">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 :id="titleId" class="text-h3 text-foreground">{{ t.transactions }}</h2>
      <NqToggleGroup :aria-label="t.filter" :model-value="[direction]" @update:model-value="onFilter">
        <NqToggle value="all">{{ t.all }}</NqToggle>
        <NqToggle value="in">{{ t.incoming }}</NqToggle>
        <NqToggle value="out">{{ t.outgoing }}</NqToggle>
      </NqToggleGroup>
    </div>
    <div v-if="props.loading" class="flex flex-col gap-2" aria-busy="true">
      <NqSkeleton v-for="i in 3" :key="i" class="h-14 w-full" />
    </div>
    <NqEmptyState v-else-if="groups.length === 0" :icon="WalletCards" :title="t.emptyTitle" :description="t.emptyDescription" />
    <template v-else>
      <div v-for="group in groups" :key="group.key" class="flex flex-col gap-1">
        <h3 class="text-caption font-medium text-muted-foreground">{{ dayLabel(group.date) }}</h3>
        <ul class="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
          <li v-for="tx in group.items" :key="tx.id" :data-status="tx.status" class="flex items-center gap-3 px-4 py-3">
            <span aria-hidden="true" class="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-muted-foreground [&_svg]:size-4">
              <component :is="TYPE_ICON[tx.type]" />
            </span>
            <div class="flex min-w-0 flex-1 flex-col">
              <p class="truncate text-body-sm text-foreground">{{ tx.description }}</p>
              <p class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
                <span>{{ typeLabel[tx.type] }}</span>
                <NqDateTime :value="tx.date" :format="{ timeStyle: 'short' }" />
                <bdi v-if="tx.reference" dir="ltr" class="font-mono">{{ tx.reference }}</bdi>
              </p>
            </div>
            <div class="flex shrink-0 flex-col items-end gap-0.5">
              <NqNum :value="tx.amount" :format="moneyOf" :class="amountClass(tx)" />
              <NqStatus v-if="tx.status !== 'completed'" :tone="STATUS_TONE[tx.status]" class="text-caption">{{ statusLabel[tx.status] }}</NqStatus>
            </div>
          </li>
        </ul>
      </div>
    </template>
  </section>
</template>
