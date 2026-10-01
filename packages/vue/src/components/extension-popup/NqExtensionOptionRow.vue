<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A label and hint at the inline start, a control at the end.
interface Props {
  label: string;
  description?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
defineSlots<{
  /** The control at the inline end: a Switch, a Select, a button. Give it its own accessible name. */
  control?: () => unknown;
}>();
</script>

<template>
  <div data-slot="extension-option-row" :class="cn('flex items-center justify-between gap-4 py-1', props.class)">
    <div class="min-w-0">
      <p class="text-label text-foreground">{{ props.label }}</p>
      <p v-if="props.description" class="text-caption text-muted-foreground">{{ props.description }}</p>
    </div>
    <div class="shrink-0"><slot name="control" /></div>
  </div>
</template>
