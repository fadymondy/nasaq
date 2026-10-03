<script setup lang="ts">
import { ContextMenuTrigger, injectContextMenuRootContext } from "reka-ui";
import type { Component } from "vue";

// The region that opens the menu on secondary click or long-press. Style it with `class`.
interface Props {
  as?: string | Component;
  asChild?: boolean;
  disabled?: boolean;
}
const props = withDefaults(defineProps<Props>(), { as: "div" });
const root = injectContextMenuRootContext();
</script>

<template>
  <ContextMenuTrigger data-slot="context-menu-trigger" :as="props.as" :as-child="props.asChild" :disabled="props.disabled" :data-popup-open="root.open.value ? '' : undefined">
    <slot />
  </ContextMenuTrigger>
</template>
