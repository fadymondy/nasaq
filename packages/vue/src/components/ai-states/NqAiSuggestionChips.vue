<script setup lang="ts">
import { Sparkles, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import type { AiAction } from "./types";

// Inline suggestions next to a field or under an answer. One tap runs one.
const props = defineProps<{
  suggestions: readonly Pick<AiAction, "id" | "label" | "icon">[];
  /** Runs the chosen suggestion. */
  onPick?: (id: string) => void;
  /** Shows a dismiss button on each chip. */
  onDismiss?: (id: string) => void;
  /** Accessible name of the group. Default "AI suggestions". */
  label?: string;
  labels?: Partial<AiStatesLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
</script>

<template>
  <div v-if="props.suggestions.length > 0" role="group" :aria-label="props.label ?? t.suggestions" data-slot="ai-suggestion-chips" :class="cn('flex flex-wrap gap-1.5', props.class)">
    <span
      v-for="s in props.suggestions"
      :key="s.id"
      class="inline-flex max-w-full items-center rounded-full border border-border bg-card text-caption text-foreground transition-colors duration-150 ease-nq focus-within:outline-2 focus-within:outline-nq-focus hover:bg-nq-hover"
    >
      <button type="button" :class="cn('inline-flex min-h-7 min-w-0 items-center gap-1.5 rounded-full ps-2.5 outline-none', props.onDismiss ? 'pe-1.5' : 'pe-2.5')" @click="props.onPick?.(s.id)">
        <component :is="s.icon" v-if="s.icon" aria-hidden="true" class="size-3.5 shrink-0 text-nq-accent-text" />
        <Sparkles v-else aria-hidden="true" class="size-3.5 shrink-0 text-nq-accent-text" />
        <span dir="auto" class="truncate">{{ s.label }}</span>
      </button>
      <button
        v-if="props.onDismiss"
        type="button"
        :aria-label="t.dismiss(s.label)"
        class="me-1 grid size-5 shrink-0 place-items-center rounded-full text-muted-foreground outline-none hover:bg-nq-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus"
        @click="props.onDismiss?.(s.id)"
      >
        <X aria-hidden="true" class="size-3" />
      </button>
    </span>
  </div>
</template>
