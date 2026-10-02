<script setup lang="ts">
import { ArrowLeft, Ban, FileText, Mail, MapPin, PackageCheck, Phone, Printer, Truck, Undo2 } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqAlertDialog, NqAlertDialogAction, NqAlertDialogCancel, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardAction, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqDateTime, NqNum } from "../numeric";
import { NqStoreOrderTimeline } from "../store-order-timeline";
import type { StoreOrderDocumentKind } from "./NqStoreOrdersList.vue";
import NqStoreAddress from "./NqStoreAddress.vue";
import NqStoreFulfilDialog from "./NqStoreFulfilDialog.vue";
import NqStoreFulfilmentBadge from "./NqStoreFulfilmentBadge.vue";
import NqStoreMoney from "./NqStoreMoney.vue";
import NqStoreOrderStatusBadge from "./NqStoreOrderStatusBadge.vue";
import NqStorePaymentBadge from "./NqStorePaymentBadge.vue";
import NqStoreRefundDialog from "./NqStoreRefundDialog.vue";
import type { StoreOrderChange } from "./detail-types";
import {
  type ApplyMeta,
  applyCancel,
  applyFulfilment,
  applyNote,
  applyRefund,
  canCancel,
  canRefund,
  fulfilmentProgress,
  lineFulfilled,
  lineOutstanding,
  lineRefunded,
  paymentSummary,
  planCancel,
} from "./order-math";
import type { CommerceOrder, RefundRecord } from "./order-types";
import { useStoreAdminStrings, type StoreAdminLabels } from "./strings";

// One order in the store admin: its lines and money, customer, address and payment cards, and the actions that change
// it: ship some or all of it with tracking, refund by line or by amount, cancel, and add notes to the timeline.
const props = withDefaults(
  defineProps<{
    order: CommerceOrder;
    /** Refunds already made, oldest first. */
    refunds?: readonly RefundRecord[];
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    /** Called with the updated order after a shipment, refund, cancel or note. You store it. */
    onChange?: (change: StoreOrderChange) => void;
    onBack?: () => void;
    onPrint?: (document: StoreOrderDocumentKind) => void;
    /** Who is acting, written on the timeline. */
    actor?: string;
    /** Carriers offered when shipping. */
    carriers?: readonly string[];
    trackingTemplate?: string;
    /** Timestamp source for new events. Default: now. */
    now?: () => string;
    labels?: StoreAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { refunds: () => [], carriers: () => ["Bosta", "Aramex", "DHL", "Egypt Post"], now: () => new Date().toISOString() },
);

const currency = useCurrency(() => props.currency);
const { t } = useStoreAdminStrings(() => props.labels);
const dialog = ref<"fulfil" | "refund" | "cancel" | null>(null);
const setDialog = (name: "fulfil" | "refund" | "cancel") => (o: boolean) => (dialog.value = o ? name : dialog.value === name ? null : dialog.value);

const summary = computed(() => paymentSummary(props.order, props.refunds));
const progress = computed(() => fulfilmentProgress(props.order.lines));
const cancellable = computed(() => canCancel(props.order));
const refundable = computed(() => canRefund(props.order, props.refunds));
const shippable = computed(() => props.order.lines.some((l) => lineOutstanding(l) > 0) && !["cancelled", "refunded", "returned"].includes(props.order.status) && props.order.payment !== "failed");
const cancelPlan = computed(() => planCancel(props.order, props.refunds));
const meta = (label: string, note?: string): ApplyMeta => ({ at: props.now(), label, ...(props.actor ? { by: props.actor } : {}), ...(note ? { note } : {}) });

const addNote = (note: string) => props.onChange?.({ order: applyNote(props.order, meta(t.value.noteAdded, note)), refunds: [...props.refunds] });
const noteListener = computed(() => (props.onChange ? { onAddNote: addNote } : {}));

function confirmFulfil(plan: Parameters<typeof applyFulfilment>[1], tracking?: { carrier: string; number: string }) {
  props.onChange?.({ order: applyFulfilment(props.order, plan, meta(plan.completes ? t.value.shippedAll : t.value.shippedSome, tracking ? `${tracking.carrier} ${tracking.number}` : undefined), tracking), refunds: [...props.refunds] });
  dialog.value = null;
}
function confirmRefund(plan: Parameters<typeof applyRefund>[2]) {
  const next = applyRefund(props.order, props.refunds, plan, meta(t.value.refundIssued));
  props.onChange?.({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
  dialog.value = null;
}
function confirmCancel() {
  const plan = cancelPlan.value;
  const next = applyCancel(props.order, props.refunds, meta(t.value.cancelled));
  props.onChange?.({ ...next, ...(plan.restock.length ? { restock: plan.restock } : {}) });
}
const trackUrl = computed(() => {
  const tr = props.order.tracking;
  if (!tr) return undefined;
  return tr.url ?? (props.trackingTemplate ? props.trackingTemplate.replace("{number}", encodeURIComponent(tr.number)) : undefined);
});
</script>

<template>
  <div data-slot="store-order-detail" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 flex-col gap-2">
        <NqButton v-if="props.onBack" variant="ghost" size="sm" class="-ms-2 w-fit" @click="props.onBack?.()">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.backToOrders }}
        </NqButton>
        <div class="flex flex-wrap items-center gap-2">
          <h1 class="text-h2 font-semibold text-foreground">{{ order.number }}</h1>
          <NqStoreOrderStatusBadge :status="order.status" />
          <NqStorePaymentBadge :payment="order.payment" />
          <NqStoreFulfilmentBadge :order="order" />
        </div>
        <p class="text-body-sm text-muted-foreground">
          {{ t.placedOn }} <NqDateTime :value="order.placedAt" :format="{ dateStyle: 'long', timeStyle: 'short' }" />
        </p>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <NqButton variant="secondary" size="sm" @click="props.onPrint?.('packing-slip')">
          <Truck aria-hidden="true" />
          {{ t.packingSlip }}
        </NqButton>
        <NqButton variant="secondary" size="sm" @click="props.onPrint?.('invoice')">
          <Printer aria-hidden="true" />
          {{ t.invoice }}
        </NqButton>
        <NqButton variant="secondary" size="sm" :disabled="!cancellable" :title="cancellable ? undefined : t.cannotCancel" @click="dialog = 'cancel'">
          <Ban aria-hidden="true" />
          {{ t.cancelOrder }}
        </NqButton>
        <NqButton variant="secondary" size="sm" :disabled="!refundable" @click="dialog = 'refund'">
          <Undo2 aria-hidden="true" />
          {{ t.refund }}
        </NqButton>
        <NqButton variant="primary" size="sm" :disabled="!shippable" @click="dialog = 'fulfil'">
          <PackageCheck aria-hidden="true" />
          {{ t.fulfil }}
        </NqButton>
      </div>
    </header>

    <NqAlert v-if="order.payment === 'pending'" tone="warning" :title="t.unpaidTitle">{{ t.unpaidText }}</NqAlert>

    <div class="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div class="flex min-w-0 flex-col gap-4">
        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h2">{{ t.items }}</NqCardTitle>
            <NqCardAction class="text-body-sm text-muted-foreground">{{ t.shippedOf(progress.shipped, progress.total) }}</NqCardAction>
          </NqCardHeader>
          <NqCardContent class="flex flex-col">
            <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
              <li v-for="line in order.lines" :key="line.id" class="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <img v-if="line.image" :src="line.image" alt="" class="size-14 shrink-0 rounded-control border border-border bg-secondary object-cover" />
                <span v-else aria-hidden="true" class="size-14 shrink-0 rounded-control border border-border bg-secondary" />
                <div class="flex min-w-0 flex-1 basis-40 flex-col gap-1">
                  <span class="truncate text-body-sm font-medium text-foreground">{{ line.name }}</span>
                  <span v-if="line.variantLabel" class="text-caption text-muted-foreground">{{ line.variantLabel }}</span>
                  <span class="flex flex-wrap gap-1.5">
                    <NqBadge v-if="lineFulfilled(line) > 0" variant="success">{{ t.shippedCount(lineFulfilled(line)) }}</NqBadge>
                    <NqBadge v-if="lineOutstanding(line) > 0" variant="warning">{{ t.toShipCount(lineOutstanding(line)) }}</NqBadge>
                    <NqBadge v-if="lineRefunded(line) > 0" variant="neutral">{{ t.refundedCount(lineRefunded(line)) }}</NqBadge>
                  </span>
                </div>
                <div class="flex shrink-0 items-baseline gap-2 text-body-sm text-muted-foreground">
                  <NqStoreMoney :amount="line.unitPrice" :currency="currency" />
                  <span aria-hidden="true">×</span>
                  <NqNum :value="line.quantity" />
                </div>
                <NqStoreMoney :amount="line.unitPrice * line.quantity" :currency="currency" class="w-24 shrink-0 text-end text-body-sm font-medium text-foreground" />
              </li>
            </ul>
          </NqCardContent>
        </NqCard>

        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h2">{{ t.payment }}</NqCardTitle>
            <NqCardAction><NqStorePaymentBadge :payment="order.payment" /></NqCardAction>
          </NqCardHeader>
          <NqCardContent>
            <dl class="m-0 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-body-sm">
              <dt class="text-muted-foreground">{{ t.subtotal }}</dt>
              <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.subtotal" :currency="currency" /></dd>
              <template v-if="order.totals.discount > 0">
                <dt class="text-muted-foreground">{{ t.discount }}</dt>
                <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.discount" :currency="currency" negative /></dd>
              </template>
              <dt class="text-muted-foreground">{{ t.shipping }}{{ order.shippingMethod ? ` (${order.shippingMethod.label})` : "" }}</dt>
              <dd class="m-0 text-end">
                <NqStoreMoney v-if="order.totals.shipping > 0" :amount="order.totals.shipping" :currency="currency" />
                <template v-else>{{ t.free }}</template>
              </dd>
              <template v-if="order.totals.tax > 0">
                <dt class="text-muted-foreground">{{ t.tax }}</dt>
                <dd class="m-0 text-end"><NqStoreMoney :amount="order.totals.tax" :currency="currency" /></dd>
              </template>
              <dt class="border-t border-border pt-2 font-medium text-foreground">{{ t.total }}</dt>
              <dd class="m-0 border-t border-border pt-2 text-end font-semibold text-foreground"><NqStoreMoney :amount="summary.total" :currency="currency" /></dd>
              <template v-if="summary.refunded > 0">
                <dt class="text-muted-foreground">{{ t.refunded }}</dt>
                <dd class="m-0 text-end"><NqStoreMoney :amount="summary.refunded" :currency="currency" negative /></dd>
                <dt class="font-medium text-foreground">{{ t.netPaid }}</dt>
                <dd class="m-0 text-end font-medium"><NqStoreMoney :amount="summary.net" :currency="currency" /></dd>
              </template>
              <template v-if="summary.due > 0">
                <dt class="font-medium text-foreground">{{ t.due }}</dt>
                <dd class="m-0 text-end font-medium"><NqStoreMoney :amount="summary.due" :currency="currency" /></dd>
              </template>
            </dl>
            <ul v-if="refunds.length" class="m-0 mt-3 flex list-none flex-col gap-1 border-t border-border p-0 pt-3 text-caption text-muted-foreground">
              <li v-for="(r, i) in refunds" :key="r.id ?? i" class="flex flex-wrap justify-between gap-2">
                <span>
                  <NqDateTime v-if="r.at" :value="r.at" :format="{ dateStyle: 'medium' }" /><template v-else>{{ t.refunded }}</template>{{ r.note && r.note !== "cancel" ? ` · ${r.note}` : "" }}{{ r.restock ? ` · ${t.restocked}` : "" }}
                </span>
                <NqStoreMoney :amount="r.amount" :currency="currency" negative />
              </li>
            </ul>
          </NqCardContent>
        </NqCard>

        <NqCard>
          <NqCardHeader>
            <NqCardTitle as="h2">{{ t.timeline }}</NqCardTitle>
          </NqCardHeader>
          <NqCardContent>
            <NqStoreOrderTimeline variant="activity" :status="order.status" :payment="order.payment" :events="order.events" v-bind="noteListener" />
          </NqCardContent>
        </NqCard>
      </div>

      <aside class="flex min-w-0 flex-col gap-4">
        <NqCard>
          <NqCardHeader><NqCardTitle as="h3">{{ t.customer }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="flex flex-col gap-2">
            <span class="text-body-sm font-medium text-foreground">{{ order.customer.name }}</span>
            <a v-if="order.customer.email" :href="`mailto:${order.customer.email}`" dir="ltr" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
              <Mail aria-hidden="true" class="size-3.5" />
              <span class="text-start">{{ order.customer.email }}</span>
            </a>
            <a v-if="order.customer.phone" :href="`tel:${order.customer.phone}`" dir="ltr" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground hover:text-foreground">
              <Phone aria-hidden="true" class="size-3.5" />
              <span class="text-start">{{ order.customer.phone }}</span>
            </a>
          </NqCardContent>
        </NqCard>
        <NqCard>
          <NqCardHeader><NqCardTitle as="h3">{{ t.shippingAddress }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="flex flex-col gap-2">
            <NqStoreAddress :address="order.shippingAddress" :fallback="t.noAddress" />
            <span v-if="order.shippingMethod" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
              <MapPin aria-hidden="true" class="size-3.5" />
              {{ order.shippingMethod.label }}
            </span>
          </NqCardContent>
        </NqCard>
        <NqCard>
          <NqCardHeader><NqCardTitle as="h3">{{ t.billingAddress }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="flex flex-col gap-2">
            <NqStoreAddress :address="order.billingAddress" :fallback="t.sameAsShipping" />
          </NqCardContent>
        </NqCard>
        <NqCard>
          <NqCardHeader><NqCardTitle as="h3">{{ t.shipment }}</NqCardTitle></NqCardHeader>
          <NqCardContent class="flex flex-col gap-2">
            <template v-if="order.tracking">
              <span class="text-body-sm text-foreground">{{ order.tracking.carrier }}</span>
              <bdi dir="ltr" class="text-start font-mono text-body-sm text-muted-foreground">{{ order.tracking.number }}</bdi>
              <a v-if="trackUrl" :href="trackUrl" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1.5 text-body-sm text-foreground underline underline-offset-4">
                <FileText aria-hidden="true" class="size-3.5" />
                {{ t.trackShipment }}
              </a>
            </template>
            <p v-else class="text-body-sm text-muted-foreground">{{ t.noTracking }}</p>
          </NqCardContent>
        </NqCard>
      </aside>
    </div>

    <NqStoreFulfilDialog :open="dialog === 'fulfil'" :order="order" :carriers="props.carriers" :t="t" @update:open="setDialog('fulfil')" @confirm="confirmFulfil" />
    <NqStoreRefundDialog :open="dialog === 'refund'" :order="order" :refunds="props.refunds" :currency="currency" :t="t" @update:open="setDialog('refund')" @confirm="confirmRefund" />
    <NqAlertDialog :open="dialog === 'cancel'" @update:open="setDialog('cancel')">
      <NqAlertDialogContent>
        <NqAlertDialogHeader>
          <NqAlertDialogTitle>{{ t.cancelTitle(order.number) }}</NqAlertDialogTitle>
          <NqAlertDialogDescription>
            <template v-if="cancelPlan.refundAmount > 0">{{ t.cancelRefunds }} <NqStoreMoney :amount="cancelPlan.refundAmount" :currency="currency" />.</template>
            <template v-else>{{ t.cancelNoRefund }}</template>
          </NqAlertDialogDescription>
        </NqAlertDialogHeader>
        <NqAlertDialogFooter>
          <NqAlertDialogCancel>{{ t.keepOrder }}</NqAlertDialogCancel>
          <NqAlertDialogAction variant="danger" @click="confirmCancel">{{ t.cancelOrder }}</NqAlertDialogAction>
        </NqAlertDialogFooter>
      </NqAlertDialogContent>
    </NqAlertDialog>
  </div>
</template>
