<script setup lang="ts">
import { DropdownMenuTrigger, injectDropdownMenuRootContext } from "reka-ui";
import type { Component } from "vue";

// <NqDropdownMenuTrigger as-child><NqButton>Actions</NqButton></NqDropdownMenuTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
  disabled?: boolean;
}
const props = defineProps<Props>();
const root = injectDropdownMenuRootContext();
</script>

<template>
  <DropdownMenuTrigger data-slot="dropdown-menu-trigger" :as="props.as" :as-child="props.asChild" :disabled="props.disabled" :data-popup-open="root.open.value ? '' : undefined">
    <slot />
  </DropdownMenuTrigger>
</template>
