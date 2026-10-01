<script setup lang="ts">
import { NqMetricTiles } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqMetricTiles
    :metrics="[
      { id: 'users', label: 'Users', value: 48210, previous: 42980, sparkline: [4, 6, 5, 9, 8, 12] },
      { id: 'bounce', label: 'Bounce rate', value: 0.388, previous: 0.412, format: { style: 'percent', maximumFractionDigits: 1 }, invert: true },
    ]"
  />
</template>
