<script setup lang="ts">
import { NqCupTracker, NqFlaggedEntries, NqFoodCatalogue, NqFoodItemBuilder, NqQuickLogStrip, type FoodCatalogueItem, type FoodFamily, type QuickLogItem } from "@fadymondy/nasaq/vue";
import { Coffee, GlassWater } from "lucide-vue-next";
import { ref } from "vue";

const filled = ref(7);
const families: FoodFamily[] = [
  { id: "caffeine", name: "Caffeine", nameAr: "الكافيين" },
  { id: "dairy", name: "Dairy", nameAr: "الألبان" },
];
const items = ref<FoodCatalogueItem[]>([
  { id: "tea", kind: "drink", name: "Green tea", nameAr: "شاي أخضر", verdict: "safe", verdictSource: "you", pinned: true },
  { id: "coffee", kind: "drink", name: "Espresso", nameAr: "إسبرسو", verdict: "trigger", verdictSource: "clinician", triggerFamilies: ["caffeine"], note: "Not after noon." },
  { id: "yogurt", kind: "food", name: "Yogurt", verdict: "unreviewed", verdictSource: "none" },
]);
const pinned: QuickLogItem[] = [
  { id: "water", name: "Water", nameAr: "ماء", icon: GlassWater },
  { id: "coffee", name: "Espresso", nameAr: "إسبرسو", icon: Coffee },
];

async function remove(item: FoodCatalogueItem) {
  items.value = items.value.filter((i) => i.id !== item.id);
}
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqCupTracker :filled="filled" :total="12" unit-label="250 ml" :on-log="async () => void (filled += 1)" />
    <NqQuickLogStrip :items="pinned" :on-log="async (item) => (item.id === 'coffee' ? { flagged: true } : undefined)" :on-unpin="async () => {}" />
    <NqFoodCatalogue :items="items" :families="families" :on-pin="async () => {}" :on-edit="() => {}" :on-delete="remove" :on-add="() => {}" />
    <NqFoodItemBuilder :families="families" :on-save="async () => {}" />
    <NqFlaggedEntries :entries="[{ id: 'f1', at: '2026-09-29T08:30:00Z', label: 'Espresso', reason: 'Logged after the cut-off time.', area: 'Caffeine' }]" />
  </div>
</template>
