<script setup lang="ts">
import { NqKnowledgeGaps, type KnowledgeGap } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const gaps = ref<KnowledgeGap[]>([
  { id: "g1", query: "Do you ship to Jeddah?", hits: 14, firstSeen: "2026-09-01T09:00:00Z", lastSeen: "2026-09-28T12:00:00Z", status: "open" },
  { id: "g2", query: "What is the refund window?", hits: 6, firstSeen: "2026-09-10T09:00:00Z", lastSeen: "2026-09-25T12:00:00Z", status: "indexed", resolution: "Added to the returns policy." },
  { id: "g3", query: "asdf test", hits: 1, firstSeen: "2026-09-12T09:00:00Z", lastSeen: "2026-09-12T09:30:00Z", status: "dismissed" },
]);

async function resolve(gap: KnowledgeGap, status: KnowledgeGap["status"]) {
  gaps.value = gaps.value.map((g) => (g.id === gap.id ? { ...g, status } : g));
}
</script>

<template>
  <NqKnowledgeGaps :gaps="gaps" :on-resolve="resolve" />
</template>
