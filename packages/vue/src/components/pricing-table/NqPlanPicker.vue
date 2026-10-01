<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import NqPlanPrice from "./NqPlanPrice.vue";
import { usePricingLabels, type BillingPeriod, type PricingLabels, type PricingPlan } from "./pricing";

// Plans as a compact list of radio cards, for an upgrade dialog, checkout or onboarding, where full cards do not fit.
interface Props {
  plans: PricingPlan[];
  /** Selected plan id (`v-model`). */
  modelValue?: string;
  defaultValue?: string;
  currency?: string;
  period?: BillingPeriod;
  /** The account's plan: shown, but not selectable. */
  currentPlanId?: string;
  labels?: Partial<PricingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: undefined, currency: undefined, period: "month", currentPlanId: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [planId: string] }>();
defineOptions({ inheritAttrs: false });
const currency = useCurrency(() => props.currency);
const { t } = usePricingLabels(() => props.labels);
</script>

<template>
  <NqRadioGroup
    :model-value="modelValue"
    :default-value="defaultValue"
    :class="cn('flex flex-col gap-2', props.class)"
    v-bind="$attrs"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <NqRadioCard v-for="plan in plans" :key="plan.id" :value="plan.id" :disabled="plan.id === currentPlanId" :description="plan.description">
      <span class="flex flex-wrap items-center gap-2">
        {{ plan.name }}
        <NqBadge v-if="plan.id === currentPlanId" variant="outline" class="h-5 px-1.5">{{ t.current }}</NqBadge>
        <NqBadge v-else-if="plan.badge" variant="brand" class="h-5 px-1.5">{{ plan.badge }}</NqBadge>
      </span>
      <template #meta><NqPlanPrice :plan="plan" :period="period" :currency="currency" size="sm" /></template>
    </NqRadioCard>
  </NqRadioGroup>
</template>
