<script setup lang="ts">
import { ref } from "vue";
import { NqSocialComposer, NqSocialMetricsTable } from "@fadymondy/nasaq/vue";

const accounts = [
  { id: "x1", platform: "x", name: "@nasaq" },
  { id: "li1", platform: "linkedin", name: "Nasaq Studio" },
] as const;
const post = ref({ body: "Nasaq 1.0 is out.", variants: {}, accountIds: ["x1"], media: [], scheduledAt: null });
const rows = [
  { id: "p1", platform: "x", account: "@nasaq", text: "Nasaq 1.0 is out.", status: "published", publishedAt: "2026-09-20", impressions: 12400, likes: 310, replies: 24, reposts: 51 },
  { id: "p2", platform: "linkedin", account: "Nasaq Studio", text: "Launch week recap.", status: "queued" },
] as const;
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqSocialComposer v-model="post" :accounts="accounts" />
    <NqSocialMetricsTable :rows="rows" />
  </div>
</template>
