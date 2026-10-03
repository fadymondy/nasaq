<script setup lang="ts">
import { NqLineItemEditor, type LineItemEditorLine, type LineItemEditorProduct } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const products: LineItemEditorProduct[] = [{ id: "p1", name: "Coffee beans", sku: "CB-1", price: 6500, taxBps: 1500 }];
const lines = ref<LineItemEditorLine[]>([]);
</script>

<template>
  <NqLineItemEditor v-model="lines" :products="products" currency="SAR" :default-tax-bps="1500" />
</template>
