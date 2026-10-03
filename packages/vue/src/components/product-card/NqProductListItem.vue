<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/**
 * A compact product row for long lists (modules, integrations, add-ons). Goes inside `NqProductList`.
 * Slots: `icon` (an app glyph or a small product mark), `name`, `description`, `price`, `action`.
 */
const props = defineProps<{
  name?: string;
  /** One line; truncates. */
  description?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <li data-slot="product-list-item" :class="cn('flex min-w-0 items-center gap-3 rounded-control px-2 py-2.5 transition-colors duration-150 hover:bg-nq-hover', props.class)">
    <slot name="icon" />
    <div class="flex min-w-0 flex-1 flex-col">
      <span class="truncate text-label text-foreground"><slot name="name">{{ name }}</slot></span>
      <span v-if="$slots.description || description" class="truncate text-caption text-muted-foreground"><slot name="description">{{ description }}</slot></span>
    </div>
    <slot name="price" />
    <slot name="action" />
  </li>
</template>
