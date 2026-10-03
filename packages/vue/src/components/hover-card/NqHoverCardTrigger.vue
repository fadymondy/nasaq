<script setup lang="ts">
import { HoverCardTrigger, injectHoverCardRootContext } from "reka-ui";
import type { Component } from "vue";

// <NqHoverCardTrigger href="/people/sara">@sara</NqHoverCardTrigger>  renders a link, so keyboard users reach it.
interface Props {
  as?: string | Component;
  asChild?: boolean;
}
const props = withDefaults(defineProps<Props>(), { as: "a" });
const root = injectHoverCardRootContext();
</script>

<template>
  <HoverCardTrigger data-slot="hover-card-trigger" :as="props.as" :as-child="props.asChild" :data-popup-open="root.open.value ? '' : undefined">
    <slot />
  </HoverCardTrigger>
</template>
