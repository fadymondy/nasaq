<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqNum } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTrigger } from "../popover";
import NqAiEvidenceCard from "./NqAiEvidenceCard.vue";
import { aiCitationsWords, type AiCitationsLabels } from "./labels";
import type { AiCitationSource } from "./types";

// The small numbered button that stands for a `[n]` in the text. Hover (after 150 ms), focus or press it to see the passage behind it.
const props = defineProps<{
  n: number;
  source: AiCitationSource;
  active?: boolean;
  onActiveChange?: (id: string | null) => void;
  labels?: Partial<AiCitationsLabels>;
}>();
const nq = useNasaq();
const t = computed(() => aiCitationsWords(nq.locale.value, props.labels));
const open = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
const later = (value: boolean) => {
  clearTimeout(timer);
  timer = setTimeout(() => setOpen(value), 150);
};
const hold = () => clearTimeout(timer);
function setOpen(value: boolean) {
  clearTimeout(timer);
  open.value = value;
  props.onActiveChange?.(value ? props.source.id : null);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <NqPopover :open="open" @update:open="setOpen">
    <NqPopoverTrigger
      :aria-label="t.citation(props.n, props.source.title)"
      data-slot="ai-citation-marker"
      :data-active="props.active ? '' : undefined"
      :class="
        cn(
          'mx-0.5 inline-grid h-4 min-w-4 -translate-y-0.5 place-items-center rounded-full border border-border bg-secondary px-1 align-middle text-[10px] leading-none tabular-nums text-foreground',
          'cursor-pointer outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus',
          'data-active:border-nq-accent data-active:bg-nq-accent/15 data-popup-open:border-nq-accent',
        )
      "
      @pointerenter="later(true)"
      @pointerleave="later(false)"
    >
      <NqNum :value="props.n" />
    </NqPopoverTrigger>
    <NqPopoverContent class="w-80 p-0" side="top" @pointerenter="hold" @pointerleave="later(false)">
      <NqAiEvidenceCard :source="props.source" :index="props.n" compact :labels="props.labels" class="border-0 bg-transparent" />
    </NqPopoverContent>
  </NqPopover>
</template>
