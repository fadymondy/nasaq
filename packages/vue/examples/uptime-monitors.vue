<script setup lang="ts">
import { NqUptimeMonitors, type Incident, type MonitorInput, type UptimeMonitor } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const minute = 60_000;
const monitors = ref<UptimeMonitor[]>([
  {
    id: "m1",
    name: "Storefront",
    target: "https://example.com",
    kind: "http",
    status: "up",
    uptime: { "24h": 100, "7d": 99.98, "30d": 99.96 },
    checks: ["up", "up", "up", "degraded", "up", "up", "up", "up", "up", "up", "up", "up"],
    responseMs: 182,
    lastCheckAt: Date.now() - 2 * minute,
    intervalSec: 60,
  },
  {
    id: "m2",
    name: "Checkout API",
    target: "https://api.example.com/health",
    kind: "http",
    status: "down",
    uptime: { "24h": 91.5, "7d": 98.4, "30d": 99.1 },
    checks: ["up", "up", "up", "up", "down", "down", "down", "up", "down", "down", "down", "down"],
    responseMs: 2400,
    lastCheckAt: Date.now() - minute,
    intervalSec: 60,
  },
  { id: "m3", name: "Mail server", target: "mail.example.com:25", kind: "tcp", status: "paused", uptime: { "24h": null, "7d": null, "30d": 100 }, intervalSec: 300 },
]);
const incidents: Incident[] = [
  {
    id: "i1",
    title: "Checkout API is failing",
    status: "investigating",
    impact: "major",
    startedAt: Date.now() - 40 * minute,
    services: ["Checkout API"],
    updates: [
      { at: Date.now() - 40 * minute, status: "investigating", body: "Checks are failing. We are looking into it." },
      { at: Date.now() - 15 * minute, status: "identified", body: "A bad deploy. Rolling it back." },
    ],
  },
  { id: "i2", title: "Slow product pages", status: "resolved", impact: "minor", startedAt: Date.now() - 26 * 60 * minute, resolvedAt: Date.now() - 25 * 60 * minute },
];

async function onSave(input: MonitorInput, id?: string) {
  if (id) monitors.value = monitors.value.map((m) => (m.id === id ? { ...m, ...input } : m));
  else monitors.value = [...monitors.value, { id: `m${monitors.value.length + 1}`, ...input, status: "unknown", uptime: {} }];
}
async function onDelete(id: string) {
  monitors.value = monitors.value.filter((m) => m.id !== id);
}
async function onPause(id: string) {
  monitors.value = monitors.value.map((m) => (m.id === id ? { ...m, status: "paused" } : m));
}
async function onResume(id: string) {
  monitors.value = monitors.value.map((m) => (m.id === id ? { ...m, status: "up" } : m));
}
async function onCheckNow() {}
</script>

<template>
  <NqUptimeMonitors
    :monitors="monitors"
    :incidents="incidents"
    :on-save="onSave"
    :on-delete="onDelete"
    :on-pause="onPause"
    :on-resume="onResume"
    :on-check-now="onCheckNow"
  />
</template>
