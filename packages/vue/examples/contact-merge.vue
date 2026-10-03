<script setup lang="ts">
import { NqContactMerge, type ContactMergeOutcome } from "@fadymondy/nasaq/vue";

const records = [
  {
    id: "c1",
    name: "Sara Alharbi",
    values: { name: "Sara Alharbi", email: "sara@example.com", phone: "+966 50 123 4567", company: "Nasaq", tags: ["vip"] },
    createdAt: "2026-03-02T10:00:00Z",
    stats: [{ label: "Deals", value: 2 }],
    identities: [{ id: "i1", channel: "email" as const, value: "sara@example.com" }],
    consent: { email: "granted" as const },
  },
  {
    id: "c2",
    name: "Sara Al-Harbi",
    values: { name: "Sara Al-Harbi", email: "sara@example.com", phone: "+966 55 987 6543", jobTitle: "Designer", tags: ["lead", "vip"] },
    createdAt: "2026-06-18T10:00:00Z",
    stats: [{ label: "Deals", value: 1 }, { label: "Notes", value: 4 }],
    identities: [{ id: "i2", channel: "whatsapp" as const, value: "+966559876543" }],
    consent: { email: "denied" as const, whatsapp: "granted" as const },
  },
];

async function onMerge(outcome: ContactMergeOutcome) {
  await new Promise((resolve) => setTimeout(resolve, 400));
  console.log("merge", outcome);
}
</script>

<template>
  <NqContactMerge :records="records" :on-merge="onMerge" />
</template>
