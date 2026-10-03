<script setup lang="ts">
import { NqCatalogStore, type CatalogCategory, type CatalogItem } from "@fadymondy/nasaq/vue";
import { BarChart3, Wrench } from "lucide-vue-next";

const categories: CatalogCategory[] = [
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "data", label: "Data", icon: BarChart3 },
];
const items: CatalogItem[] = [
  { id: "a", name: "Task runner", summary: "Run scripts on a schedule.", category: "tools", publisher: "Nasaq", installs: 1200, rating: 4.7, ratingCount: 210, version: "1.4.0" },
  { id: "b", name: "Charts Pro", summary: "Dashboards from your data.", category: "data", installs: 9000, price: { amount: 9, period: "month" }, badge: "Official" },
  { id: "c", name: "CSV import", summary: "Bring spreadsheets in.", category: "data", installed: true, installs: 450 },
];

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function install() {
  await wait(800);
}
</script>

<template>
  <NqCatalogStore :items="items" :categories="categories" :on-install="install" :on-uninstall="install" />
</template>
