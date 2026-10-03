<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { NqNum } from "../numeric";

// An amount in minor units, formatted for the locale with tabular digits and bidi isolation.
interface Props {
  /** Amount in minor units. */
  minor: number;
  currency: string;
  /** "always" prefixes + on positive amounts. Default "auto" (a minus only for negatives). */
  sign?: "auto" | "always";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { sign: "auto" });
const format = computed(() => ({ style: "currency" as const, currency: props.currency, signDisplay: props.sign === "always" ? ("exceptZero" as const) : ("auto" as const) }));
</script>

<template>
  <NqNum :value="minorToMajor(props.minor, props.currency)" :format="format" :class="props.class" />
</template>
