<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A responsive grid for NqPluginCard.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="plugin-card-grid" :class="cn('grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4', props.class)">
    <slot />
  </div>
</template>
