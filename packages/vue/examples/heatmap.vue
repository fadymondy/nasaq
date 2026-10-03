<script setup lang="ts">
import { NqHeatmap } from "@fadymondy/nasaq/vue";

const data = [
  { date: "2026-09-27", count: 3 },
  { date: "2026-09-28", count: 8 },
  { date: "2026-09-29", count: 1 },
];
</script>

<template>
  <NqHeatmap :data="data" to="2026-09-29" label="Commits by day" />
</template>
