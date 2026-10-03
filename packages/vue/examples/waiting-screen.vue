<script setup lang="ts">
import { NqWaitingScreen, type QueueEntry } from "@fadymondy/nasaq/vue";

const t = Date.now();
const base = { priority: "normal" as const, checkedInAt: t - 600_000 };
const queue: QueueEntry[] = [
  { ...base, id: "q1", ticket: "A-014", number: 14, status: "serving", room: "2", queuedAt: t - 900_000, calledAt: t - 300_000 },
  { ...base, id: "q2", ticket: "A-015", number: 15, status: "waiting", queuedAt: t - 500_000 },
  { ...base, id: "q3", ticket: "A-016", number: 16, status: "waiting", queuedAt: t - 400_000 },
  { ...base, id: "me", ticket: "A-017", number: 17, status: "waiting", queuedAt: t - 300_000 },
];
const socketState = "live" as const;
const leave = async () => {};
</script>

<template>
  <NqWaitingScreen :entries="queue" entry-id="me" :rooms="2" :connection="socketState" :on-leave="leave" />
</template>
