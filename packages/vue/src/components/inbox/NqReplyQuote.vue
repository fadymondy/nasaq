<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// The quoted message a reply answers: author and a two-line excerpt with an accent bar on the inline start.
const props = defineProps<{
  author: string;
  excerpt: string;
  /** Makes the quote a button that jumps to the original. */
  onJump?: () => void;
  labels?: Partial<InboxLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useInboxLabels(() => props.labels);
</script>

<template>
  <div data-slot="reply-quote" :class="cn('mb-1.5 rounded-[4px] border-s-2 border-nq-accent bg-background/60 ps-2 pe-2 py-1 text-start', props.class)">
    <button v-if="props.onJump" type="button" :aria-label="`${t.quoteJump}: ${props.author}`" class="block w-full text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click="props.onJump()">
      <span dir="auto" class="block truncate text-caption font-medium text-foreground">{{ props.author }}</span>
      <span dir="auto" class="line-clamp-2 block text-caption text-muted-foreground">{{ props.excerpt }}</span>
    </button>
    <template v-else>
      <span dir="auto" class="block truncate text-caption font-medium text-foreground">{{ props.author }}</span>
      <span dir="auto" class="line-clamp-2 block text-caption text-muted-foreground">{{ props.excerpt }}</span>
    </template>
  </div>
</template>
