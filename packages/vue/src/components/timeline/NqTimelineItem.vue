<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAvatar } from "../avatar";
import { NqDateTime } from "../numeric";

interface Props {
  /** Who did it. Renders an avatar marker unless the `icon` slot is given. */
  actor?: { name: string; avatar?: string };
  title?: string;
  description?: string;
  /** When it happened. Rendered by `NqDateTime` in relative mode ("3 hours ago" / "قبل 3 ساعات"). */
  time?: Date | number | string;
  class?: HTMLAttributes["class"];
}

const props = defineProps<Props>();
</script>

<template>
  <li data-slot="timeline-item" :class="cn('group/timeline grid grid-cols-[2rem_1fr] gap-x-3', props.class)">
    <div class="flex flex-col items-center">
      <span data-slot="timeline-marker" class="flex size-8 shrink-0 items-center justify-center">
        <!-- Marker glyph (for example a lucide icon), drawn in a round tile. Wins over `actor`. -->
        <span v-if="$slots.icon" class="flex size-8 items-center justify-center rounded-full border border-border bg-secondary text-muted-foreground [&_svg]:size-4">
          <slot name="icon" />
        </span>
        <NqAvatar v-else-if="props.actor" :name="props.actor.name" :src="props.actor.avatar" size="md" />
        <span v-else aria-hidden="true" class="size-2.5 rounded-full border-2 border-nq-line bg-background" />
      </span>
      <span aria-hidden="true" data-slot="timeline-rail" class="my-1 w-px flex-1 bg-border group-last/timeline:hidden" />
    </div>
    <div data-slot="timeline-content" class="flex min-w-0 flex-col gap-1 pb-6 pt-1 group-last/timeline:pb-0">
      <div class="flex items-baseline justify-between gap-3">
        <p class="min-w-0 text-body-sm font-medium text-foreground"><slot name="title">{{ props.title }}</slot></p>
        <NqDateTime v-if="props.time !== undefined" :value="props.time" relative class="shrink-0 text-caption text-muted-foreground" />
      </div>
      <p v-if="$slots.description || props.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
      <!-- Extra content under the description (an attachment, a diff, actions). -->
      <div v-if="$slots.default" class="flex flex-wrap items-center gap-2"><slot /></div>
    </div>
  </li>
</template>
