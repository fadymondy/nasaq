<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { NqNum } from "../numeric";
import { commerceMinorFactor } from "./order-types";

// Minor units ("piasters") shown as money in the store's currency, with the Nasaq digit set and a bidi isolate.
const props = withDefaults(
  defineProps<{
    amount: number;
    currency: string;
    negative?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { negative: false },
);
const digits = computed(() => Math.log10(commerceMinorFactor(props.currency)));
const major = computed(() => (props.negative ? -Math.abs(props.amount) : props.amount) / commerceMinorFactor(props.currency));
const format = computed(() => ({ style: "currency", currency: props.currency, minimumFractionDigits: digits.value, maximumFractionDigits: digits.value }) as const);
</script>

<template>
  <NqNum :value="major" :format="format" :class="props.class" />
</template>
