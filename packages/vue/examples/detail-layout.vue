<script setup lang="ts">
import { NqButton, NqDetailLayout, type DetailTab } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const NOW = Date.parse("2026-09-29T09:00:00");
const tab = ref("overview");
const tabs: DetailTab[] = [
  { key: "overview", label: "Overview", icon: "layout-dashboard", section: "General" },
  { key: "logs", label: "Logs", icon: "scroll-text", section: "General", badge: 12 },
  { key: "settings", label: "Settings", icon: "settings", section: "Settings" },
];
</script>

<template>
  <NqDetailLayout
    v-model:active-tab="tab"
    :tabs="tabs"
    :identity="{ name: 'Postgres', version: '2.4.1', kind: 'Source', status: { label: 'Enabled', tone: 'success' }, icon: 'database', hue: 'blue', description: 'Streams rows from a Postgres database.' }"
    :activity="{ count: 128430, countLabel: 'records', series: [4, 6, 5, 9, 12, 10, 14, 18], lastActiveAt: NOW - 12 * 60_000 }"
  >
    <template #actions><NqButton>Disable</NqButton></template>
    <p v-if="tab === 'overview'">Overview</p>
    <p v-else-if="tab === 'logs'">Logs</p>
    <p v-else>Settings</p>
  </NqDetailLayout>
</template>
