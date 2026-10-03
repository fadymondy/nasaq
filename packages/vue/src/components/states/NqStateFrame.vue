<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The shared layout of NqEmptyState and NqErrorState. Use those.
interface Props {
  /** The data-slot of the root: "empty-state" or "error-state". */
  slotName: string;
  icon?: Component;
  iconClass?: string;
  title?: string;
  description?: string;
  /** Hatched ground (grid expression); off automatically in the native expression. */
  hatch?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { hatch: false });
</script>

<template>
  <div
    :data-slot="props.slotName"
    :class="
      cn(
        'flex flex-col items-center justify-center gap-3 border border-dashed border-border px-6 py-12 text-center',
        'rounded-card',
        props.hatch && 'hatch',
        props.class,
      )
    "
  >
    <span
      v-if="props.icon"
      data-slot="state-icon"
      :class="cn('inline-flex size-10 items-center justify-center rounded-control border border-border bg-card [&_svg]:size-5', props.iconClass ?? 'text-muted-foreground')"
    >
      <component :is="props.icon" aria-hidden="true" />
    </span>
    <div class="flex max-w-sm flex-col gap-1">
      <p class="text-label text-foreground"><slot name="title">{{ props.title }}</slot></p>
      <p v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </p>
    </div>
    <slot />
    <div v-if="$slots.actions" class="mt-1 flex flex-wrap items-center justify-center gap-2"><slot name="actions" /></div>
  </div>
</template>
