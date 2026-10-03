<script setup lang="ts">
import { computed, provide } from "vue";
import { RAIL_KEY } from "./context";

// Internal. Tells the sidebar parts below whether they are on the collapsed rail (the desktop column) or not (the phone sheet).
const props = defineProps<{ collapsed: boolean }>();
provide(RAIL_KEY, computed(() => props.collapsed));
</script>

<template>
  <slot />
</template>
