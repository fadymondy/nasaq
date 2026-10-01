<script setup lang="ts">
import { ref } from "vue";
import { NqActiveSessions, type ActiveSession } from "@fadymondy/nasaq/vue";

const hour = 3_600_000;
const sessions = ref<ActiveSession[]>([
  { id: "1", device: "Chrome on macOS", kind: "desktop", ip: "41.33.12.9", location: "Cairo, Egypt", lastActiveAt: Date.now() - 60_000, current: true },
  { id: "2", device: "Safari on iPhone", kind: "mobile", ip: "41.33.80.2", location: "Alexandria, Egypt", lastActiveAt: Date.now() - 5 * hour },
  { id: "3", device: "Firefox on Windows", kind: "desktop", ip: "102.44.7.31", location: "Riyadh, Saudi Arabia", lastActiveAt: Date.now() - 48 * hour },
]);

// Your API calls; they end the sessions on the server.
const revoke = async (id: string) => {
  sessions.value = sessions.value.filter((s) => s.id !== id);
};
const revokeOthers = async () => {
  sessions.value = sessions.value.filter((s) => s.current);
};
</script>

<template>
  <NqActiveSessions :sessions="sessions" :on-revoke="revoke" :on-revoke-others="revokeOthers" />
</template>
