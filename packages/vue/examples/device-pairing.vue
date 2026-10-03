<script setup lang="ts">
import { NqDeviceApproval } from "@fadymondy/nasaq/vue";

const request = { code: "WDJBMJHT", client: "Mahaam Desktop", deviceName: "Fady MacBook Pro", platform: "macOS 15", ip: "203.0.113.7", location: "Riyadh, Saudi Arabia", scopes: ["Read your projects", "Log time"] };
const expiresAt = Date.now() + 10 * 60 * 1000;

// Your API calls. Resolve { error } to show a failure.
async function approve() {
  await fetch("/api/device/approve", { method: "POST", body: JSON.stringify({ code: request.code }) });
}
async function deny() {
  await fetch("/api/device/deny", { method: "POST", body: JSON.stringify({ code: request.code }) });
}
</script>

<template>
  <NqDeviceApproval :request="request" :expires-at="expiresAt" :on-approve="approve" :on-deny="deny" />
</template>
