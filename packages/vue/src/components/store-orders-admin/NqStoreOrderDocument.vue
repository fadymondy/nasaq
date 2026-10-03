<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBarcode } from "../barcode";
import { NqDateTime, NqNum } from "../numeric";
import type { StoreOrderDocumentKind } from "./NqStoreOrdersList.vue";
import NqStoreAddress from "./NqStoreAddress.vue";
import NqStoreMoney from "./NqStoreMoney.vue";
import type { StoreDocumentSeller } from "./detail-types";
import { lineFulfilled, lineOutstanding, paymentSummary } from "./order-math";
import type { CommerceOrder, RefundRecord } from "./order-types";
import { useStoreAdminStrings, type StoreAdminLabels } from "./strings";

// One printable sheet: an invoice (prices, totals, refunds, tax number) or a packing slip (what to put in the box, no
// prices). The order number is also a barcode so it can be scanned at the packing bench.
const props = withDefaults(
  defineProps<{
    kind: StoreOrderDocumentKind;
    order: CommerceOrder;
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    seller: StoreDocumentSeller;
    refunds?: readonly RefundRecord[];
    /** Printed under the totals, for example return terms. */
    footer?: string;
    labels?: StoreAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { refunds: () => [] },
);

const currency = useCurrency(() => props.currency);
const { t } = useStoreAdminStrings(() => props.labels);
const invoice = computed(() => props.kind === "invoice");
const summary = computed(() => paymentSummary(props.order, props.refunds));
const rows = computed(() => props.order.lines.filter((l) => invoice.value || lineOutstanding(l) + lineFulfilled(l) > 0));
const packQty = (l: CommerceOrder["lines"][number]) => lineOutstanding(l) + lineFulfilled(l);
</script>

<template>
  <article
    data-slot="store-order-document"
    :data-kind="kind"
    :aria-label="`${invoice ? t.invoice : t.packingSlip} ${order.number}`"
    :class="cn('nq-print-sheet mx-auto flex w-full max-w-[52rem] flex-col gap-6 rounded-card border border-border bg-card p-8 text-foreground', props.class)"
  >
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div class="flex min-w-0 flex-col gap-1">
        <img v-if="seller.logo" :src="seller.logo" alt="" class="mb-1 h-10 w-auto self-start" />
        <span class="text-h3 font-semibold">{{ seller.name }}</span>
        <span v-for="line in seller.lines ?? []" :key="line" class="text-body-sm text-muted-foreground">{{ line }}</span>
        <span v-if="seller.email" dir="ltr" class="text-start text-body-sm text-muted-foreground">{{ seller.email }}</span>
        <span v-if="seller.phone" dir="ltr" class="text-start text-body-sm text-muted-foreground">{{ seller.phone }}</span>
        <span v-if="invoice && seller.taxId" class="text-body-sm text-muted-foreground">{{ t.taxId }}: <bdi dir="ltr">{{ seller.taxId }}</bdi></span>
      </div>
      <div class="flex flex-col items-end gap-1 text-end">
        <h2 class="text-h2 font-semibold">{{ invoice ? t.invoice : t.packingSlip }}</h2>
        <span class="text-body-sm">{{ t.order }} <bdi>{{ order.number }}</bdi></span>
        <span class="text-body-sm text-muted-foreground"><NqDateTime :value="order.placedAt" :format="{ dateStyle: 'long' }" /></span>
        <NqBarcode :value="order.number.replace('#', '')" :height="36" :bar-width="1.5" :margin="0" :show-value="false" :aria-label="`${t.order} ${order.number}`" />
      </div>
    </header>

    <div class="grid gap-4 sm:grid-cols-2">
      <NqStoreAddress :title="t.shipTo" :address="order.shippingAddress" />
      <NqStoreAddress v-if="invoice" :title="t.billTo" :address="order.billingAddress ?? order.shippingAddress" />
      <div v-else class="flex flex-col gap-0.5 text-body-sm">
        <h3 class="text-caption font-semibold uppercase tracking-wide text-muted-foreground">{{ t.shipment }}</h3>
        <span>{{ order.shippingMethod?.label ?? "-" }}</span>
        <bdi v-if="order.tracking" dir="ltr" class="text-start">{{ order.tracking.carrier }} {{ order.tracking.number }}</bdi>
      </div>
    </div>

    <table class="w-full border-collapse text-body-sm">
      <thead>
        <tr class="border-b border-border text-start text-caption uppercase tracking-wide text-muted-foreground">
          <th v-if="!invoice" scope="col" class="w-8 py-2 text-start font-medium"><span class="sr-only">{{ t.packed }}</span></th>
          <th scope="col" class="py-2 text-start font-medium">{{ t.item }}</th>
          <th scope="col" class="py-2 text-end font-medium">{{ invoice ? t.quantity : t.toPack }}</th>
          <template v-if="invoice">
            <th scope="col" class="py-2 text-end font-medium">{{ t.unitPrice }}</th>
            <th scope="col" class="py-2 text-end font-medium">{{ t.total }}</th>
          </template>
        </tr>
      </thead>
      <tbody>
        <tr v-for="line in rows" :key="line.id" class="border-b border-border align-top">
          <td v-if="!invoice" class="py-2"><span aria-hidden="true" class="inline-block size-4 rounded-sm border border-border" /></td>
          <td class="py-2 pe-2">
            <span class="font-medium">{{ line.name }}</span>
            <span v-if="line.variantLabel" class="block text-caption text-muted-foreground">{{ line.variantLabel }}</span>
            <span v-if="line.variantId" dir="ltr" class="block text-start text-caption text-muted-foreground">{{ line.variantId }}</span>
          </td>
          <td class="py-2 text-end"><NqNum :value="invoice ? line.quantity : packQty(line)" /></td>
          <template v-if="invoice">
            <td class="py-2 text-end"><NqStoreMoney :amount="line.unitPrice" :currency="currency" /></td>
            <td class="py-2 text-end"><NqStoreMoney :amount="line.unitPrice * line.quantity" :currency="currency" /></td>
          </template>
        </tr>
      </tbody>
    </table>

    <dl v-if="invoice" class="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-body-sm">
      <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
      <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.subtotal" :currency="currency" /></dd>
      <template v-if="order.totals.discount > 0">
        <dt class="text-muted-foreground">{{ t.discount }}</dt>
        <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.discount" :currency="currency" negative /></dd>
      </template>
      <dt class="text-muted-foreground">{{ t.shipping }}</dt>
      <dd class="m-0 text-end">
        <NqStoreMoney v-if="order.totals.shipping > 0" :amount="order.totals.shipping" :currency="currency" />
        <template v-else>{{ t.free }}</template>
      </dd>
      <template v-if="order.totals.tax > 0">
        <dt class="text-muted-foreground">{{ t.tax }}</dt>
        <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.tax" :currency="currency" /></dd>
      </template>
      <dt class="border-t border-border pt-1 font-semibold">{{ t.total }}</dt>
      <dd class="m-0 border-t border-border pt-1 text-end font-semibold"><NqStoreMoney :amount="summary.total" :currency="currency" /></dd>
      <template v-if="summary.refunded > 0">
        <dt class="text-muted-foreground">{{ t.refunded }}</dt>
        <dd class="m-0 text-end"><NqStoreMoney :amount="summary.refunded" :currency="currency" negative /></dd>
        <dt class="font-semibold">{{ t.netPaid }}</dt>
        <dd class="m-0 text-end font-semibold"><NqStoreMoney :amount="summary.net" :currency="currency" /></dd>
      </template>
      <template v-if="summary.due > 0">
        <dt class="font-semibold">{{ t.due }}</dt>
        <dd class="m-0 text-end font-semibold"><NqStoreMoney :amount="summary.due" :currency="currency" /></dd>
      </template>
    </dl>
    <p v-else class="text-body-sm text-muted-foreground">{{ t.slipNote }}</p>
    <p v-if="footer" class="border-t border-border pt-3 text-caption text-muted-foreground">{{ footer }}</p>
  </article>
</template>
