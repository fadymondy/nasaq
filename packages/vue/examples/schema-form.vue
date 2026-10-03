<script setup lang="ts">
import { NqSchemaForm } from "@fadymondy/nasaq/vue";

const schema = {
  type: "object",
  required: ["name"],
  properties: {
    name: { type: "string", title: "Name", "x-title-ar": "الاسم" },
    status: { type: "string", enum: ["draft", "live"] },
    owner: { type: "string", title: "Owner", "x-relation": { resource: "users" } },
  },
};

// Your API calls.
const users = [
  { value: "u1", label: "Layla Hassan" },
  { value: "u2", label: "Omar Nasser" },
];
const relations = {
  users: { search: async (query: string) => users.filter((u) => u.label.toLowerCase().includes(query.toLowerCase())) },
};

async function save(value: Record<string, unknown>) {
  const res = await fetch("/api/projects", { method: "POST", body: JSON.stringify(value) });
  if (!res.ok) return { fieldErrors: (await res.json()).errors as Record<string, string> };
}
</script>

<template>
  <NqSchemaForm :schema="schema" :relations="relations" :on-submit="save" />
</template>
