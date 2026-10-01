<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Responsive grid for StatCards: as many equal columns as fit, each at least 14rem wide.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="stat-grid" :class="cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3', props.class)"><slot /></div>
</template>
