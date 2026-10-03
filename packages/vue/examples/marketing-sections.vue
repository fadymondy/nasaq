<script setup lang="ts">
import { NqAppMockupHero, NqButton, NqCtaBanner, NqFeatureGrid, NqHowItWorks, NqPricingPacks, NqSessionPlayback } from "@fadymondy/nasaq/vue";
import { Zap } from "lucide-vue-next";

const steps = [{ title: "Create" }, { title: "Share" }, { title: "Sell" }];
const features = [{ icon: Zap, title: "Fast", description: "Pages load at once." }];
const packs = [
  { id: "s", name: "Starter", credits: 500, price: 9 },
  { id: "p", name: "Pro", credits: 2500, bonus: 250, price: 39, highlighted: true, badge: "Best value" },
];
const events = [
  { role: "user", text: "Summarise yesterday's bookings." },
  { role: "tool", title: "Read bookings", text: "42 rows" },
  { role: "assistant", text: "You had 42 bookings, 6 more than the day before." },
] as const;
</script>

<template>
  <main class="flex flex-col gap-20">
    <NqAppMockupHero title="Book seats in seconds" description="Plans, seat maps and payments in one place." mockup-label="The seat map" frame-title="app.example.com">
      <template #actions><NqButton variant="primary" size="lg">Start free</NqButton></template>
      <template #mockup><div class="h-40 bg-nq-surface-soft" /></template>
    </NqAppMockupHero>
    <NqHowItWorks title="How it works" :steps="steps" />
    <NqFeatureGrid title="Everything you need" :features="features" />
    <NqPricingPacks title="Top up" :packs="packs" />
    <NqSessionPlayback title="AI session" :events="[...events]" :auto-play="false" height="14rem" />
    <NqCtaBanner title="Ready to start?">
      <template #action><NqButton variant="primary">Create account</NqButton></template>
    </NqCtaBanner>
  </main>
</template>
