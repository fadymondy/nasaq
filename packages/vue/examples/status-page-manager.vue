<script setup lang="ts">
import { NqStatusPageManager, type Incident, type StatusPageSettings } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const settings = ref<StatusPageSettings>({
  title: "Nasaq status",
  slug: "nasaq",
  domain: "status.nasaq.dev",
  services: [
    { id: "api", name: "API", visible: true },
    { id: "web", name: "Website", visible: true },
    { id: "db", name: "Database", visible: false },
  ],
});

const incidents: Incident[] = [
  {
    id: "i1",
    title: "Elevated API latency",
    status: "monitoring",
    impact: "minor",
    startedAt: "2026-09-28T10:00:00Z",
    services: ["API"],
    updates: [{ at: "2026-09-28T10:20:00Z", status: "monitoring", body: "A fix is rolled out. We are watching the numbers." }],
  },
];

async function save(next: StatusPageSettings) {
  settings.value = next;
}
</script>

<template>
  <NqStatusPageManager :settings="settings" :incidents="incidents" public-url="https://status.nasaq.dev" :on-save="save" :on-post-incident="async () => {}" />
</template>
