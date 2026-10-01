<script setup lang="ts">
import { injectTooltipRootContext, TooltipTrigger } from "reka-ui";
import type { Component } from "vue";

// The trigger must be focusable: <NqTooltipTrigger as-child><NqButton aria-label="Archive">...</NqButton></NqTooltipTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
const root = injectTooltipRootContext();
</script>

<template>
  <TooltipTrigger data-slot="tooltip-trigger" :as="props.as" :as-child="props.asChild" :data-popup-open="root.open.value ? '' : undefined">
    <slot />
  </TooltipTrigger>
</template>
