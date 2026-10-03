<script setup lang="ts">
import { ArrowLeft, Printer } from "lucide-vue-next";
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import type { StoreOrderDocumentKind } from "./NqStoreOrdersList.vue";
import NqStoreOrderDocument from "./NqStoreOrderDocument.vue";
import { STORE_DOCUMENT_PRINT_CSS, type StoreDocumentSeller } from "./detail-types";
import type { CommerceOrder, RefundRecord } from "./order-types";
import { useStoreAdminStrings, type StoreAdminLabels } from "./strings";

// A preview of one or many documents with a Print button. The print CSS hides this toolbar and everything else on the
// page, and starts each order on its own page.
const props = withDefaults(
  defineProps<{
    orders: readonly CommerceOrder[];
    kind?: StoreOrderDocumentKind;
    /** Defaults to USD, or SAR in Arabic. */
    currency?: string;
    seller: StoreDocumentSeller;
    refunds?: (order: CommerceOrder) => readonly RefundRecord[];
    footer?: string;
    onClose?: () => void;
    labels?: StoreAdminLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { kind: "invoice" },
);

const currency = useCurrency(() => props.currency);
const { t } = useStoreAdminStrings(() => props.labels);
const kind = ref<StoreOrderDocumentKind>(props.kind);
const css = STORE_DOCUMENT_PRINT_CSS;
const print = () => window.print();
</script>

<template>
  <div data-slot="store-order-print-view" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <component :is="'style'">{{ css }}</component>
    <div class="nq-print-hide flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <NqButton v-if="props.onClose" variant="ghost" size="sm" @click="props.onClose?.()">
          <ArrowLeft aria-hidden="true" class="rtl:-scale-x-100" />
          {{ t.back }}
        </NqButton>
        <NqToggleGroup :aria-label="t.document" :model-value="[kind]" @update:model-value="(v: string[]) => v[0] && (kind = v[0] as StoreOrderDocumentKind)">
          <NqToggle value="invoice">{{ t.invoice }}</NqToggle>
          <NqToggle value="packing-slip">{{ t.packingSlip }}</NqToggle>
        </NqToggleGroup>
        <span class="text-body-sm text-muted-foreground">{{ t.documentsCount(orders.length) }}</span>
      </div>
      <NqButton variant="primary" size="sm" @click="print">
        <Printer aria-hidden="true" />
        {{ t.print }}
      </NqButton>
    </div>
    <div class="nq-print-root flex flex-col gap-6">
      <NqStoreOrderDocument v-for="order in orders" :key="order.id" :kind="kind" :order="order" :currency="currency" :seller="seller" :refunds="props.refunds?.(order)" :footer="footer" :labels="labels" />
    </div>
  </div>
</template>
