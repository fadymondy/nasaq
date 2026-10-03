<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { NqNum } from "../numeric";

// A plain figure in minor units, without the free label, for sums and negatives ("-$100").
interface Props {
  amount: number;
  currency: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const major = computed(() => minorToMajor(props.amount, props.currency));
const digits = computed(() => (Number.isInteger(major.value) ? 0 : 2));
</script>

<template>
  <NqNum :value="major" :format="{ style: 'currency', currency: props.currency, minimumFractionDigits: digits, maximumFractionDigits: digits }" :class="cn('text-foreground', props.class)" />
</template>
