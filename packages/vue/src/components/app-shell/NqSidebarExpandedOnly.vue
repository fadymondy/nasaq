<script setup lang="ts">
import { useSidebarCollapsed } from "./context";

/** Renders its content only when the sidebar is expanded (or in the mobile sheet). */
const collapsed = useSidebarCollapsed();
</script>

<template>
  <slot v-if="!collapsed" />
</template>
