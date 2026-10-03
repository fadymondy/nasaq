<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/**
 * The scrolling middle. Header and footer stay put, so on a short window the nav scrolls between them
 * instead of running under the account menu. `-mx-1 px-1` keeps edge focus rings inside the scroll box.
 */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div
    data-slot="sidebar-content"
    :class="
      cn(
        '-mx-1 flex min-h-0 flex-1 flex-col gap-[calc(var(--spacing-shell)+--spacing(1))] overflow-y-auto overflow-x-hidden overscroll-contain px-1 [scrollbar-width:thin]',
        props.class,
      )
    "
  >
    <slot />
  </div>
</template>
