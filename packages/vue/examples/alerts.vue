<script setup lang="ts">
import { NqAlertList, type AlertItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const alerts = ref<AlertItem[]>([
  { id: "a1", title: "API latency above 2s", severity: "critical", status: "open", source: "api-gateway", createdAt: Date.now() - 20 * 60_000, description: "p95 latency crossed the threshold." },
  { id: "a2", title: "Disk 85% full", severity: "high", status: "open", source: "db-01", createdAt: Date.now() - 3 * 3600_000 },
  { id: "a3", title: "Certificate renewed", severity: "low", status: "resolved", source: "edge", createdAt: Date.now() - 26 * 3600_000 },
]);

const set = (id: string, status: AlertItem["status"]) => async () => {
  await new Promise((r) => setTimeout(r, 300));
  alerts.value = alerts.value.map((a) => (a.id === id ? { ...a, status } : a));
};
</script>

<template>
  <NqAlertList
    :alerts="alerts"
    :on-acknowledge="(id: string) => set(id, 'acknowledged')()"
    :on-resolve="(id: string) => set(id, 'resolved')()"
    :on-reopen="(id: string) => set(id, 'open')()"
  />
</template>
