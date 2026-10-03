<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqNum } from "../numeric";
import { commerceToMajor } from "./commerce";

// A money amount in minor units, shown as currency. Internal to the store-settings screens.
const props = defineProps<{ minor: number; currency: string; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <NqNum :class="props.class" :value="commerceToMajor(props.minor, props.currency)" :format="{ style: 'currency', currency: props.currency }" />
</template>
