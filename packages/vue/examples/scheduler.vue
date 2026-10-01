<script setup lang="ts">
import { NqScheduler, type SchedulerEvent } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const events: SchedulerEvent[] = [
  { id: "1", title: "Design review", start: new Date(2026, 8, 29, 10, 0), end: new Date(2026, 8, 29, 11, 30), tone: "brand" },
  { id: "2", title: "Client call", start: new Date(2026, 8, 29, 10, 30), end: new Date(2026, 8, 29, 11, 0), tone: "success" },
];
const picked = ref("");
</script>

<template>
  <NqScheduler
    :events="events"
    :working-hours="{ start: 8, end: 18 }"
    @slot-select="(start, end) => (picked = `${start.toISOString()} - ${end.toISOString()}`)"
    @event-click="(event) => (picked = event.title)"
  />
  <p>{{ picked }}</p>
</template>
