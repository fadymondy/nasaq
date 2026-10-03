<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** A lucide icon component (`lucide-vue-next`). Or put the icon in the default slot. */
  icon?: Component;
  /** Tint with this product's brand instead of the surrounding one. */
  brand?: string;
  size?: "sm" | "md" | "lg";
  class?: HTMLAttributes["class"];
}

/**
 * The icon for an app or module that has no mark of its own (Inventory, Payments): a glyph on a brand tint.
 * It is not a logo. Never use it to stand in for a product that has an official mark: use `NqProductMark`.
 */
const props = withDefaults(defineProps<Props>(), { size: "md" });

const glyphSizes = {
  sm: "size-7 rounded-control [&_svg]:size-3.5",
  md: "size-9 rounded-control [&_svg]:size-4",
  lg: "size-11 rounded-card [&_svg]:size-5",
} as const;
</script>

<template>
  <span
    data-slot="app-glyph"
    :data-brand="brand"
    aria-hidden="true"
    :class="cn('inline-flex shrink-0 items-center justify-center bg-[color-mix(in_oklab,var(--nq-brand)_14%,var(--nq-surface-raised))] text-nq-brand', glyphSizes[size], props.class)"
  >
    <slot><component :is="icon" v-if="icon" /></slot>
  </span>
</template>
