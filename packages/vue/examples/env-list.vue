<script setup lang="ts">
import { NqEnvList, type EnvVariable } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const variables = ref<EnvVariable[]>([
  { key: "DATABASE_URL", value: "postgres://app:s3cret@db.internal/app", secret: true },
  { key: "VITE_API_URL", value: "https://api.example.com", secret: false, description: "Public base URL" },
]);

// Run the work, then pass the new `variables` back. Resolve with `{ error }` to keep the dialog open with a message.
async function onSave(variable: EnvVariable, previousKey?: string) {
  variables.value = previousKey ? variables.value.map((v) => (v.key === previousKey ? variable : v)) : [...variables.value, variable];
}
async function onDelete(key: string) {
  variables.value = variables.value.filter((v) => v.key !== key);
}
async function onImport(incoming: EnvVariable[], { overwrite }: { overwrite: boolean }) {
  const have = new Set(variables.value.map((v) => v.key));
  const next = variables.value.map((v) => (overwrite ? (incoming.find((i) => i.key === v.key) ?? v) : v));
  variables.value = [...next, ...incoming.filter((i) => !have.has(i.key))];
}
</script>

<template>
  <NqEnvList :variables="variables" :on-save="onSave" :on-delete="onDelete" :on-import="onImport" />
</template>
