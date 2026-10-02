<script setup lang="ts">
import { NqBreakdownTable } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqBreakdownTable
    title="Channels"
    dimension-label="Channel"
    value-label="Sessions"
    :rows="[
      { id: 'organic', label: 'Organic Search', value: 28100, previous: 24800 },
      { id: 'direct', label: 'Direct', value: 13400, previous: 14100 },
    ]"
  />
</template>
