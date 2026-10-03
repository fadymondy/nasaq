<script setup lang="ts">
import { NqProviderSwitcher } from "@fadymondy/nasaq/vue";

const capabilities = [
  { capability: "data", label: "Data", active: "postgres", options: ["postgres", "sqlite"], isDefault: true },
  { capability: "queue", label: "Queue", active: "redis", options: ["redis", "nats", "database"], isDefault: false },
];

function onSelect(capability: string, backend: string) {
  return new Promise<void>((resolve) => setTimeout(resolve, 400)).then(() => console.log(capability, backend));
}
</script>

<template>
  <NqProviderSwitcher :capabilities="capabilities" @select="onSelect" />
</template>
