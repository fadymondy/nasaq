<script setup lang="ts">
import { NqServiceUnitsList, type ServiceAction, type ServiceUnit } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const t = Date.now();
const services = ref<ServiceUnit[]>([
  { id: "nginx", name: "nginx.service", description: "A high performance web server", state: "active", enabled: true, memoryBytes: 48_200_000, since: t - 3 * 86_400_000 },
  { id: "postgresql", name: "postgresql.service", description: "PostgreSQL database server", state: "active", enabled: true, memoryBytes: 312_000_000, since: t - 9 * 86_400_000 },
  { id: "redis", name: "redis-server.service", description: "Advanced key-value store", state: "failed", enabled: true, since: t - 3_600_000 },
  { id: "cron", name: "cron.service", state: "inactive", enabled: false },
]);

const onAction = async (id: string, action: ServiceAction) => {
  const state = { start: "active", restart: "active", stop: "inactive" } as const;
  services.value = services.value.map((s) => {
    if (s.id !== id) return s;
    if (action === "enable" || action === "disable") return { ...s, enabled: action === "enable" };
    return action in state ? { ...s, state: state[action as keyof typeof state], since: Date.now() } : s;
  });
};
</script>

<template>
  <NqServiceUnitsList :services="services" :on-action="onAction" />
</template>
