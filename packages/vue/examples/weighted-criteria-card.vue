<script setup lang="ts">
import { NqWeightedCriteriaCard, type WeightedCriterion } from "@fadymondy/nasaq/vue";

const criteria: WeightedCriterion[] = [
  { id: "price", label: "Price", weight: "high", enabled: true },
  { id: "support", label: "Support", description: "Arabic support, response time", weight: "medium", enabled: true },
  { id: "speed", label: "Delivery speed", weight: "low", enabled: false },
];

async function accept(_list: WeightedCriterion[]) {
  await new Promise((r) => setTimeout(r, 400));
}
</script>

<template>
  <div class="max-w-xl">
    <NqWeightedCriteriaCard description="I will rank the three vendors with these." :default-criteria="criteria" :on-accept="accept" />
  </div>
</template>
