<script setup lang="ts">
import { NqIntegrationConnector, type IntegrationService } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const services = ref<IntegrationService[]>([
  {
    id: "search-console",
    name: "Search Console",
    group: "Google",
    status: "disconnected",
    scopes: [
      { id: "read", label: "Read your Search Console performance data", required: true },
      { id: "sitemaps", label: "Submit sitemaps" },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    group: "Developer tools",
    status: "connected",
    connectedAs: "fadymondy",
    lastSyncAt: Date.now() - 3_600_000,
    scopes: [{ id: "repo", label: "Read repositories", required: true }],
  },
]);

// Start OAuth here (redirect or popup), then pass the updated `services` back. Resolve `{ error }` to show a message.
async function onConnect(id: string, scopes: string[]) {
  services.value = services.value.map((s) => (s.id === id ? { ...s, status: "connected" as const, grantedScopes: scopes, lastSyncAt: Date.now() } : s));
}
async function onDisconnect(id: string) {
  services.value = services.value.map((s) => (s.id === id ? { ...s, status: "disconnected" as const } : s));
}
</script>

<template>
  <NqIntegrationConnector :services="services" :on-connect="onConnect" :on-disconnect="onDisconnect" />
</template>
