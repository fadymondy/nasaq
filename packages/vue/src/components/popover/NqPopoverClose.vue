<script setup lang="ts">
import { PopoverClose } from "reka-ui";
import type { Component } from "vue";

// <NqPopoverClose as-child><NqButton size="sm">Got it</NqButton></NqPopoverClose>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
</script>

<template>
  <PopoverClose data-slot="popover-close" :as="props.as" :as-child="props.asChild">
    <slot />
  </PopoverClose>
</template>
