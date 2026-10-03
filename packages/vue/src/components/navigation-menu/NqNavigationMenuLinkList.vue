<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A list of links inside a panel. `columns` is the number of columns from the `sm` breakpoint up.
const props = withDefaults(defineProps<{ columns?: 1 | 2 | 3; class?: HTMLAttributes["class"] }>(), { columns: 1 });
</script>

<template>
  <ul
    data-slot="navigation-menu-link-list"
    :class="cn('m-0 grid list-none gap-1 p-0', props.columns === 2 && 'sm:grid-cols-2', props.columns === 3 && 'sm:grid-cols-3', props.class)"
  >
    <slot />
  </ul>
</template>
