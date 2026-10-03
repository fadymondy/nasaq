<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Responsive grid for engine cards: as many equal columns as fit, each at least 20rem wide.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="engine-card-grid" :class="cn('grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4', props.class)"><slot /></div>
</template>
