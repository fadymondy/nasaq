<script setup lang="ts">
import { provide } from "vue";
import { NAV_KEY, type AppNavPlacement } from "./context";

// Internal. Tells the AppNavItems below where they render: the desktop tabs, the mobile bar or its "More" sheet.
const props = defineProps<{ placement: AppNavPlacement; onNavigate?: () => void; icons?: boolean }>();
provide(NAV_KEY, { placement: props.placement, onNavigate: props.onNavigate, icons: props.icons });
</script>

<template>
  <slot />
</template>
