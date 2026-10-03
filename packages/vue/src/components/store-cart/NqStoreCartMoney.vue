<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { useCurrency } from "../../provider";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { NqPrice } from "../price";

// `NqPrice` for minor units: converts by the currency's decimals, so 34900 cents shows "$349".
interface Props {
  /** Integer minor units (piasters, cents). */
  amount: number;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** The price before a discount, minor units. */
  compareAt?: number;
  size?: "sm" | "md" | "lg";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, compareAt: undefined, size: "md" });
const currency = useCurrency(() => props.currency);
const compare = computed(() => (props.compareAt ? minorToMajor(props.compareAt, currency.value) : undefined));
</script>

<template>
  <NqPrice :amount="minorToMajor(props.amount, currency)" :currency="currency" :compare-at="compare" :size="props.size" :class="props.class" />
</template>
