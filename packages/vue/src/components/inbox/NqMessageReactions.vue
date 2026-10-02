<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useFormatNumber } from "../numeric";
import type { InboxReaction } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// Emoji chips under a message with a count. Press a chip to add or remove your own reaction.
const props = defineProps<{
  reactions: readonly InboxReaction[];
  /** Id of the current person. Chips they reacted with are pressed. */
  me: string;
  onToggle: (emoji: string) => void;
  labels?: Partial<InboxLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useInboxLabels(() => props.labels);
const fmt = useFormatNumber();
</script>

<template>
  <div v-if="props.reactions.length" data-slot="message-reactions" role="group" :aria-label="t.reactions" :class="cn('flex flex-wrap gap-1', props.class)">
    <button
      v-for="r in props.reactions"
      :key="r.emoji"
      type="button"
      :aria-pressed="r.by.includes(props.me)"
      :aria-label="t.reactedWith(r.emoji, fmt(r.by.length))"
      :class="
        cn(
          'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-caption tabular-nums outline-none',
          'transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus',
          r.by.includes(props.me) ? 'border-nq-accent bg-nq-accent/15 text-foreground' : 'border-border bg-card text-muted-foreground hover:bg-nq-hover',
        )
      "
      @click="props.onToggle(r.emoji)"
    >
      <span aria-hidden="true">{{ r.emoji }}</span>
      {{ fmt(r.by.length) }}
    </button>
  </div>
</template>
