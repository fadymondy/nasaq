<script setup lang="ts">
import { computed } from "vue";
import { useCurrency, useNasaq } from "../../provider";
import NqAmountDialog from "./NqAmountDialog.vue";
import { walletStrings, type WalletLabels } from "./strings";
import type { WalletAccount, WalletResult } from "./types";

// A dialog to add funds: pick a source, type or tap an amount, confirm. Validates the amount, not the payment.
interface Props {
  open: boolean;
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Payment sources to fund from. */
  sources: readonly WalletAccount[];
  /** One-tap amounts. Default 50, 100, 250, 500. */
  presets?: readonly number[];
  min?: number;
  max?: number;
  /** A fee note shown under the amount, already formatted: "A fee of 1.5% applies". (Or the `fee-note` slot.) */
  feeNote?: string;
  /** Adds the money. Resolve `{ error }` or reject to keep the dialog open with the message. */
  onTopUp: (input: { amount: number; sourceId: string }) => Promise<WalletResult>;
  labels?: WalletLabels;
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, presets: () => [50, 100, 250, 500], min: 10, max: undefined, feeNote: undefined });
const emit = defineEmits<{ "update:open": [open: boolean] }>();
const nq = useNasaq();
const currency = useCurrency(() => props.currency);
const t = computed(() => walletStrings(nq.locale.value, props.labels));
</script>

<template>
  <NqAmountDialog
    :open="props.open"
    :title="t.topUpTitle"
    :description="t.topUpDescription"
    :currency="currency"
    :accounts="props.sources"
    :account-label="t.source"
    :presets="props.presets"
    :min="props.min"
    :max="props.max"
    :confirm="t.confirmTopUp"
    :idle="t.add"
    :extra="props.feeNote"
    :on-submit="(amount, sourceId) => props.onTopUp({ amount, sourceId })"
    :labels="props.labels"
    @update:open="emit('update:open', $event)"
  >
    <template v-if="$slots['fee-note']" #extra>
      <p class="text-caption text-muted-foreground"><slot name="fee-note" /></p>
    </template>
  </NqAmountDialog>
</template>
