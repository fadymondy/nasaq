<script setup lang="ts">
import { NqPluginCard, NqPluginCardGrid, togglePluginSelected, type PluginCardItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const NOW = Date.parse("2026-09-29T09:00:00");
const plugins: PluginCardItem[] = [
  {
    id: "postgres",
    name: "Postgres",
    version: "2.4.1",
    kind: "source",
    icon: "database",
    hue: "blue",
    enabled: true,
    description: "Streams rows from a Postgres database into the workspace.",
    lastActiveAt: NOW - 12 * 60_000,
    count: 128430,
    countLabel: "records",
    series: [4, 6, 5, 9, 12, 10, 14, 18],
  },
  {
    id: "summarizer",
    name: "Summarizer",
    version: "0.9.0",
    kind: "ai_provider",
    icon: "bot",
    hue: "purple",
    enabled: false,
    description: "Condenses long threads into a short brief.",
    lastActiveAt: NOW - 5 * 3_600_000,
  },
  { id: "legacy-export", name: "Legacy export", kind: "tool", enabled: true },
];
const selected = ref<string[]>(["postgres"]);
</script>

<template>
  <NqPluginCardGrid>
    <NqPluginCard
      v-for="p in plugins"
      :key="p.id"
      :plugin="p"
      selectable
      :selected="selected.includes(p.id)"
      :now="NOW"
      :detail-href="`/admin/plugins/${p.id}`"
      page-href="/plugins"
      @update:selected="(next: boolean) => (selected = togglePluginSelected(selected, p.id, next))"
    />
  </NqPluginCardGrid>
</template>
