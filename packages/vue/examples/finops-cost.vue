<script setup lang="ts">
import { NqFinopsCost } from "@fadymondy/nasaq/vue";

const servers = [
  { id: "s1", name: "web-1", plan: "CPX31", region: "fsn1", monthlyPrice: 15.4, usage: { cpu: 12, memory: 18, disk: 40 }, smallerPlan: { name: "CPX21", monthlyPrice: 8.5 } },
  { id: "s2", name: "db-1", plan: "CPX41", region: "fsn1", monthlyPrice: 28, usage: { cpu: 91, memory: 72, disk: 60 }, largerPlan: { name: "CPX51", monthlyPrice: 55 } },
  { id: "s3", name: "worker-1", plan: "CPX21", region: "nbg1", monthlyPrice: 8.5, usage: { cpu: 45, memory: 50, disk: 30 } },
];
const items = [
  { id: "i1", name: "Domain renewal", category: "Domains", amount: 24, period: "yearly" as const },
  { id: "i2", name: "Backups", category: "Storage", amount: 6, period: "monthly" as const },
];
const history = Array.from({ length: 14 }, (_, i) => ({ date: new Date(Date.UTC(2026, 8, 15 + i)).toISOString(), cost: 2 + (i % 5) * 0.3 }));

const add = () => undefined;
const remove = () => undefined;
const change = () => undefined;
</script>

<template>
  <NqFinopsCost :servers="servers" :items="items" :previous-total="70" :budget="80" :history="history" :on-add-item="add" :on-remove-item="remove" :on-change-plan="change" />
</template>
