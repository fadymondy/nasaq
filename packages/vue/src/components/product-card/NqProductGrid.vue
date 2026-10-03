<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** Responsive shelf for `NqProductCard`s: 1 column, then 2, 3 and 4 as its own width grows. Establishes the container. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="product-grid" class="@container">
    <div :class="cn('grid grid-cols-1 gap-x-5 gap-y-8 @xl:grid-cols-2 @4xl:grid-cols-3 @6xl:grid-cols-4', props.class)"><slot /></div>
  </div>
</template>
