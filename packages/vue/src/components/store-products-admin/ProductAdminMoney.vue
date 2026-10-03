<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqNum } from "../numeric";
import { minorToMajor } from "../currency-input/currency-input-logic";

// A money amount in minor units, shown as currency. Internal to the product admin screens.
const props = defineProps<{ minor: number; currency: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NqNum :class="props.class" :value="minorToMajor(props.minor, props.currency)" :format="{ style: 'currency', currency: props.currency }" />
</template>
