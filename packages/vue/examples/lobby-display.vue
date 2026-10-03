<script setup lang="ts">
import { NqLobbyDisplay, type QueueEntry } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const t = Date.now();
const base = { checkedInAt: t - 3_600_000 };
const entries = ref<QueueEntry[]>([
  { ...base, id: "a", ticket: "A-014", number: 14, status: "serving", room: "2", queuedAt: t - 1_500_000, calledAt: t - 600_000 },
  { ...base, id: "b", ticket: "A-015", number: 15, status: "called", room: "3", queuedAt: t - 1_200_000, calledAt: t - 90_000 },
  { ...base, id: "c", ticket: "A-016", number: 16, status: "waiting", queuedAt: t - 600_000 },
  { ...base, id: "d", ticket: "A-017", number: 17, status: "waiting", priority: "urgent", queuedAt: t - 500_000 },
  { ...base, id: "e", ticket: "A-018", number: 18, status: "waiting", queuedAt: t - 300_000 },
]);
</script>

<template>
  <NqLobbyDisplay :entries="entries" :rooms="['1', '2', '3']" clinic="Nasaq Clinic" />
</template>
