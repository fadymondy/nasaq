<script setup lang="ts">
import { NqServerCard, type ServerInfo } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const server = ref<ServerInfo>({
  id: "srv-1",
  name: "web-01",
  status: "running",
  address: "203.0.113.24",
  region: "Frankfurt",
  os: "Ubuntu 24.04",
  limits: { cpuCores: 4, memoryMb: 8192, diskGb: 160 },
  metrics: { cpu: 42, memory: 71, disk: 38, cpuHistory: [30, 36, 33, 41, 38, 45, 42] },
  lastDeploy: { ref: "a1b2c3d", at: new Date(Date.now() - 3 * 3600_000), status: "success", by: "Layla" },
  snapshots: [{ id: "s1", name: "Before upgrade", createdAt: new Date(Date.now() - 2 * 86_400_000), sizeLabel: "18.4 GB" }],
});

// Run the work, then pass the new `server` back. Resolve with `{ error }` to show a message.
const wait = () => new Promise((resolve) => setTimeout(resolve, 400));
async function onPower(action: string) {
  await wait();
  server.value = { ...server.value, status: action === "start" ? "running" : action === "restart" ? "running" : "stopped" };
}
async function onTakeSnapshot(name: string) {
  await wait();
  server.value = { ...server.value, snapshots: [...server.value.snapshots, { id: `s${server.value.snapshots.length + 1}`, name: name || "Snapshot", createdAt: new Date(), sizeLabel: "18.4 GB" }] };
}
async function onDeleteSnapshot(id: string) {
  await wait();
  server.value = { ...server.value, snapshots: server.value.snapshots.filter((s) => s.id !== id) };
}
async function onRollback(_id: string) {
  await wait();
}
async function onSaveLimits(limits: ServerInfo["limits"]) {
  await wait();
  server.value = { ...server.value, limits };
}
</script>

<template>
  <NqServerCard
    :server="server"
    :on-power="onPower"
    :on-take-snapshot="onTakeSnapshot"
    :on-rollback="onRollback"
    :on-delete-snapshot="onDeleteSnapshot"
    :on-save-limits="onSaveLimits"
  />
</template>
