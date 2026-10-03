<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <header
    data-slot="app-header"
    :class="
      cn(
        'sticky top-0 z-30 flex h-header shrink-0 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur-sm md:px-4',
        'in-data-[slot=app-shell-panel]:md:rounded-t-xl',
        props.class,
      )
    "
  >
    <slot />
  </header>
</template>
