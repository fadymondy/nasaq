<script setup lang="ts">
import { NqStockLedger, type StockMovement } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const products = [
  { id: "beans", name: "Coffee beans 250g", sku: "RTL-001", unit: "pcs", reorderPoint: 12 },
  { id: "filter", name: "Paper filters", sku: "RTL-014", unit: "box", reorderPoint: 4 },
];
const warehouses = [
  { id: "ruh", name: "Riyadh", code: "RUH" },
  { id: "jed", name: "Jeddah", code: "JED" },
];
const movements = ref<StockMovement[]>([
  { id: "m1", date: "2026-09-01", productId: "beans", warehouseId: "ruh", type: "receive", quantity: 40, reference: "PO-2041" },
  { id: "m2", date: "2026-09-05", productId: "beans", warehouseId: "ruh", type: "issue", quantity: -8, reference: "SO-5520" },
  { id: "m3", date: "2026-09-08", productId: "beans", warehouseId: "jed", type: "receive", quantity: 10, reference: "PO-2043" },
  { id: "m4", date: "2026-09-10", productId: "filter", warehouseId: "ruh", type: "receive", quantity: 3, reference: "PO-2044" },
]);

async function onRecord(added: StockMovement[]) {
  movements.value = [...movements.value, ...added];
}
</script>

<template>
  <NqStockLedger :products="products" :warehouses="warehouses" :movements="movements" :on-record="onRecord" />
</template>
