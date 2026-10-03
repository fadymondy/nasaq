<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Lays NqPlanCards side by side from 48rem of container width (up to 4), stacked below it. Leaves room for the badge pills.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="plan-grid" class="@container">
    <div :class="cn('grid grid-cols-1 gap-x-4 gap-y-7 pt-3 @3xl:auto-cols-fr @3xl:grid-flow-col', props.class)"><slot /></div>
  </div>
</template>
