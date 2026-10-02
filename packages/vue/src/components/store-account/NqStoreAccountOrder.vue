<script setup lang="ts">
import { ArrowLeft, Package, RotateCcw, Undo2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, NqNum } from "../numeric";
import { ORDER_STATUS_LABEL, ORDER_STATUS_VARIANT } from "../store-order-timeline/order-labels";
import NqStoreOrderTimeline from "../store-order-timeline/NqStoreOrderTimeline.vue";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { reorderPlan, type ReorderPlan } from "./account-logic";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import { lineFulfilled, lineRefunded, type CommerceOrder, type CommerceProduct } from "./commerce";
import NqStoreReorderNotice from "./NqStoreReorderNotice.vue";
import NqStoreReturnStatus from "./NqStoreReturnStatus.vue";
import { deliveredAt, returnWindow, returnableLines, type ReturnRequest } from "./return-math";

// One order in the customer's account: the tracking timeline with a carrier link, the items with what shipped or was
// refunded, the totals, the address, and any returns with their RMA status.
const props = withDefaults(
  defineProps<{
    order: CommerceOrder;
    /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
    currency?: string;
    requests?: readonly ReturnRequest[];
    products?: readonly CommerceProduct[];
    /** Carrier link template with `{number}`. */
    trackingTemplate?: string;
    /** Days after delivery a return can be requested. Default 30. */
    returnDays?: number;
    /** Reference time for the return window. Default: now. */
    now?: number | Date;
    onBack?: () => void;
    onReorder?: (order: CommerceOrder, plan: ReorderPlan) => void;
    onOpenCart?: () => void;
    onReturn?: (order: CommerceOrder) => void;
    onCancelReturn?: (request: ReturnRequest) => void;
    labels?: StoreAccountLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { requests: () => [], products: () => [], returnDays: 30, now: undefined },
);

const currency = useCurrency(() => props.currency);
const { t, ar } = useStoreAccountStrings(() => props.labels);
const notice = ref<ReorderPlan | null>(null);
const clock = Date.now();
const mine = computed(() => props.requests.filter((r) => r.orderId === props.order.id));
const delivered = computed(() => deliveredAt(props.order));
const win = computed(() => returnWindow(delivered.value, props.returnDays, props.now ?? clock));
const anyReturnable = computed(() => returnableLines(props.order, props.requests).some((r) => r.returnable > 0));
const canReturn = computed(() => win.value.open && anyReturnable.value && !!props.onReturn);
const lang = computed(() => (ar.value ? "ar" : "en"));
const address = computed(() => props.order.shippingAddress);

function reorder() {
  const plan = reorderPlan(props.order, props.products);
  notice.value = plan;
  if (plan.add.length) props.onReorder?.(props.order, plan);
}
</script>

<template>
  <div data-slot="store-account-order" :class="cn('flex min-w-0 flex-col gap-5', props.class)">
    <NqButton v-if="props.onBack" variant="ghost" size="sm" class="self-start" @click="props.onBack()">
      <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
      {{ t.backToOrders }}
    </NqButton>

    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-1">
        <h2 class="m-0 text-h3 font-semibold">{{ t.order }} <bdi>{{ props.order.number }}</bdi></h2>
        <span class="text-body-sm text-muted-foreground">{{ t.placedOn }} <NqDateTime :value="props.order.placedAt" :format="{ dateStyle: 'long' }" /></span>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NqBadge :variant="ORDER_STATUS_VARIANT[props.order.status]">{{ ORDER_STATUS_LABEL[props.order.status][lang] }}</NqBadge>
        <NqButton size="sm" variant="secondary" @click="reorder">
          <RotateCcw aria-hidden="true" />
          {{ t.orderAgain }}
        </NqButton>
        <NqButton v-if="canReturn" size="sm" variant="secondary" @click="props.onReturn?.(props.order)">
          <Undo2 aria-hidden="true" />
          {{ t.returnItems }}
        </NqButton>
      </div>
    </header>

    <NqStoreReorderNotice v-if="notice" :plan="notice" :t="t" :on-open-cart="props.onOpenCart" />

    <section class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <h3 class="m-0 text-label font-semibold">{{ t.progress }}</h3>
      <NqStoreOrderTimeline variant="tracking" :status="props.order.status" :payment="props.order.payment" :placed-at="props.order.placedAt" :events="props.order.events" :tracking="props.order.tracking" :tracking-template="props.trackingTemplate" />
    </section>

    <section class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
      <h3 class="m-0 text-label font-semibold">{{ t.itemsOrdered }}</h3>
      <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
        <li v-for="line in props.order.lines" :key="line.id" class="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
          <span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
            <img v-if="line.image" :src="line.image" alt="" class="size-full object-cover" />
            <Package v-else aria-hidden="true" class="size-6 text-muted-foreground" />
          </span>
          <div class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate font-medium">{{ line.name }}</span>
            <span v-if="line.variantLabel" class="truncate text-body-sm text-muted-foreground">{{ line.variantLabel }}</span>
            <span class="flex flex-wrap gap-1">
              <NqBadge v-if="lineFulfilled(line) > 0 && lineFulfilled(line) < line.quantity" variant="info">{{ t.shippedQty(lineFulfilled(line)) }}</NqBadge>
              <NqBadge v-if="lineRefunded(line) > 0" variant="neutral">{{ t.refundedQty(lineRefunded(line)) }}</NqBadge>
            </span>
          </div>
          <div class="flex shrink-0 flex-col items-end text-body-sm">
            <NqStoreMoney :amount="line.unitPrice * line.quantity" :currency="currency" class="font-medium" />
            <span class="text-muted-foreground">{{ t.quantity }} <NqNum :value="line.quantity" /></span>
          </div>
        </li>
      </ul>
      <dl class="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-border pt-3 text-body-sm">
        <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
        <dd class="m-0 text-end"><NqStoreMoney :amount="props.order.totals.subtotal" :currency="currency" /></dd>
        <template v-if="props.order.totals.discount > 0">
          <dt class="text-muted-foreground">{{ t.discount }}</dt>
          <dd class="m-0 text-end"><NqStoreMoney :amount="props.order.totals.discount" :currency="currency" negative /></dd>
        </template>
        <dt class="text-muted-foreground">{{ t.shipping }}</dt>
        <dd class="m-0 text-end">
          <NqStoreMoney v-if="props.order.totals.shipping > 0" :amount="props.order.totals.shipping" :currency="currency" />
          <template v-else>{{ t.free }}</template>
        </dd>
        <template v-if="props.order.totals.tax > 0">
          <dt class="text-muted-foreground">{{ t.tax }}</dt>
          <dd class="m-0 text-end"><NqStoreMoney :amount="props.order.totals.tax" :currency="currency" /></dd>
        </template>
        <dt class="font-semibold">{{ t.paid }}</dt>
        <dd class="m-0 text-end font-semibold"><NqStoreMoney :amount="props.order.totals.total" :currency="currency" /></dd>
      </dl>
    </section>

    <section v-if="address" class="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-body-sm">
      <h3 class="m-0 mb-1 text-label font-semibold">{{ t.shippingAddress }}</h3>
      <address class="flex flex-col not-italic">
        <span class="font-medium">{{ address.name }}</span>
        <span>{{ address.line1 }}</span>
        <span v-if="address.line2">{{ address.line2 }}</span>
        <span>{{ [address.region, address.city].filter(Boolean).join(ar ? "، " : ", ") }}</span>
        <bdi v-if="address.phone" dir="ltr" class="text-start text-muted-foreground">{{ address.phone }}</bdi>
      </address>
    </section>

    <section class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h3 class="m-0 text-label font-semibold">{{ t.returnsTitle }}</h3>
        <span class="text-body-sm text-muted-foreground">{{ !delivered ? t.returnNotYet : win.open ? t.returnDaysLeft(win.daysLeft) : t.returnClosed }}</span>
      </div>
      <p v-if="mine.length === 0" class="m-0 text-body-sm text-muted-foreground">{{ t.noReturnsYet }}</p>
      <template v-else>
        <NqStoreReturnStatus v-for="r in mine" :key="r.id" :request="r" :order="props.order" :currency="currency" :on-cancel="props.onCancelReturn" :labels="props.labels" />
      </template>
    </section>
  </div>
</template>
