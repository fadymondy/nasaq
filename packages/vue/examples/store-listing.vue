<script setup lang="ts">
import { NqStoreListing, EMPTY_LISTING_FILTERS, type CommerceProduct, type CommerceCategoryNode } from "@fadymondy/nasaq/vue";

const products: CommerceProduct[] = [
  { id: "tee", name: "Everyday tee", brand: "Nasaq Goods", category: "Clothing", images: [], options: [], variants: [{ id: "tee-1", options: {}, price: 2900, stock: 8 }] },
  { id: "hoodie", name: "Zip hoodie", brand: "Nasaq Goods", category: "Clothing", images: [], options: [], variants: [{ id: "hoodie-1", options: {}, price: 6900, compareAt: 8900, stock: 3 }] },
  { id: "cap", name: "Canvas cap", brand: "Atlas", category: "Clothing", images: [], options: [], variants: [{ id: "cap-1", options: {}, price: 1900, stock: 0 }] },
];
const tree = [{ id: "Clothing", label: "Clothing" }];
const defaultFilters = { ...EMPTY_LISTING_FILTERS, category: "Clothing" };
const addToCart = (_p: CommerceProduct, variant: { id: string }, qty: number) => console.log("add", variant.id, qty);
</script>

<template>
  <NqStoreListing title="Clothing" :products="products" currency="USD" :category-tree="tree" :default-filters="defaultFilters" compare @add-to-cart="addToCart" />
</template>
