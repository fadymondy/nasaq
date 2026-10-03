<script setup lang="ts">
import { NqScoreBadge, type ScoreDimension } from "@fadymondy/nasaq/vue";

const dimensions: ScoreDimension[] = [
  { id: "size", label: "Company size", points: 30, maxPoints: 40, reason: "51 to 200 employees", sources: [{ label: "LinkedIn", url: "https://example.com" }] },
  { id: "intent", label: "Intent", points: 42, maxPoints: 60, reason: "Visited pricing twice", inferred: true },
];
</script>

<template>
  <NqScoreBadge :score="72" :confidence="0.8" ai-generated :dimensions="dimensions" />
</template>
