<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** A borderless list of `NqProductListItem`s: 1 column, then 2 and 3 as its own width grows. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="product-list" class="@container">
    <ul :class="cn('grid grid-cols-1 gap-x-6 gap-y-1 @3xl:grid-cols-2 @6xl:grid-cols-3', props.class)"><slot /></ul>
  </div>
</template>
