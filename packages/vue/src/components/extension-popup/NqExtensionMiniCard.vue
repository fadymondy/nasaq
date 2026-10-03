<script setup lang="ts">
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";

// One small card inside the popup: a title with a status pill, one figure, a hint and a row of controls.
interface Props {
  title: string;
  /** A lucide icon component. */
  icon?: Component;
  /** A status pill at the inline end of the header. */
  status?: { label: string; tone?: "neutral" | "success" | "warning" | "danger" | "info" };
  /** The big number or phrase. Numbers keep their own direction. */
  value?: string | number;
  hint?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
defineSlots<{
  /** Buttons, a progress bar, a row of pins. */
  default?: () => unknown;
}>();
</script>

<template>
  <section data-slot="extension-mini-card" :class="cn('flex flex-col gap-2 rounded-lg border border-border bg-card p-3', props.class)">
    <div class="flex items-center gap-2">
      <component :is="props.icon" v-if="props.icon" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
      <h3 class="min-w-0 flex-1 truncate text-label font-medium text-foreground">{{ props.title }}</h3>
      <NqBadge v-if="props.status" :variant="props.status.tone ?? 'neutral'">{{ props.status.label }}</NqBadge>
    </div>
    <p v-if="props.value !== undefined" class="text-h2 tabular-nums text-foreground">{{ props.value }}</p>
    <p v-if="props.hint" class="text-caption text-muted-foreground">{{ props.hint }}</p>
    <slot />
  </section>
</template>
