<script setup lang="ts">
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqPayoutDialog from "./NqPayoutDialog.vue";
import NqTopUpDialog from "./NqTopUpDialog.vue";
import NqWalletBalance from "./NqWalletBalance.vue";
import NqWalletTransactions from "./NqWalletTransactions.vue";
import type { WalletLabels } from "./strings";
import type { WalletAccount, WalletResult, WalletTransaction } from "./types";

// The wallet screen: the balance on top, transactions below, and the top-up and withdrawal dialogs wired to it.
interface Props {
  balance: number;
  pending?: number;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  trend?: readonly number[];
  transactions: readonly WalletTransaction[];
  /** Sources for top-ups. Omit `onTopUp` to hide Add funds. */
  sources?: readonly WalletAccount[];
  /** Bank accounts for withdrawals. Omit `onPayout` to hide Withdraw. */
  destinations?: readonly WalletAccount[];
  /** Adds the money (`@top-up` or `:on-top-up`). Resolve `{ error }` or reject to keep the dialog open with the message. */
  onTopUp?: (input: { amount: number; sourceId: string }) => Promise<WalletResult>;
  /** Withdraws the money (`@payout` or `:on-payout`). */
  onPayout?: (input: { amount: number; destinationId: string }) => Promise<WalletResult>;
  topUpMin?: number;
  topUpPresets?: readonly number[];
  payoutMin?: number;
  /** A fee note under the top-up amount. (Or the `fee-note` slot.) */
  feeNote?: string;
  loading?: boolean;
  labels?: WalletLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  pending: undefined,
  currency: undefined,
  trend: undefined,
  sources: () => [],
  destinations: () => [],
  onTopUp: undefined,
  onPayout: undefined,
  topUpMin: undefined,
  topUpPresets: undefined,
  payoutMin: undefined,
  feeNote: undefined,
  loading: undefined,
});
const dialog = ref<"topup" | "payout" | null>(null);
</script>

<template>
  <div data-slot="wallet" :class="cn('flex flex-col gap-6', props.class)">
    <NqWalletBalance
      :balance="props.balance"
      :pending="props.pending"
      :currency="props.currency"
      :trend="props.trend"
      :loading="props.loading"
      :labels="props.labels"
      :on-top-up="props.onTopUp ? () => (dialog = 'topup') : undefined"
      :on-payout="props.onPayout ? () => (dialog = 'payout') : undefined"
    />
    <NqWalletTransactions :transactions="props.transactions" :currency="props.currency" :loading="props.loading" :labels="props.labels" />
    <NqTopUpDialog
      v-if="props.onTopUp"
      :open="dialog === 'topup'"
      :currency="props.currency"
      :sources="props.sources"
      :min="props.topUpMin"
      :presets="props.topUpPresets"
      :fee-note="props.feeNote"
      :on-top-up="props.onTopUp"
      :labels="props.labels"
      @update:open="dialog = $event ? 'topup' : null"
    >
      <template v-if="$slots['fee-note']" #fee-note><slot name="fee-note" /></template>
    </NqTopUpDialog>
    <NqPayoutDialog
      v-if="props.onPayout"
      :open="dialog === 'payout'"
      :currency="props.currency"
      :available="props.balance"
      :destinations="props.destinations"
      :min="props.payoutMin"
      :on-payout="props.onPayout"
      :labels="props.labels"
      @update:open="dialog = $event ? 'payout' : null"
    />
  </div>
</template>
