<script setup lang="ts">
import { NqStoreOrderDetail, NqStoreOrdersList, type StoreAdminOrder, type StoreRefundRecord } from "@fadymondy/nasaq/vue";
import { computed, ref } from "vue";

const orders = ref<StoreAdminOrder[]>([
  {
    id: "o1",
    number: "#1042",
    placedAt: "2026-09-27T10:15:00Z",
    status: "paid",
    payment: "paid",
    customer: { name: "Mona Salem", email: "mona@example.com", phone: "+966 50 123 4567" },
    lines: [
      { id: "l1", productId: "p1", variantId: "v1", name: "Coffee beans 250g", unitPrice: 1800, quantity: 2 },
      { id: "l2", productId: "p2", variantId: "v2", name: "Paper filters", unitPrice: 600, quantity: 1 },
    ],
    shippingAddress: { name: "Mona Salem", line1: "12 Olaya St", city: "Riyadh", country: "SA" },
    totals: { subtotal: 4200, discount: 0, shipping: 500, tax: 0, total: 4700, itemCount: 3, savings: 0 },
  },
  {
    id: "o2",
    number: "#1041",
    placedAt: "2026-09-26T08:00:00Z",
    status: "pending",
    payment: "pending",
    customer: { name: "Omar Haddad", email: "omar@example.com" },
    lines: [{ id: "l3", productId: "p1", variantId: "v1", name: "Coffee beans 250g", unitPrice: 1800, quantity: 1 }],
    totals: { subtotal: 1800, discount: 0, shipping: 0, tax: 0, total: 1800, itemCount: 1, savings: 0 },
  },
]);
const refunds = ref<Record<string, StoreRefundRecord[]>>({});
const open = ref<string | null>(null);
const order = computed(() => orders.value.find((o) => o.id === open.value));
</script>

<template>
  <NqStoreOrderDetail
    v-if="order"
    :order="order"
    :refunds="refunds[order.id] ?? []"
    currency="USD"
    actor="Mona"
    :on-back="() => (open = null)"
    :on-change="
      (next) => {
        orders = orders.map((o) => (o.id === next.order.id ? next.order : o));
        refunds = { ...refunds, [next.order.id]: next.refunds };
      }
    "
  />
  <NqStoreOrdersList v-else :orders="orders" currency="USD" :on-open-order="(o) => (open = o.id)" />
</template>
