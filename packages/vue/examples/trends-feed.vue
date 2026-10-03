<script setup lang="ts">
import { NqTrendsFeed, type TrendTopic } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const next = { save: "saved", review: "reviewed", dismiss: "dismissed", restore: "new" } as const;
const topics = ref<TrendTopic[]>([
  {
    id: "t1",
    title: "Saudi tourism visas go digital",
    score: 86,
    reasons: ["Mentioned by 6 outlets", "Up 340% since yesterday"],
    outlets: [{ id: "o1", name: "Asharq" }],
    items: [{ id: "i1", title: "New e-visa launches", outlet: "Asharq", publishedAt: "2026-09-29T07:00:00Z" }],
    detectedAt: "2026-09-29T06:00:00Z",
    state: "new",
  },
]);

async function onAction(topic: TrendTopic, action: keyof typeof next) {
  topics.value = topics.value.map((t) => (t.id === topic.id ? { ...t, state: next[action] } : t));
}
</script>

<template>
  <NqTrendsFeed :topics="topics" time-zone="Asia/Riyadh" :on-action="onAction" />
</template>
