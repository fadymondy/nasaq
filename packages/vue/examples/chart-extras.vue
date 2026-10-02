<script setup lang="ts">
import { NqFunnelSteps, NqProgressRing, NqSegmentBar, NqTrendCell } from "@fadymondy/nasaq/vue";

const segments = [
  { id: "organic", label: "Organic", value: 4200 },
  { id: "paid", label: "Paid", value: 2100 },
  { id: "referral", label: "Referral", value: 900 },
];
const seats = [
  { id: "admin", label: "Admins", value: 3 },
  { id: "member", label: "Members", value: 11 },
];
const steps = [
  { id: "visit", label: "Visit", count: 12000, detail: "/" },
  { id: "cart", label: "Add to cart", count: 3400, detail: "cart_add" },
  { id: "paid", label: "Paid", count: 910 },
];
</script>

<template>
  <div class="grid gap-8">
    <div class="flex items-center gap-6">
      <NqProgressRing :value="72" label="Onboarding" caption="of 25 steps" />
      <NqSegmentBar class="flex-1" :segments="segments" />
    </div>
    <NqSegmentBar :total="20" rest-label="Free" :segments="seats" />
    <div class="flex items-center gap-6">
      <NqProgressRing :value="92" tone="auto" label="Storage used" caption="46 of 50 GB" />
      <NqProgressRing :value="40" tone="success" label="Tests passing" />
    </div>
    <NqFunnelSteps :steps="steps" />
    <div class="grid max-w-xs gap-4">
      <NqTrendCell :value="48210" :delta="0.124" :data="[4, 6, 5, 9, 8, 12]" chart-label="Revenue, last 6 weeks" />
      <NqTrendCell :value="1320" :delta="-0.08" invert variant="bar" :data="[3, 5, 4, 8, 6, 3]" chart-label="Refunds, last 6 weeks" />
    </div>
  </div>
</template>
