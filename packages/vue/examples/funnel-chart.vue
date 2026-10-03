<script setup lang="ts">
import { NqFunnelChart, NqFunnelList } from "@fadymondy/nasaq/vue";

const steps = [
  { id: "visit", label: "Visit", count: 12000, detail: "/" },
  { id: "signup", label: "Sign up", count: 3100, detail: "signup_completed" },
  { id: "activate", label: "Activate", count: 1480 },
  { id: "paid", label: "Paid", count: 420 },
];

const segments = [
  { id: "organic", label: "Organic search", entered: 5200, converted: 210 },
  { id: "paid-ads", label: "Paid ads", entered: 4100, converted: 130 },
  { id: "referral", label: "Referral", entered: 2700, converted: 80 },
];

const funnels = [
  { id: "f1", name: "Signup to paid", steps: 4, entered: 12000, conversion: 0.035, previousConversion: 0.031, window: "7 days", updatedAt: "2026-09-28" },
  { id: "f2", name: "Checkout", steps: 3, entered: 4800, conversion: 0.42, previousConversion: 0.45, window: "1 day", updatedAt: "2026-09-25" },
];
</script>

<template>
  <div class="grid gap-6">
    <NqFunnelChart :steps="steps" :segments="segments" segment-label="Source" />
    <NqFunnelList :funnels="funnels" :on-create="() => {}" :on-open="() => {}" :on-duplicate="async () => {}" :on-delete="async () => {}" />
  </div>
</template>
