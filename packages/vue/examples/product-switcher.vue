<script setup lang="ts">
import { NqAppHeader, NqProductSwitcher, type Product } from "@fadymondy/nasaq/vue";

const products: Product[] = [
  { id: "mahaam", brand: "mahaam", name: "Mahaam", href: "https://mahaam.app", pinned: true },
  { id: "zekra", brand: "zekra", name: "Zekra", href: "https://zekra.dev", pinned: true },
  { id: "nasaq", brand: "nasaq", name: "Nasaq", href: "https://nasaq.fadymondy.com" },
];
</script>

<template>
  <NqAppHeader>
    <div class="ms-auto">
      <NqProductSwitcher :products="products" current="mahaam" all-href="/apps" />
    </div>
  </NqAppHeader>
</template>
