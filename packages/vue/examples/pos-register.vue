<script setup lang="ts">
import { NqPosRegister, type PosCloseReport, type PosSale } from "@fadymondy/nasaq/vue";

const products = [{ id: "p1", name: "Espresso", price: 1200, taxBps: 1500, category: "drinks", stock: 40, barcode: "6281000000011" }];
const categories = [{ id: "drinks", label: "Drinks" }];

async function onCheckout(sale: PosSale) {
  console.log("sale", sale.number, sale.totals.total);
}
async function onCloseRegister(report: PosCloseReport) {
  console.log("drawer", report.variance);
}
</script>

<template>
  <NqPosRegister :products="products" :categories="categories" currency="SAR" :default-tax-bps="1500" cashier="Lina" :on-checkout="onCheckout" :on-close-register="onCloseRegister" />
</template>
