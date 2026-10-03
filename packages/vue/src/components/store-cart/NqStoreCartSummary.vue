<script setup lang="ts">
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { commerceTotals, type CommerceCartLine, type CommerceShippingMethod } from "./commerce";
import NqStoreAmount from "./NqStoreAmount.vue";
import NqStoreCartMoney from "./NqStoreCartMoney.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// The order summary from `commerceTotals`: items, subtotal, promo discount, shipping, tax, total and "You are saving ...".
// The `footer` slot goes under the Checkout button (payment badges, a guarantee).
interface Props {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Promo discount, minor units. */
  discount?: number;
  /** The chosen shipping method; without one the row says it is worked out at checkout. */
  shipping?: CommerceShippingMethod;
  taxBps?: number;
  taxInclusive?: boolean;
  /** The Checkout button shows when you pass `@checkout`. */
  onCheckout?: () => void;
  checkoutDisabled?: boolean;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  discount: 0,
  shipping: undefined,
  taxBps: undefined,
  taxInclusive: undefined,
  onCheckout: undefined,
  checkoutDisabled: undefined,
  labels: undefined,
});
const currency = useCurrency(() => props.currency);
const { t, n, money } = useStoreCartStrings(() => props.labels);
const titleId = useId();
const totals = computed(() =>
  commerceTotals({
    lines: props.lines,
    discount: props.discount,
    ...(props.shipping ? { shipping: props.shipping } : {}),
    ...(props.taxBps ? { taxBps: props.taxBps } : {}),
    ...(props.taxInclusive !== undefined ? { taxInclusive: props.taxInclusive } : {}),
  }),
);
const row = "flex items-baseline justify-between gap-3 text-body-sm";
</script>

<template>
  <section data-slot="store-cart-summary" :aria-labelledby="titleId" :class="cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4', props.class)">
    <h2 :id="titleId" class="text-h3 font-semibold text-foreground">{{ t.summary }}</h2>
    <dl class="flex flex-col gap-2">
      <div :class="row">
        <dt class="text-muted-foreground">{{ t.itemsLine(n(totals.itemCount), totals.itemCount) }}</dt>
        <dd class="text-foreground"><NqStoreAmount :amount="totals.subtotal" :currency="currency" /></dd>
      </div>
      <div v-if="totals.discount > 0" :class="row">
        <dt class="text-muted-foreground">{{ t.discount }}</dt>
        <dd class="text-foreground">
          <span class="text-nq-success-text">
            <bdi dir="ltr">&minus;</bdi>
            <NqStoreAmount :amount="totals.discount" :currency="currency" class="text-nq-success-text" />
          </span>
        </dd>
      </div>
      <div :class="row">
        <dt class="text-muted-foreground">{{ t.shipping }}</dt>
        <dd class="text-foreground">
          <template v-if="props.shipping">
            <span v-if="totals.shipping === 0" class="text-nq-success-text">{{ t.free }}</span>
            <NqStoreAmount v-else :amount="totals.shipping" :currency="currency" />
          </template>
          <span v-else class="text-muted-foreground">{{ t.shippingLater }}</span>
        </dd>
      </div>
      <div v-if="totals.tax > 0" :class="row">
        <dt class="text-muted-foreground">{{ t.tax }}</dt>
        <dd class="text-foreground"><NqStoreAmount :amount="totals.tax" :currency="currency" /></dd>
      </div>
    </dl>
    <div class="flex items-baseline justify-between gap-3 border-t border-border pt-3">
      <span class="text-label text-foreground">{{ t.total }}</span>
      <NqStoreCartMoney :amount="totals.total" :currency="currency" size="lg" />
    </div>
    <NqBadge v-if="totals.savings > 0" variant="success" class="w-fit">{{ t.saving(money(totals.savings, currency)) }}</NqBadge>
    <NqButton v-if="props.onCheckout" variant="primary" size="lg" :disabled="props.checkoutDisabled || totals.itemCount === 0" @click="props.onCheckout()">{{ t.checkout }}</NqButton>
    <slot name="footer" />
  </section>
</template>
