<script setup lang="ts">
import { NqProxyHosts, type ProxyHost, type ProxyHostInput } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const hosts = ref<ProxyHost[]>([
  { id: "h1", hosts: ["app.example.com", "www.example.com"], upstream: "http://10.0.0.5:3000", tlsMode: "auto", websockets: true, enabled: true, status: "online" },
  { id: "h2", hosts: ["api.example.com"], upstream: "https://api.internal", tlsMode: "custom", websockets: false, enabled: true, status: "unknown" },
  { id: "h3", hosts: ["old.example.org"], upstream: "http://localhost:8080", tlsMode: "off", websockets: false, enabled: false, status: "offline" },
]);

async function onSave(input: ProxyHostInput, id?: string) {
  hosts.value = id ? hosts.value.map((h) => (h.id === id ? { ...h, ...input } : h)) : [...hosts.value, { ...input, id: `h${hosts.value.length + 1}`, status: "unknown" }];
}
async function onDelete(id: string) {
  hosts.value = hosts.value.filter((h) => h.id !== id);
}
async function onToggle(id: string, enabled: boolean) {
  hosts.value = hosts.value.map((h) => (h.id === id ? { ...h, enabled } : h));
}
</script>

<template>
  <NqProxyHosts :hosts="hosts" :on-save="onSave" :on-delete="onDelete" :on-toggle="onToggle" />
</template>
