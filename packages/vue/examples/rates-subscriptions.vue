<script setup lang="ts">
import { NqBillingOverview, NqRateSchedule, NqRecurringSubscriptions, type Rate, type Subscription } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const rates = ref<Rate[]>([
  { id: "r1", amount: 7500, from: "2026-01-01" },
  { id: "r2", amount: 9000, from: "2026-07-01" },
]);
const subs = ref<Subscription[]>([
  { id: "s1", name: "Hosting", projectId: "p1", projectName: "Storefront", amount: 2500, quantity: 2, schedule: { kind: "cycle", every: 1, unit: "month" }, anchor: "2026-09-01", status: "active" },
  { id: "s2", name: "Support plan", amount: 12000, schedule: { kind: "cycle", every: 1, unit: "year" }, anchor: "2026-03-15", status: "paused" },
]);

async function addRate({ amount, from }: { amount: number; from: string }) {
  rates.value = [...rates.value, { id: `r${rates.value.length + 1}`, amount, from }];
}
async function save(input: Omit<Subscription, "id" | "status">, id?: string) {
  if (id) subs.value = subs.value.map((s) => (s.id === id ? { ...s, ...input } : s));
  else subs.value = [...subs.value, { ...input, id: `s${subs.value.length + 1}`, status: "active" }];
}
async function setStatus(sub: Subscription, status: Subscription["status"]) {
  subs.value = subs.value.map((s) => (s.id === sub.id ? { ...s, status } : s));
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <NqRateSchedule :rates="rates" currency="USD" today="2026-09-29" :on-add="addRate" />
    <NqRecurringSubscriptions :subscriptions="subs" currency="USD" today="2026-09-29" :on-save="save" :on-status-change="setStatus" />
    <NqBillingOverview :subscriptions="subs" currency="USD" today="2026-09-29" />
  </div>
</template>
