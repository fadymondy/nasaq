<script setup lang="ts">
import { NqRelationPicker, type RelationOption } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const customers: RelationOption[] = [
  { value: "c1", label: "Acme Trading", description: "billing@acme.example" },
  { value: "c2", label: "Nile Logistics", description: "ops@nile.example" },
  { value: "c3", label: "Riyadh Foods", labelAr: "أغذية الرياض", description: "hello@riyadh.example" },
];
const customerId = ref<string | null>("c2");

// In a real app these call your API: fetch(`/api/customers?q=${query}`, { signal }).
const search = (query: string, signal: AbortSignal) =>
  new Promise<RelationOption[]>((resolve, reject) => {
    const timer = setTimeout(() => resolve(customers.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))), 200);
    signal.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
const resolveIds = async (ids: readonly string[]) => customers.filter((c) => ids.includes(c.value));
const create = async (name: string): Promise<RelationOption> => ({ value: `new-${name}`, label: name });
</script>

<template>
  <div class="w-80">
    <NqRelationPicker v-model="customerId" aria-label="Customer" :search="search" :resolve="resolveIds" :on-create="create" />
  </div>
</template>
