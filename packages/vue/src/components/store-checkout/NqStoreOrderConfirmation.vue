<script setup lang="ts">
import { CheckCircle2 } from "lucide-vue-next";
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, NqNum } from "../numeric";
import NqStoreAmount from "../store-cart/NqStoreAmount.vue";
import NqStoreCartMoney from "../store-cart/NqStoreCartMoney.vue";
import NqStoreImage from "../store-cart/NqStoreImage.vue";
import { storeAddressLines } from "./address-rules";
import type { CheckoutPaymentKind } from "./checkout-machine";
import type { CommerceOrder } from "./commerce";
import { storeShippingEta } from "./eta";
import { useStoreCheckoutStrings, type StoreCheckoutLabels } from "./strings";

// The page after placing an order: a confirmation with the order number (left to right in Arabic), where it goes and
// when it should arrive, how it was paid, the items and totals, what happens next, and Track order / Continue shopping.
// The heading takes focus on arrival so screen readers announce it.
interface Props {
  order: CommerceOrder;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** How it was paid, for the wording. Default: from `order.payment` ("cod" is pay on delivery, "pending" a transfer being checked). */
  paymentKind?: CheckoutPaymentKind;
  gift?: boolean;
  onTrackOrder?: () => void;
  onContinueShopping?: () => void;
  now?: Date;
  weekend?: readonly number[];
  labels?: StoreCheckoutLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, paymentKind: undefined, gift: false, onTrackOrder: undefined, onContinueShopping: undefined, now: undefined, weekend: () => [], labels: undefined });

const currency = useCurrency(() => props.currency);
const { t, n, locale, ar } = useStoreCheckoutStrings(() => props.labels);
const heading = ref<HTMLElement | null>(null);
onMounted(() => heading.value?.focus());

const kind = computed<CheckoutPaymentKind>(() => props.paymentKind ?? (props.order.payment === "cod" ? "cod" : props.order.payment === "pending" ? "local" : "card"));
const steps = computed(() => (kind.value === "cod" ? t.value.next : kind.value === "local" ? t.value.nextLocal : t.value.nextPrepaid));
const method = computed(() => props.order.shippingMethod);
const eta = computed(() => (method.value ? storeShippingEta(method.value, props.now ?? new Date(props.order.placedAt), props.weekend, locale.value, t.value) : undefined));
const totals = computed(() => props.order.totals);
const fees = computed(() => totals.value.total - (totals.value.subtotal - totals.value.discount + totals.value.shipping + (totals.value.tax > 0 ? totals.value.tax : 0)));
const address = computed(() => props.order.shippingAddress);
const sep = computed(() => (ar.value ? "، " : ", "));
const emailParts = computed(() => t.value.emailed("@@EMAIL@@").split("@@EMAIL@@"));
const lineMeta = (line: CommerceOrder["lines"][number]) => [line.variantLabel, t.value.quantityShort(n(line.quantity))].filter(Boolean).join(" · ");
defineOptions({ inheritAttrs: false });
</script>

<template>
  <div v-bind="$attrs" data-slot="store-order-confirmation" :class="cn('mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6', props.class)">
    <header class="flex flex-col items-center gap-3 text-center">
      <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
        <CheckCircle2 aria-hidden="true" class="size-7" />
      </span>
      <h1 ref="heading" tabindex="-1" class="text-h1 font-semibold tracking-tight text-foreground outline-none">{{ t.thanks(props.order.customer.name.split(" ")[0] ?? "") }}</h1>
      <p class="text-body text-foreground">{{ t.confirmed }}</p>
      <p class="flex items-center gap-2 text-body-sm text-muted-foreground">
        {{ t.orderNumber }}
        <bdi dir="ltr" class="rounded-control bg-secondary px-2 py-0.5 font-medium tabular-nums text-foreground">{{ props.order.number }}</bdi>
      </p>
      <p v-if="props.order.customer.email" class="text-body-sm text-muted-foreground">
        {{ emailParts[0] }}<template v-if="emailParts.length > 1"><bdi dir="ltr">{{ props.order.customer.email }}</bdi>{{ emailParts[1] }}</template>
      </p>
    </header>

    <section class="rounded-card border border-border bg-card p-4">
      <dl class="grid gap-4 sm:grid-cols-2">
        <div v-if="address" class="flex flex-col gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ t.deliveryTo }}</dt>
          <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]">
            <span class="flex flex-col">
              <span class="font-medium">{{ address.name }}</span>
              <span v-for="line in storeAddressLines(address, sep)" :key="line">{{ line }}</span>
            </span>
          </dd>
        </div>
        <div v-if="method" class="flex flex-col gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ t.deliveryMethod }}</dt>
          <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]">
            <span class="flex flex-col">
              <span>{{ method.label }}</span>
              <span v-if="eta" class="text-muted-foreground">{{ eta }}</span>
            </span>
          </dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ t.paymentLabel }}</dt>
          <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]">{{ t.paymentKind[kind] }}</dd>
        </div>
        <div class="flex flex-col gap-0.5">
          <dt class="text-caption text-muted-foreground">{{ t.placedOn }}</dt>
          <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]"><NqDateTime :value="props.order.placedAt" :format="{ dateStyle: 'medium' }" /></dd>
        </div>
      </dl>
      <NqBadge v-if="props.gift" variant="info" class="mt-4">{{ t.giftOrder }}</NqBadge>
    </section>

    <section aria-labelledby="order-items" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <h2 id="order-items" class="text-h3 font-semibold text-foreground">{{ t.itemsTitle }}</h2>
      <ul class="flex flex-col divide-y divide-border">
        <li v-for="line in props.order.lines" :key="line.id" class="flex items-center gap-3 py-3 first:pt-0">
          <NqStoreImage :src="line.image" :alt="line.name" :size="56" />
          <span class="flex min-w-0 flex-1 flex-col">
            <span class="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]">{{ line.name }}</span>
            <span class="text-caption text-muted-foreground">{{ lineMeta(line) }}</span>
          </span>
          <NqStoreAmount :amount="line.unitPrice * line.quantity" :currency="currency" class="text-body-sm" />
        </li>
      </ul>
      <dl class="flex flex-col gap-1.5 border-t border-border pt-3 text-body-sm">
        <div class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
          <dd><NqStoreAmount :amount="totals.subtotal" :currency="currency" /></dd>
        </div>
        <div v-if="totals.discount > 0" class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ t.discount }}</dt>
          <dd class="text-nq-success-text">
            <bdi dir="ltr">−</bdi>
            <NqStoreAmount :amount="totals.discount" :currency="currency" class="text-nq-success-text" />
          </dd>
        </div>
        <div class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ t.shipping }}</dt>
          <dd>
            <span v-if="totals.shipping === 0" class="text-nq-success-text">{{ t.free }}</span>
            <NqStoreAmount v-else :amount="totals.shipping" :currency="currency" />
          </dd>
        </div>
        <div v-if="totals.tax > 0" class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ t.tax }}</dt>
          <dd><NqStoreAmount :amount="totals.tax" :currency="currency" /></dd>
        </div>
        <div v-if="fees > 0" class="flex justify-between gap-3">
          <dt class="text-muted-foreground">{{ t.fees }}</dt>
          <dd><NqStoreAmount :amount="fees" :currency="currency" /></dd>
        </div>
        <div class="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
          <dt class="text-label text-foreground">{{ t.total }}</dt>
          <dd><NqStoreCartMoney :amount="totals.total" :currency="currency" size="lg" /></dd>
        </div>
      </dl>
    </section>

    <section aria-labelledby="order-next" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <h2 id="order-next" class="text-h3 font-semibold text-foreground">{{ t.nextTitle }}</h2>
      <ol class="flex flex-col gap-2">
        <li v-for="(step, i) in steps" :key="step" class="flex items-start gap-3 text-body-sm text-foreground">
          <span aria-hidden="true" class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption text-muted-foreground">
            <NqNum :value="i + 1" />
          </span>
          {{ step }}
        </li>
      </ol>
    </section>

    <div class="flex flex-wrap items-center justify-center gap-3">
      <NqButton v-if="props.onTrackOrder" variant="primary" @click="props.onTrackOrder()">{{ t.trackOrder }}</NqButton>
      <NqButton v-if="props.onContinueShopping" variant="secondary" @click="props.onContinueShopping()">{{ t.continueShopping }}</NqButton>
    </div>
  </div>
</template>
