<script setup lang="ts">
import { computed } from "vue";
import { useCurrency, useNasaq } from "../../provider";
import { formatNumber } from "../numeric";
import NqAmountDialog from "./NqAmountDialog.vue";
import { walletStrings, type WalletLabels } from "./strings";
import type { WalletAccount, WalletResult } from "./types";

// A dialog to withdraw: pick a bank account, type an amount up to the available balance, confirm.
interface Props {
  open: boolean;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** What can be withdrawn right now. The amount cannot exceed it. */
  available: number;
  /** Bank accounts to send to. */
  destinations: readonly WalletAccount[];
  min?: number;
  /** Withdraws the money. Resolve `{ error }` or reject to keep the dialog open with the message. */
  onPayout: (input: { amount: number; destinationId: string }) => Promise<WalletResult>;
  labels?: WalletLabels;
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, min: 10 });
const emit = defineEmits<{ "update:open": [open: boolean] }>();
const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => walletStrings(nq.locale.value, props.labels));
const availableText = computed(() => formatNumber(props.available, nq.locale.value, { style: "currency", currency: currency.value }));
</script>

<template>
  <NqAmountDialog
    :open="props.open"
    :title="t.payoutTitle"
    :description="t.payoutDescription(availableText)"
    :currency="currency"
    :accounts="props.destinations"
    :account-label="t.destination"
    :min="props.min"
    :max="props.available"
    :max-label="t.max"
    :confirm="t.confirmPayout"
    :idle="t.withdraw"
    :on-submit="(amount, destinationId) => props.onPayout({ amount, destinationId })"
    :labels="props.labels"
    @update:open="emit('update:open', $event)"
  />
</template>
