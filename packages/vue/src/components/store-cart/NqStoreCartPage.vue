<script setup lang="ts">
import { computed, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqPromoCodeField } from "../loyalty-promo";
import { NqErrorState, NqSkeleton } from "../states";
import { cartActiveLines, cartBlockers, cartSavedLines, type CartRemoval, type StoreShippingZone } from "./cart-logic";
import { commerceTotals, type CommerceCartLine } from "./commerce";
import NqStoreCartAnnouncer from "./NqStoreCartAnnouncer.vue";
import NqStoreCartEmpty from "./NqStoreCartEmpty.vue";
import NqStoreCartLineItem from "./NqStoreCartLineItem.vue";
import NqStoreCartRemovedBar from "./NqStoreCartRemovedBar.vue";
import NqStoreCartSummary from "./NqStoreCartSummary.vue";
import NqStoreFreeShippingBar from "./NqStoreFreeShippingBar.vue";
import NqStoreShippingEstimator from "./NqStoreShippingEstimator.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";
import type { StoreCartPromo, StoreShippingSelection } from "./types";
import type { StoreCartMessage } from "./use-store-cart";

// The cart page: lines with a clamped quantity stepper, remove with undo, save for later and move back, stock warnings,
// the free-shipping bar, a promo code, a shipping estimator, the summary with savings, a cross-sell slot, and empty,
// loading and error states. Cart changes are announced through a polite live region.
// Slots: `cross-sell` under the lines (usually `NqStoreCrossSell`), `summary-footer` under the total (payment badges, a guarantee).
// A callback you do not pass hides its control: `@remove`, `@save-for-later`, `@move-to-cart`, `@open-product`, `@fix-stock`, `@checkout`, `@continue-shopping`, `@retry`.
interface Props {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onQuantityChange?: (lineId: string, quantity: number) => void;
  onRemove?: (lineId: string) => void;
  onSaveForLater?: (lineId: string) => void;
  onMoveToCart?: (lineId: string) => void;
  onOpenProduct?: (line: CommerceCartLine) => void;
  /** Brings over-stock quantities down to what is left. */
  onFixStock?: () => void;
  removed?: CartRemoval;
  onUndo?: () => void;
  onDismissRemoved?: () => void;
  /** Free shipping starts here, minor units. Leave out to hide the bar. */
  freeShippingThreshold?: number;
  /** Delivery zones for the estimator. Leave out to hide it. */
  zones?: readonly StoreShippingZone[];
  /** The chosen shipping (v-model:shipping-selection). Without it the page keeps its own. */
  shippingSelection?: StoreShippingSelection | undefined;
  /** Turns on the promo box (NqPromoCodeField). */
  promo?: StoreCartPromo;
  taxBps?: number;
  taxInclusive?: boolean;
  onCheckout?: () => void;
  onContinueShopping?: () => void;
  /** From `useStoreCart().message`, read out by the live region. */
  message?: StoreCartMessage;
  loading?: boolean;
  /** Something went wrong loading the cart. */
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  onQuantityChange: undefined,
  onRemove: undefined,
  onSaveForLater: undefined,
  onMoveToCart: undefined,
  onOpenProduct: undefined,
  onFixStock: undefined,
  removed: undefined,
  onUndo: undefined,
  onDismissRemoved: undefined,
  freeShippingThreshold: undefined,
  zones: undefined,
  shippingSelection: undefined,
  promo: undefined,
  taxBps: undefined,
  taxInclusive: undefined,
  onCheckout: undefined,
  onContinueShopping: undefined,
  message: undefined,
  onRetry: undefined,
  labels: undefined,
});
const emit = defineEmits<{ "update:shippingSelection": [selection: StoreShippingSelection | undefined] }>();
const currency = useCurrency(() => props.currency);
const { t, n } = useStoreCartStrings(() => props.labels);

const ownSelection = ref<StoreShippingSelection | undefined>();
const selection = computed(() => props.shippingSelection ?? ownSelection.value);
function changeSelection(next: StoreShippingSelection | undefined) {
  ownSelection.value = next;
  emit("update:shippingSelection", next);
}

const active = computed(() => cartActiveLines(props.lines));
const saved = computed(() => cartSavedLines(props.lines));
const blockers = computed(() => cartBlockers(props.lines));
const discount = computed(() => props.promo?.applied?.discount ?? 0);
const totals = computed(() => commerceTotals({ lines: props.lines, discount: discount.value, ...(selection.value ? { shipping: selection.value.method } : {}) }));
const canFix = computed(() => blockers.value.some((l) => l.maxQuantity !== undefined && l.maxQuantity > 0));

// Promo changes are announced too; the cart's own messages come from the composable.
const promoMessage = ref<StoreCartMessage>({ id: 0, text: "" });
let lastCode = props.promo?.applied?.code;
watch(
  () => props.promo?.applied?.code,
  (code) => {
    if (lastCode === code) return;
    promoMessage.value = { id: promoMessage.value.id + 1, text: code ? t.value.live.promoApplied(code) : t.value.live.promoRemoved(lastCode ?? "") };
    lastCode = code;
  },
);

const titleId = useId();
const promoContext = computed(() => ({
  subtotal: totals.value.subtotal,
  today: props.promo?.today ?? new Date().toISOString().slice(0, 10),
  ...(props.promo?.firstOrder !== undefined ? { firstOrder: props.promo.firstOrder } : {}),
}));
const listClass = "flex flex-col divide-y divide-border border-y border-border";
</script>

<template>
  <div data-slot="store-cart-page" :class="cn('mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6', props.class)">
    <NqStoreCartAnnouncer v-if="props.message" :message="props.message" />
    <NqStoreCartAnnouncer :message="promoMessage" />
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <h1 :id="titleId" class="text-h1 font-semibold tracking-tight text-foreground">
        {{ t.cart }}
        <span v-if="active.length" class="ms-2 text-body font-normal text-muted-foreground">{{ t.items(n(totals.itemCount), totals.itemCount) }}</span>
      </h1>
      <NqButton v-if="props.onContinueShopping && active.length" variant="link" @click="props.onContinueShopping()">{{ t.continueShopping }}</NqButton>
    </div>

    <NqErrorState v-if="props.error" :title="t.errorTitle" :description="t.errorDescription">
      <template v-if="props.onRetry" #actions>
        <NqButton variant="primary" @click="props.onRetry()">{{ t.retry }}</NqButton>
      </template>
    </NqErrorState>
    <div v-else-if="props.loading" role="status" aria-busy="true" :aria-label="t.loading" class="flex flex-col gap-4">
      <div v-for="i in 3" :key="i" class="flex gap-4 py-2">
        <NqSkeleton class="size-22 shrink-0" />
        <div class="flex flex-1 flex-col gap-2">
          <NqSkeleton class="h-4 w-2/3" />
          <NqSkeleton class="h-3 w-1/3" />
          <NqSkeleton class="mt-2 h-8 w-28" />
        </div>
      </div>
    </div>
    <NqStoreCartEmpty v-else-if="active.length === 0 && saved.length === 0" :on-continue-shopping="props.onContinueShopping" :labels="props.labels" />
    <div v-else class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <div class="flex min-w-0 flex-col gap-6">
        <NqAlert v-if="blockers.length" tone="warning" :title="t.attentionTitle">
          {{ t.attentionBody }}
          <template v-if="props.onFixStock && canFix" #action>
            <NqButton size="sm" variant="secondary" @click="props.onFixStock()">{{ t.fixStock }}</NqButton>
          </template>
        </NqAlert>
        <NqStoreFreeShippingBar v-if="props.freeShippingThreshold && active.length" :subtotal="totals.subtotal" :threshold="props.freeShippingThreshold" :currency="currency" :labels="props.labels" class="rounded-card border border-border bg-card p-4" />
        <NqStoreCartRemovedBar v-if="props.removed && props.onUndo" :removal="props.removed" :labels="props.labels" @undo="props.onUndo()" @dismiss="props.onDismissRemoved?.()" />
        <ul v-if="active.length" :aria-label="t.cart" :class="listClass">
          <NqStoreCartLineItem
            v-for="line in active"
            :key="line.id"
            :line="line"
            :currency="currency"
            :on-quantity-change="props.onQuantityChange ? (q: number) => props.onQuantityChange?.(line.id, q) : undefined"
            :on-remove="props.onRemove ? () => props.onRemove?.(line.id) : undefined"
            :on-save-for-later="props.onSaveForLater ? () => props.onSaveForLater?.(line.id) : undefined"
            :on-open-product="props.onOpenProduct ? () => props.onOpenProduct?.(line) : undefined"
            :labels="props.labels"
          />
        </ul>
        <NqStoreCartEmpty v-else :on-continue-shopping="props.onContinueShopping" :labels="props.labels" />
        <section v-if="saved.length" :aria-labelledby="`${titleId}-saved`" class="flex flex-col gap-2">
          <div class="flex flex-col gap-0.5">
            <h2 :id="`${titleId}-saved`" class="text-h3 font-semibold text-foreground">{{ t.savedTitle(n(saved.length)) }}</h2>
            <p class="text-caption text-muted-foreground">{{ t.savedHint }}</p>
          </div>
          <ul :class="listClass">
            <NqStoreCartLineItem
              v-for="line in saved"
              :key="line.id"
              :line="line"
              :currency="currency"
              saved
              :on-move-to-cart="props.onMoveToCart ? () => props.onMoveToCart?.(line.id) : undefined"
              :on-remove="props.onRemove ? () => props.onRemove?.(line.id) : undefined"
              :on-open-product="props.onOpenProduct ? () => props.onOpenProduct?.(line) : undefined"
              :labels="props.labels"
            />
          </ul>
        </section>
        <slot name="cross-sell" />
      </div>
      <aside v-if="active.length" :aria-label="t.summary" class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
        <NqStoreCartSummary
          :lines="props.lines"
          :currency="currency"
          :discount="discount"
          :shipping="selection?.method"
          :tax-bps="props.taxBps"
          :tax-inclusive="props.taxInclusive"
          :on-checkout="props.onCheckout"
          :checkout-disabled="blockers.length > 0"
          :labels="props.labels"
        >
          <template v-if="$slots['summary-footer']" #footer><slot name="summary-footer" /></template>
        </NqStoreCartSummary>
        <section v-if="props.promo" :aria-label="t.promoTitle" class="rounded-card border border-border bg-card p-4">
          <NqPromoCodeField
            :currency="currency"
            :applied="props.promo.applied ?? null"
            :promos="props.promo.promos"
            :context="promoContext"
            :on-apply="props.promo.onApply"
            :on-applied="props.promo.onApplied"
            :on-remove="props.promo.onRemove"
          />
        </section>
        <NqStoreShippingEstimator v-if="props.zones?.length" :zones="props.zones" :subtotal="totals.subtotal - discount" :currency="currency" :model-value="selection" :labels="props.labels" @update:model-value="changeSelection" />
      </aside>
    </div>
  </div>
</template>
