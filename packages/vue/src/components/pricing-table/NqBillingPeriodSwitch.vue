<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { usePricingLabels, type BillingPeriod, type PricingLabels } from "./pricing";

// Monthly / Yearly, with the yearly saving on a badge. `v-model` is the period ("month" or "year").
interface Props {
  modelValue: BillingPeriod;
  /** The yearly saving to advertise, in percent. Usually `yearlySavings(plans)`. 0 hides the badge. */
  savings?: number;
  labels?: Partial<PricingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { savings: 0, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [period: BillingPeriod] }>();
const { t } = usePricingLabels(() => props.labels);
defineOptions({ inheritAttrs: false });

function onChange(v: string[]) {
  if (v[0]) emit("update:modelValue", v[0] as BillingPeriod);
}
</script>

<template>
  <div data-slot="billing-period-switch" :class="cn('flex items-center gap-2', props.class)" v-bind="$attrs">
    <NqToggleGroup :aria-label="t.period" :model-value="[props.modelValue]" @update:model-value="onChange">
      <NqToggle value="month" class="px-3">{{ t.monthly }}</NqToggle>
      <NqToggle value="year" class="gap-2 px-3">
        {{ t.yearly }}
        <NqBadge v-if="props.savings > 0" variant="accent" class="h-5 px-1.5">{{ t.save(props.savings) }}</NqBadge>
      </NqToggle>
    </NqToggleGroup>
  </div>
</template>
