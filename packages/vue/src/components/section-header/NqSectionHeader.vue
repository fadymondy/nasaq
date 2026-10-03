<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// The title row of a page section: heading, one line of context, an optional action at the inline end.
// Sections are separated by whitespace and this header, not by wrapping each one in a bordered card.
interface Props {
  title?: string;
  /** One line under the title. */
  description?: string;
  /** Heading element. Default "h2". Pick the level that fits the page outline; the look stays the same. */
  as?: "h1" | "h2" | "h3";
  /** Id for the heading, so the section can point at it with `aria-labelledby`. */
  headingId?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { as: "h2" });
</script>

<template>
  <div data-slot="section-header" :class="cn('flex items-end justify-between gap-4', props.class)">
    <div class="flex min-w-0 flex-col gap-1">
      <component :is="props.as" :id="props.headingId" class="text-h2 text-foreground"><slot name="title">{{ props.title }}</slot></component>
      <p v-if="props.description || $slots.description" class="text-pretty text-body-sm text-muted-foreground">
        <slot name="description">{{ props.description }}</slot>
      </p>
    </div>
    <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
  </div>
</template>
