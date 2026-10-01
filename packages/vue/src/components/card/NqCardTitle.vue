<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = withDefaults(
  defineProps<{
    /** Element to render. Default "div"; pass a heading ("h2", "h3", ...) so the card is a navigable section. */
    as?: "div" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    class?: HTMLAttributes["class"];
  }>(),
  { as: "div" },
);
</script>

<template>
  <component :is="props.as" data-slot="card-title" :class="cn('text-label text-foreground', props.class)"><slot /></component>
</template>
