<script setup lang="ts">
import { NqBarcode } from "@fadymondy/nasaq/vue";

const sku = "NSQ-2026-0042";
</script>

<template>
  <NqBarcode :value="sku" format="CODE128" downloadable :download-name="sku" />
</template>
