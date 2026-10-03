<script setup lang="ts">
import { useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/**
 * The page's title row: a big title, an optional line under it, and the page's controls at the end. Slots:
 * `title` / `description` (or the props), `icon` (a mark or avatar before the title) and `actions` (controls at
 * the inline end: a time range, filters, the page's main action). The default slot renders after the actions.
 */
interface Props {
  title?: string;
  description?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const slots = useSlots();
</script>

<template>
  <div data-slot="app-page-header" :class="cn('flex flex-wrap items-center gap-x-4 gap-y-3', props.class)">
    <div class="flex min-w-0 flex-1 items-center gap-3">
      <span v-if="slots.icon" class="inline-flex shrink-0"><slot name="icon" /></span>
      <div class="grid min-w-0 gap-1">
        <h1 class="truncate text-h2 text-foreground"><slot name="title">{{ props.title }}</slot></h1>
        <div v-if="props.description || slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></div>
      </div>
    </div>
    <div v-if="slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    <slot />
  </div>
</template>
