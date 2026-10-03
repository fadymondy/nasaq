<script setup lang="ts">
import { NqLogViewer, type LogEntry } from "@fadymondy/nasaq/vue";

const now = Date.parse("2026-09-29T09:00:00Z");
const entries: LogEntry[] = [
  { id: 1, time: now, level: "info", source: "api", message: "listening on :3000" },
  { id: 2, time: now + 1200, level: "error", source: "db", message: "connection refused", fields: { host: "db-1" } },
];
</script>

<template>
  <NqLogViewer streaming :entries="entries" />
</template>
