<script setup lang="ts">
import { NqCheckoutSteps, type CheckoutPlan } from "@fadymondy/nasaq/vue";

const plans: CheckoutPlan[] = [
  { id: "starter", name: "Starter", monthlyPrice: 19, yearlyPrice: 190, features: ["3 projects"] },
  { id: "team", name: "Team", monthlyPrice: 49, yearlyPrice: 490, badge: "Most popular", highlighted: true },
];

// In a real page this posts the order to your server and returns its receipt number.
async function onComplete(order: unknown) {
  await fetch("/api/subscribe", { method: "POST", body: JSON.stringify(order) });
  return { reference: "SUB-1042" };
}
</script>

<template>
  <NqCheckoutSteps :plans="plans" currency="USD" :tax-rate="0.15" tax-label="VAT" :on-complete="onComplete" />
</template>
