<script setup lang="ts">
import { NqAiUsageCost, NqTokenCostMeter } from "@fadymondy/nasaq/vue";

const days = [
  { date: "2026-09-26", billed: 8.2, unbilled: 0 },
  { date: "2026-09-27", billed: 12.4, unbilled: 0 },
  { date: "2026-09-28", billed: 3.1, unbilled: 5.6 },
  { date: "2026-09-29", billed: 0, unbilled: 9.1 },
];
const byModel = [
  { id: "opus", label: "Opus 5.5", tokensIn: 2_400_000, tokensOut: 310_000, cost: 21.5, previous: 18.2 },
  { id: "sonnet", label: "Sonnet 5.5", tokensIn: 5_100_000, tokensOut: 720_000, cost: 12.9, previous: 14.1 },
  { id: "haiku", label: "Haiku 4.5", tokensIn: 3_800_000, tokensOut: 410_000, cost: 3.4 },
];
</script>

<template>
  <div class="flex w-full max-w-4xl flex-col gap-8">
    <NqAiUsageCost :days="days" :by-model="byModel" :markup="0.2" :previous-total="30" />
    <NqTokenCostMeter :tokens-in="182000" :tokens-out="24000" :cached="120000" :cost="1.42" :budget="2" class="max-w-md" />
  </div>
</template>
