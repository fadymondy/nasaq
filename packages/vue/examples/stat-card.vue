<script setup lang="ts">
import { NqStatCard, NqStatGrid } from "@fadymondy/nasaq/vue";
import { Wallet } from "lucide-vue-next";
</script>

<template>
  <NqStatGrid>
    <NqStatCard label="Revenue" :value="48210" :format="{ style: 'currency', currency: 'USD', notation: 'compact' }" :delta="0.124" delta-label="vs last month" :sparkline="[18, 24, 21, 30, 28, 36]" sparkline-label="Revenue, last 6 weeks, up 12%">
      <template #icon><Wallet /></template>
    </NqStatCard>
    <NqStatCard label="Refund rate" :value="0.031" :format="{ style: 'percent', maximumFractionDigits: 1 }" :delta="-0.03" invert delta-label="vs last month" />
    <NqStatCard label="Orders" loading />
  </NqStatGrid>
</template>
