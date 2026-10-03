<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Lays out several gauges: as many columns as fit, each at least 12.5rem.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="web-vital-gauge-grid" :class="cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3', props.class)"><slot /></div>
</template>
