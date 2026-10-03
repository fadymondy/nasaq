<script setup lang="ts">
import { CollapsibleTrigger, injectCollapsibleRootContext } from "reka-ui";
import type { Component } from "vue";

// <NqCollapsibleTrigger as-child><NqButton variant="ghost">Advanced settings</NqButton></NqCollapsibleTrigger>
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = defineProps<Props>();
const root = injectCollapsibleRootContext();
</script>

<template>
  <CollapsibleTrigger data-slot="collapsible-trigger" :as="props.as" :as-child="props.asChild" :data-panel-open="root.open.value ? '' : undefined">
    <slot />
  </CollapsibleTrigger>
</template>
