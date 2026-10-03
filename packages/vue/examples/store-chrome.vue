<script setup lang="ts">
import { ref } from "vue";
import {
  NqStoreAnnouncementBar,
  NqStoreFooter,
  NqStoreHeader,
  type CommerceProduct,
  type StoreNavItem,
} from "@fadymondy/nasaq/vue";

const products: CommerceProduct[] = [
  { id: "tee", name: "Everyday tee", brand: "Nasaq Goods", category: "tops", images: [], options: [], variants: [{ id: "tee-1", options: {}, price: 2900, stock: 8 }] },
  { id: "hoodie", name: "Zip hoodie", brand: "Nasaq Goods", category: "tops", images: [], options: [], variants: [{ id: "hoodie-1", options: {}, price: 6900, stock: 3 }] },
  { id: "belt", name: "Leather belt", brand: "Atlas", category: "accessories", images: [], options: [], variants: [{ id: "belt-1", options: {}, price: 3400, stock: 9 }] },
];
const tree = [{ id: "tops", label: "Tops" }, { id: "accessories", label: "Accessories" }];
const nav: StoreNavItem[] = [
  {
    id: "women",
    label: "Women",
    href: "/women",
    columns: [
      { title: "Clothing", links: [{ label: "Tops", href: "/women/tops", badge: "New" }, { label: "Dresses", href: "/women/dresses" }], viewAll: { label: "View all clothing", href: "/women/clothing" } },
      { title: "Accessories", links: [{ label: "Belts", href: "/women/belts" }, { label: "Scarves", href: "/women/scarves" }] },
    ],
    featured: { title: "Spring edit", description: "Light layers for warmer days.", href: "/spring" },
  },
  { id: "men", label: "Men", href: "/men" },
  { id: "sale", label: "Sale", href: "/sale", highlight: true },
];
const query = ref("");
const language = ref("en");
const currency = ref("USD");
const subscribe = async (_email: string) => {};
const announcements = [
  { id: "ship", content: "Free shipping on orders over $50" },
  { id: "returns", content: "30-day returns on everything", href: "/returns" },
];
</script>

<template>
  <div>
    <NqStoreHeader
      :nav="nav"
      :search="{ products, categoryTree: tree, currency: 'USD', popular: ['tee', 'hoodie'], modelValue: query, 'onUpdate:modelValue': (v: string) => (query = v) }"
      :cart-count="2"
      cart-button
      :wishlist-count="1"
      account-button
    >
      <template #announcement><NqStoreAnnouncementBar :items="announcements" /></template>
      <template #brand>Nasaq Goods</template>
    </NqStoreHeader>
    <NqStoreFooter
      v-model:language="language"
      v-model:currency="currency"
      :columns="[{ title: 'Help', links: [{ label: 'Shipping', href: '/shipping' }, { label: 'Returns', href: '/returns' }] }]"
      :on-subscribe="subscribe"
      :social="[{ label: 'Instagram', href: 'https://instagram.com/nasaq' }]"
      :languages="[{ value: 'en', label: 'English' }, { value: 'ar', label: 'العربية' }]"
      :currencies="[{ value: 'USD', label: 'USD' }, { value: 'SAR', label: 'SAR' }]"
    >
      <template #brand>Nasaq Goods</template>
      <template #tagline>Everyday basics, made to last.</template>
      <template #payments><span class="text-caption">Visa</span><span class="text-caption">Mada</span></template>
      <template #legal>© 2026 Nasaq Goods. All rights reserved.</template>
    </NqStoreFooter>
  </div>
</template>
