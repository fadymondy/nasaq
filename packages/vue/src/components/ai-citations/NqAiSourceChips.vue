<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { copilotHostOf, copilotIsSafeUrl } from "../copilot-chat";
import { NqNum } from "../numeric";
import { aiCitationsWords, type AiCitationsLabels } from "./labels";
import type { AiCitationSource } from "./types";

// A row of numbered source chips with the host underneath. Hovering one lights the matching marker and evidence card.
const props = defineProps<{
  sources: readonly AiCitationSource[];
  /** Source ids the text cites. Sources not in it are dimmed and marked not cited. Omit to treat all as cited. */
  citedIds?: readonly string[];
  activeId?: string | null;
  onActiveChange?: (id: string | null) => void;
  /** Called when a chip is pressed. Without it, a chip with a safe url is a link. */
  onSelect?: (source: AiCitationSource, index: number) => void;
  label?: string;
  labels?: Partial<AiCitationsLabels>;
  class?: HTMLAttributes["class"];
}>();
const nq = useNasaq();
const t = computed(() => aiCitationsWords(nq.locale.value, props.labels));
const isCited = (s: AiCitationSource) => !props.citedIds || props.citedIds.includes(s.id);
const chipClass = (s: AiCitationSource) =>
  cn(
    "flex max-w-56 items-center gap-2 rounded-control border border-border bg-card px-2 py-1.5 text-start outline-none transition-colors duration-150 ease-nq",
    "hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus",
    props.activeId === s.id && "border-nq-accent bg-nq-hover",
    !isCited(s) && "opacity-60",
  );
const hover = (id: string) => ({
  onMouseenter: () => props.onActiveChange?.(id),
  onMouseleave: () => props.onActiveChange?.(null),
  onFocus: () => props.onActiveChange?.(id),
  onBlur: () => props.onActiveChange?.(null),
});
</script>

<template>
  <div v-if="props.sources.length > 0" data-slot="ai-source-chips" role="group" :aria-label="props.label ?? t.sourcesLabel" :class="cn('flex flex-col gap-1.5', props.class)">
    <span class="text-caption text-muted-foreground">{{ props.label ?? t.sources }}</span>
    <ol class="flex flex-wrap gap-2">
      <li v-for="(s, i) in props.sources" :key="s.id" class="min-w-0">
        <component
          :is="props.onSelect ? 'button' : copilotIsSafeUrl(s.url) ? 'a' : 'span'"
          :type="props.onSelect ? 'button' : undefined"
          :data-active="props.onSelect && props.activeId === s.id ? '' : undefined"
          :href="!props.onSelect && copilotIsSafeUrl(s.url) ? s.url : undefined"
          :target="!props.onSelect && copilotIsSafeUrl(s.url) ? '_blank' : undefined"
          :rel="!props.onSelect && copilotIsSafeUrl(s.url) ? 'noopener noreferrer' : undefined"
          :class="chipClass(s)"
          v-bind="hover(s.id)"
          @click="props.onSelect?.(s, i)"
        >
          <span class="grid size-4 shrink-0 place-items-center rounded-full bg-secondary text-[10px] tabular-nums text-muted-foreground"><NqNum :value="i + 1" /></span>
          <span class="flex min-w-0 flex-col">
            <span dir="auto" class="truncate text-caption text-foreground">{{ s.title }}</span>
            <bdi v-if="copilotHostOf(s.url)" dir="ltr" class="truncate text-[11px] text-muted-foreground">{{ copilotHostOf(s.url) }}</bdi>
            <span v-if="!isCited(s)" class="text-[11px] text-muted-foreground">{{ t.notCited }}</span>
          </span>
        </component>
      </li>
    </ol>
  </div>
</template>
