<script setup lang="ts">
import { injectPopoverRootContext, PopoverTrigger } from "reka-ui";
import type { Component } from "vue";

// <NqPopoverTrigger as-child><NqButton variant="outline">Details</NqButton></NqPopoverTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
const root = injectPopoverRootContext();
</script>

<template>
  <PopoverTrigger data-slot="popover-trigger" :as="props.as" :as-child="props.asChild" :data-popup-open="root.open.value ? '' : undefined">
    <slot />
  </PopoverTrigger>
</template>
