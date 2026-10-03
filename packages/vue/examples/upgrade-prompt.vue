<script setup lang="ts">
import { NqButton, NqFeatureGate, NqUpgradeBanner, NqUpgradeDialog, type PricingPlan } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const plans: PricingPlan[] = [
  { id: "team", name: "Team", monthly: 15, yearly: 12, highlighted: true, description: "Everything your team needs" },
  { id: "business", name: "Business", monthly: 40, yearly: 32, description: "Advanced controls" },
];
const open = ref(false);
function upgrade(planId: string | undefined, period: string) {
  console.log("checkout", planId, period);
  open.value = false;
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <NqUpgradeBanner title="Your trial ends in 3 days" description="Pick a plan to keep your projects." tone="warning">
      <template #action><NqButton size="sm" variant="primary" @click="open = true">Choose a plan</NqButton></template>
    </NqUpgradeBanner>
    <NqFeatureGate locked title="Custom reports are on Team" :on-upgrade="() => (open = true)">
      <div class="h-24 rounded-card bg-muted p-4">Revenue by month</div>
    </NqFeatureGate>
    <NqUpgradeDialog
      v-model:open="open"
      title="Unlock unlimited projects"
      description="You have used all 3 projects on the free plan."
      :benefits="['Unlimited projects', 'Priority support', 'Advanced reports']"
      :plans="plans"
      :on-upgrade="upgrade"
    />
  </div>
</template>
