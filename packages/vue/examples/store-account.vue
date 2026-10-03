<script setup lang="ts">
import {
  NqStoreAccountLayout,
  NqStoreAccountNav,
  NqStoreAccountOrder,
  NqStoreAddressBook,
  NqStoreOrderHistory,
  NqStoreRecentlyViewed,
  NqStoreReturnStatus,
  NqStoreWishlist,
  storeRemoveRecent,
  storeRemoveWishlistItem,
  storeToggleNotify,
  type StoreAccountSection,
} from "@fadymondy/nasaq/vue";
import { computed, ref } from "vue";

const line = (id: string, name: string, unitPrice: number, quantity: number, extra = {}) => ({ id, productId: `p-${id}`, variantId: `v-${id}`, name, unitPrice, quantity, ...extra });
const products = [
  { id: "p-a", name: "Everyday tee", images: [], options: [], variants: [{ id: "v-a", options: {}, price: 2900, stock: 8 }] },
  { id: "p-b", name: "Stoneware mug", images: [], options: [], variants: [{ id: "v-b", options: {}, price: 1800, stock: 0 }] },
  { id: "p-c", name: "Canvas tote", images: [], options: [], variants: [{ id: "v-c", options: {}, price: 2200, stock: 2 }] },
];
const orders = [
  {
    id: "o1",
    number: "#1040",
    placedAt: "2026-09-20T10:00:00Z",
    status: "delivered" as const,
    payment: "paid" as const,
    customer: { name: "Sara" },
    lines: [line("a", "Everyday tee", 2900, 2, { fulfilled: 2 }), line("b", "Stoneware mug", 1800, 1, { fulfilled: 1 })],
    totals: { subtotal: 7600, discount: 0, shipping: 500, tax: 0, total: 8100, itemCount: 3, savings: 0 },
    events: [{ at: "2026-09-25T10:00:00Z", kind: "delivered" as const, label: "Delivered" }],
  },
  {
    id: "o2",
    number: "#1052",
    placedAt: "2026-09-29T09:00:00Z",
    status: "shipped" as const,
    payment: "paid" as const,
    customer: { name: "Sara" },
    lines: [line("c", "Canvas tote", 2200, 1)],
    totals: { subtotal: 2200, discount: 0, shipping: 500, tax: 0, total: 2700, itemCount: 1, savings: 0 },
    tracking: { carrier: "Bosta", number: "BST1042" },
  },
];

const section = ref<StoreAccountSection>("orders");
const open = ref<string | null>(null);
const order = computed(() => orders.find((o) => o.id === open.value));
const wishlist = ref([
  { id: "w1", productId: "p-a", variantId: "v-a", addedAt: "2026-09-01T00:00:00Z", priceWhenSaved: 3400 },
  { id: "w2", productId: "p-b", variantId: "v-b", addedAt: "2026-09-02T00:00:00Z" },
]);
const recent = ref(["p-c", "p-a", "p-b"]);
const addresses = ref([{ id: "home", name: "Sara Ali", phone: "+966 50 123 4567", line1: "12 Palm St", city: "Riyadh", country: "SA", isDefault: true }]);
const request = {
  id: "r1",
  number: "RMA-1001",
  orderId: "o1",
  createdAt: "2026-09-26T10:00:00Z",
  status: "approved" as const,
  lines: [{ lineId: "b", quantity: 1 }],
  reason: "defective" as const,
  refundMethod: "original" as const,
  refundAmount: 1800,
};
</script>

<template>
  <NqStoreAccountLayout>
    <template #nav>
      <NqStoreAccountNav :active="section" :counts="{ wishlist: wishlist.length }" :on-navigate="(s) => ((section = s), (open = null))" />
    </template>
    <template v-if="section === 'orders'">
      <NqStoreAccountOrder v-if="order" :order="order" :products="products" :on-back="() => (open = null)" />
      <NqStoreOrderHistory v-else :orders="orders" :products="products" :on-open-order="(o) => (open = o.id)" />
    </template>
    <NqStoreReturnStatus v-else-if="section === 'returns'" :request="request" :order="orders[0]" />
    <NqStoreWishlist
      v-else-if="section === 'wishlist'"
      :items="wishlist"
      :products="products"
      :on-toggle-notify="(i) => (wishlist = storeToggleNotify(wishlist, i.id))"
      :on-remove="(i) => (wishlist = storeRemoveWishlistItem(wishlist, i.id))"
    />
    <NqStoreAddressBook v-else-if="section === 'addresses'" :addresses="addresses" :on-change="(next) => (addresses = next)" />
    <NqStoreRecentlyViewed v-else :ids="recent" :products="products" :on-remove="(id) => (recent = storeRemoveRecent(recent, id))" :on-clear="() => (recent = [])" />
  </NqStoreAccountLayout>
</template>
