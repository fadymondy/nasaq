<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { minorToMajor } from "../currency-input";
import { NqNum } from "../numeric";

// Internal: an amount in minor units as currency.
const props = defineProps<{ minor: number; currency: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NqNum :class="props.class" :value="minorToMajor(props.minor, props.currency)" :format="{ style: 'currency', currency: props.currency }" />
</template>
