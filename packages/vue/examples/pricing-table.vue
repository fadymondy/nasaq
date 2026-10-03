<script setup lang="ts">
import { NqPlanComparison, NqPlanPicker, NqPricingTable, type PricingPlan } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const plans: PricingPlan[] = [
  { id: "free", name: "Free", description: "For trying it out.", monthly: 0, features: ["3 projects", "Community support"] },
  {
    id: "pro",
    name: "Pro",
    description: "For growing teams.",
    monthly: 15,
    yearly: 12, // per month, billed yearly
    highlighted: true,
    badge: "Most popular",
    trialDays: 14,
    featuresTitle: "Everything in Free, plus",
    features: ["Unlimited projects", "Priority support"],
  },
  { id: "enterprise", name: "Enterprise", custom: "Custom", features: ["SSO", "SLA"] },
];

const chosen = ref("pro");
const sections = [{ title: "Projects", rows: [{ label: "Projects", values: { free: "3", pro: "Unlimited", enterprise: "Unlimited" } }, { label: "SSO", values: { enterprise: true } }] }];

async function onSelect(plan: PricingPlan, period: string) {
  await new Promise((resolve) => setTimeout(resolve, 600)); // your checkout API
  console.log("checkout", plan.id, period);
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <NqPricingTable :plans="plans" :on-select="onSelect" note="Prices in USD, excluding VAT. Cancel anytime." />
    <NqPlanComparison :plans="plans" :sections="sections" caption="Plan comparison" />
    <NqPlanPicker v-model="chosen" :plans="plans" class="max-w-md" />
  </div>
</template>
