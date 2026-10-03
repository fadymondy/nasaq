<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqLineItemMoney } from "../line-item-editor";
import NqPosRow from "./NqPosRow.vue";
import { posVariance, type PosDrawerSummary } from "./pos-math";
import type { PosRegisterStrings } from "./strings";

// Counts the drawer at the end of the shift: what the sales say should be there against what was counted.
const props = defineProps<{
  open: boolean;
  currency: string;
  drawer: PosDrawerSummary;
  t: PosRegisterStrings;
  onClose: (counted: number) => Promise<void>;
}>();
const emit = defineEmits<{ "update:open": [open: boolean] }>();

const counted = ref<number | null>(null);
const busy = ref(false);
watch(
  () => props.open,
  (open) => {
    if (open) counted.value = null;
  },
  { immediate: true },
);
const variance = computed(() => (counted.value === null ? null : posVariance(props.drawer.expectedCash, counted.value)));

async function submit() {
  if (counted.value === null) return;
  busy.value = true;
  try {
    await props.onClose(counted.value);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(o: boolean) => !busy && emit('update:open', o)">
    <NqDialogContent class="max-w-md">
      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.drawer }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.closeText }}</NqDialogDescription>
        </NqDialogHeader>
        <dl class="flex flex-col gap-1.5 rounded-floating border border-border bg-card p-3">
          <NqPosRow :label="props.t.floatRow"><NqLineItemMoney :minor="props.drawer.openingFloat" :currency="props.currency" /></NqPosRow>
          <NqPosRow :label="props.t.cashSales"><NqLineItemMoney :minor="props.drawer.cash" :currency="props.currency" /></NqPosRow>
          <NqPosRow :label="props.t.cardSales"><NqLineItemMoney :minor="props.drawer.card" :currency="props.currency" /></NqPosRow>
          <NqPosRow :label="props.t.walletSales"><NqLineItemMoney :minor="props.drawer.wallet" :currency="props.currency" /></NqPosRow>
          <NqPosRow :label="props.t.salesCount"><bdi>{{ props.drawer.sales }}</bdi></NqPosRow>
          <NqPosRow :label="props.t.expectedCash" strong><NqLineItemMoney :minor="props.drawer.expectedCash" :currency="props.currency" /></NqPosRow>
        </dl>
        <label class="flex flex-col gap-1.5 text-label text-foreground">
          {{ props.t.countedCash }}
          <NqCurrencyInput :model-value="counted" :currency="props.currency" :min="0" :aria-label="props.t.countedCash" @update:model-value="(v: number | null) => (counted = v)" />
        </label>
        <div v-if="variance !== null" class="flex items-center justify-between gap-3" aria-live="polite">
          <span class="text-label text-muted-foreground">{{ props.t.variance }}</span>
          <span class="flex items-center gap-2">
            <NqBadge :variant="variance === 0 ? 'success' : variance < 0 ? 'danger' : 'warning'">{{ variance === 0 ? props.t.exact : variance < 0 ? props.t.short : props.t.over }}</NqBadge>
            <NqLineItemMoney v-if="variance !== 0" :minor="variance" :currency="props.currency" sign="always" class="text-label" />
          </span>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="secondary" :disabled="busy" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="danger" :disabled="counted === null" :loading="busy">{{ props.t.closeRegister }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
