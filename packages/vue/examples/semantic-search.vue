<script setup lang="ts">
import { NqSemanticSearch, type SemanticHit } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const results = ref<SemanticHit[]>([]);
const pending = ref(false);

async function search(query: string, { limit }: { mode: string; limit: number }) {
  pending.value = true;
  await new Promise((r) => setTimeout(r, 400));
  results.value = [
    { id: "1", content: `Refunds are issued within 14 days. (${query})`, score: 0.91, group: "policies", kind: "document", source: "notion", sourceRef: "Returns", importance: 0.8 },
    { id: "2", content: "Shipping to Jeddah takes 2 to 3 days.", score: 0.62, group: "faq", kind: "fact", source: "upload", viaEntity: "Shipping" },
  ].slice(0, limit);
  pending.value = false;
}
</script>

<template>
  <NqSemanticSearch :results="results" :searching="pending" :on-search="search" :on-open="(hit) => console.log(hit.id)" />
</template>
