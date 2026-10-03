<script setup lang="ts">
import { NqSearchPerformanceTable } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqSearchPerformanceTable
    :rows="[{ id: 'q1', label: 'rtl react components', clicks: 420, impressions: 9800, position: 4.2, previousClicks: 380, previousPosition: 5.1 }]"
  />
</template>
