<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { NqPrice } from "../price";
import { planPrice, type BillingPeriod, type PricingPlan } from "./pricing";

// Internal: the price of one plan in one period (or its `custom` text). Not exported from the package index.
interface Props {
  plan: PricingPlan;
  period: BillingPeriod;
  currency: string;
  size?: "sm" | "md" | "lg";
}
const props = withDefaults(defineProps<Props>(), { size: "lg" });
const price = computed(() => planPrice(props.plan, props.period));
</script>

<template>
  <span v-if="plan.custom !== undefined" :class="cn('text-foreground', size === 'lg' ? 'text-h2 font-semibold tracking-tight' : 'font-medium')">{{ plan.custom }}</span>
  <NqPrice v-else-if="price" :amount="price.amount" :compare-at="price.compareAt" :currency="currency" :period="plan.perSeat ? 'seat-month' : 'month'" :size="size" />
</template>
