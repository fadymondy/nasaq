<script setup lang="ts">
import { ChevronDown, ShoppingBag } from "lucide-vue-next";
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import NqStoreAmount from "../store-cart/NqStoreAmount.vue";
import NqStoreCartMoney from "../store-cart/NqStoreCartMoney.vue";
import NqStoreImage from "../store-cart/NqStoreImage.vue";
import type { CheckoutSummary } from "./checkout-machine";
import type { CommerceCartLine, CommerceShippingMethod } from "./commerce";
import { useStoreCheckoutStrings, type StoreCheckoutLabels } from "./strings";

// The order summary beside the checkout. On large screens it is always open; on small ones it folds behind a bar that
// shows the total (a disclosure button with `aria-expanded`), so the form is not pushed down the page.
interface Props {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  summary: CheckoutSummary;
  /** Shows the chosen method's name next to Shipping. */
  shippingMethod?: CommerceShippingMethod;
  /** Start expanded on small screens. Default false: the total is shown and the lines are folded away. */
  defaultOpen?: boolean;
  onEditCart?: () => void;
  labels?: StoreCheckoutLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, shippingMethod: undefined, defaultOpen: false, onEditCart: undefined, labels: undefined });

const currency = useCurrency(() => props.currency);
const { t, n, money } = useStoreCheckoutStrings(() => props.labels);
const open = ref(props.defaultOpen);
const panelId = `nq-summary-${useId()}`;
const active = computed(() => props.lines.filter((l) => !l.savedForLater));
const lineMeta = (line: CommerceCartLine) => [line.variantLabel, t.value.quantityShort(n(line.quantity))].filter(Boolean).join(" · ");
defineOptions({ inheritAttrs: false });
</script>

<template>
  <aside v-bind="$attrs" data-slot="store-order-summary" :aria-label="t.summary" :class="cn('flex flex-col rounded-card border border-border bg-card', props.class)">
    <button
      type="button"
      :aria-expanded="open"
      :aria-controls="panelId"
      class="flex w-full items-center justify-between gap-3 rounded-card p-4 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus lg:hidden"
      @click="open = !open"
    >
      <span class="flex items-center gap-2 text-label text-foreground">
        <ShoppingBag aria-hidden="true" class="size-4" />
        {{ open ? t.hideSummary : t.showSummary }}
        <ChevronDown aria-hidden="true" :class="cn('size-4 transition-transform motion-reduce:transition-none', open && 'rotate-180')" />
      </span>
      <NqStoreCartMoney :amount="props.summary.payable" :currency="currency" />
    </button>
    <div :id="panelId" :class="cn('flex-col gap-4 p-4 pt-0 lg:flex lg:pt-4', open ? 'flex' : 'hidden')">
      <div class="flex items-center justify-between gap-3">
        <h2 class="hidden text-h3 font-semibold text-foreground lg:block">{{ t.summary }}</h2>
        <NqButton v-if="props.onEditCart" variant="link" size="sm" class="ms-auto" @click="props.onEditCart()">{{ t.editCart }}</NqButton>
      </div>
      <ul class="flex flex-col gap-3">
        <li v-for="line in active" :key="line.id" class="flex items-center gap-3">
          <span class="relative shrink-0">
            <NqStoreImage :src="line.image" :alt="line.name" :size="48" />
            <span aria-hidden="true" class="absolute -end-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[0.6875rem] font-medium leading-5 text-background">
              {{ n(line.quantity) }}
            </span>
          </span>
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]">{{ line.name }}</span>
            <span class="text-caption text-muted-foreground">{{ lineMeta(line) }}</span>
          </span>
          <NqStoreAmount :amount="line.unitPrice * line.quantity" :currency="currency" class="text-body-sm" />
        </li>
      </ul>
      <dl class="flex flex-col gap-2 border-t border-border pt-3">
        <div class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ t.subtotal }} · {{ t.items(n(props.summary.itemCount), props.summary.itemCount) }}</dt>
          <dd class="text-foreground"><NqStoreAmount :amount="props.summary.subtotal" :currency="currency" /></dd>
        </div>
        <div v-if="props.summary.discount > 0" class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ t.discount }}</dt>
          <dd class="text-foreground">
            <span class="text-nq-success-text">
              <bdi dir="ltr">−</bdi>
              <NqStoreAmount :amount="props.summary.discount" :currency="currency" class="text-nq-success-text" />
            </span>
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ props.shippingMethod ? `${t.shipping} · ${props.shippingMethod.label}` : t.shipping }}</dt>
          <dd class="text-foreground">
            <template v-if="props.shippingMethod">
              <span v-if="props.summary.shipping === 0" class="text-nq-success-text">{{ t.free }}</span>
              <NqStoreAmount v-else :amount="props.summary.shipping" :currency="currency" />
            </template>
            <span v-else class="text-muted-foreground">{{ t.shippingPending }}</span>
          </dd>
        </div>
        <div v-if="props.summary.tax > 0" class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ t.tax }}</dt>
          <dd class="text-foreground"><NqStoreAmount :amount="props.summary.tax" :currency="currency" /></dd>
        </div>
        <div v-if="props.summary.codFee > 0" class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ t.codFee }}</dt>
          <dd class="text-foreground"><NqStoreAmount :amount="props.summary.codFee" :currency="currency" /></dd>
        </div>
        <div v-if="props.summary.giftWrapFee > 0" class="flex items-baseline justify-between gap-3 text-body-sm">
          <dt class="text-muted-foreground">{{ t.giftWrapRow }}</dt>
          <dd class="text-foreground"><NqStoreAmount :amount="props.summary.giftWrapFee" :currency="currency" /></dd>
        </div>
      </dl>
      <div class="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span class="text-label text-foreground">{{ t.total }}</span>
        <NqStoreCartMoney :amount="props.summary.payable" :currency="currency" size="lg" />
      </div>
      <NqBadge v-if="props.summary.savings > 0" variant="success" class="w-fit">{{ t.saving(money(props.summary.savings, currency)) }}</NqBadge>
    </div>
  </aside>
</template>
