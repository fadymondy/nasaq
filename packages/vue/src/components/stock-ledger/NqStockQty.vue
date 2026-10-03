<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqNum } from "../numeric";

// A quantity: up to three decimals, tabular, left to right. Zero shows as a dash when `blank`.
interface Props {
  value: number;
  blank?: boolean;
  sign?: boolean;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
</script>

<template>
  <span v-if="props.blank && props.value === 0" aria-hidden="true" :class="cn('text-muted-foreground', props.class)">–</span>
  <NqNum v-else :value="props.value" :format="{ maximumFractionDigits: 3, signDisplay: props.sign ? 'exceptZero' : 'auto' }" :class="props.class" />
</template>
