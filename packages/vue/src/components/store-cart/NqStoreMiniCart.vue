<script setup lang="ts">
import { computed } from "vue";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetFooter, NqSheetHeader, NqSheetTitle, NqSheetTrigger } from "../sheet";
import { cartActiveLines, cartBlockers, type CartRemoval } from "./cart-logic";
import { commerceTotals, type CommerceCartLine } from "./commerce";
import NqStoreCartEmpty from "./NqStoreCartEmpty.vue";
import NqStoreCartLineItem from "./NqStoreCartLineItem.vue";
import NqStoreCartMoney from "./NqStoreCartMoney.vue";
import NqStoreCartRemovedBar from "./NqStoreCartRemovedBar.vue";
import NqStoreFreeShippingBar from "./NqStoreFreeShippingBar.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// The cart drawer that slides in when something is added: lines with quantity and remove (with undo), the free-shipping
// progress bar, the subtotal, and Checkout / View cart. It is a dialog: focus moves in, Escape closes, and focus returns
// to the trigger. Checkout is off while a line is out of stock. `v-model:open` opens it; the `trigger` slot is the button
// that opens it, usually a `NqStoreCartButton`.
interface Props {
  /** All cart lines; saved-for-later ones are not shown. */
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Free shipping starts here, minor units. Leave out to hide the bar. */
  freeShippingThreshold?: number;
  onQuantityChange?: (lineId: string, quantity: number) => void;
  onRemove?: (lineId: string) => void;
  onCheckout?: () => void;
  onViewCart?: () => void;
  onContinueShopping?: () => void;
  /** From `useStoreCart`: the last removed line and its undo. */
  removed?: CartRemoval;
  onUndo?: () => void;
  onDismissRemoved?: () => void;
  labels?: StoreCartLabels;
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  freeShippingThreshold: undefined,
  onQuantityChange: undefined,
  onRemove: undefined,
  onCheckout: undefined,
  onViewCart: undefined,
  onContinueShopping: undefined,
  removed: undefined,
  onUndo: undefined,
  onDismissRemoved: undefined,
  labels: undefined,
});
const open = defineModel<boolean>("open", { default: false });
const currency = useCurrency(() => props.currency);
const { t, n } = useStoreCartStrings(() => props.labels);
const active = computed(() => cartActiveLines(props.lines));
const totals = computed(() => commerceTotals({ lines: props.lines }));
const blocked = computed(() => cartBlockers(props.lines).length > 0);
function continueShopping() {
  open.value = false;
  props.onContinueShopping?.();
}
</script>

<template>
  <NqSheet v-model:open="open">
    <NqSheetTrigger v-if="$slots.trigger" as-child><slot name="trigger" /></NqSheetTrigger>
    <NqSheetContent side="end" :close-label="t.close" data-slot="store-mini-cart">
      <NqSheetHeader>
        <NqSheetTitle>
          {{ t.miniTitle }}
          <span v-if="active.length" class="ms-2 text-body-sm font-normal text-muted-foreground">{{ t.items(n(totals.itemCount), totals.itemCount) }}</span>
        </NqSheetTitle>
        <NqSheetDescription>{{ t.miniDescription }}</NqSheetDescription>
      </NqSheetHeader>
      <NqSheetBody class="flex flex-col gap-3">
        <NqStoreCartRemovedBar v-if="props.removed && props.onUndo" :removal="props.removed" :labels="props.labels" @undo="props.onUndo()" @dismiss="props.onDismissRemoved?.()" />
        <NqStoreCartEmpty v-if="active.length === 0" :on-continue-shopping="props.onContinueShopping ? continueShopping : undefined" :labels="props.labels" class="border-0 px-0" />
        <template v-else>
          <NqStoreFreeShippingBar v-if="props.freeShippingThreshold" :subtotal="totals.subtotal" :threshold="props.freeShippingThreshold" :currency="currency" :labels="props.labels" />
          <ul class="flex flex-col divide-y divide-border">
            <NqStoreCartLineItem
              v-for="line in active"
              :key="line.id"
              :line="line"
              :currency="currency"
              compact
              :on-quantity-change="props.onQuantityChange ? (q: number) => props.onQuantityChange?.(line.id, q) : undefined"
              :on-remove="props.onRemove ? () => props.onRemove?.(line.id) : undefined"
              :labels="props.labels"
            />
          </ul>
        </template>
      </NqSheetBody>
      <NqSheetFooter v-if="active.length" class="flex-col items-stretch gap-3">
        <div class="flex items-baseline justify-between gap-3">
          <span class="text-label text-foreground">{{ t.subtotal }}</span>
          <NqStoreCartMoney :amount="totals.subtotal" :currency="currency" size="md" />
        </div>
        <p class="text-caption text-muted-foreground">{{ t.taxNote }}</p>
        <NqButton variant="primary" size="lg" :disabled="blocked" @click="props.onCheckout?.()">{{ t.checkout }}</NqButton>
        <NqButton variant="secondary" @click="props.onViewCart?.()">{{ t.viewCart }}</NqButton>
      </NqSheetFooter>
    </NqSheetContent>
  </NqSheet>
</template>
