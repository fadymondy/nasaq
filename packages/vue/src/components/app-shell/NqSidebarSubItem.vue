<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  active?: boolean;
  /** The element or component to render. Default "a". */
  as?: string | Component;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { active: false, as: "a" });
</script>

<template>
  <component
    :is="props.as"
    data-slot="sidebar-sub-item"
    :aria-current="props.active ? 'page' : undefined"
    :class="
      cn(
        'flex h-[calc(var(--nq-nav-row)-4px)] min-h-[var(--nq-touch-min,0px)] items-center truncate rounded-control px-2 text-body-sm text-muted-foreground',
        'transition-colors duration-150 ease-nq outline-none hover:bg-nq-hover hover:text-foreground',
        'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus',
        props.active && 'bg-nq-selected font-medium text-foreground',
        props.class,
      )
    "
  >
    <slot />
  </component>
</template>
