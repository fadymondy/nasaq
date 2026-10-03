<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { currencyDecimals, minorToMajor } from "../currency-input/currency-input-logic";
import { NqNum } from "../numeric";

// A bare figure in a ledger column (internal): no symbol, fixed decimals, tabular digits, left to right. Zero shows as a dash when `blank`.
interface Props {
  /** Amount in minor units. */
  minor: number;
  currency: string;
  blank?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { blank: false });
const format = computed(() => {
  const d = currencyDecimals(props.currency);
  return { minimumFractionDigits: d, maximumFractionDigits: d };
});
</script>

<template>
  <span v-if="props.blank && props.minor === 0" aria-hidden="true" :class="cn('text-muted-foreground', props.class)">–</span>
  <NqNum v-else :value="minorToMajor(props.minor, props.currency)" :format="format" :class="props.class" />
</template>
