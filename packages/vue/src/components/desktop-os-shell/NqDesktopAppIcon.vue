<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A rounded icon tile with a token background. Wrap a lucide glyph in it for the dock and launchpad.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="desktop-app-icon" :class="cn('grid size-full place-items-center rounded-[22%] bg-card text-primary shadow-sm ring-1 ring-border [&_svg]:size-1/2', props.class)">
    <slot />
  </span>
</template>
