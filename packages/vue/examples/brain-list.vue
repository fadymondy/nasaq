<script setup lang="ts">
import { NqBrainList, type BrainSummary } from "@fadymondy/nasaq/vue";

const brains: BrainSummary[] = [
  { id: "1", name: "Company handbook", description: "Policies and guides.", avatar: "📘", status: "ready", visibility: "team", memories: 1842, sources: 6, chats: 412 },
];
</script>

<template>
  <NqBrainList :brains="brains" :on-row-click="(b: BrainSummary) => console.log(b.id)" />
</template>
