<script setup lang="ts">
import { ChevronDown, ChevronUp, Search, X } from "lucide-vue-next";
import { onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqInput } from "../field";
import { useFormatNumber } from "../numeric";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// The find bar of a thread: a field, "3 of 12", previous and next (Enter, Shift+Enter) and close (Escape).
const props = defineProps<{
  /** Number of matches in the thread. */
  total: number;
  /** Current match, 0-based. */
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  labels?: Partial<InboxLabels>;
  class?: HTMLAttributes["class"];
}>();
const query = defineModel<string>("query", { default: "" });
const t = useInboxLabels(() => props.labels);
const fmt = useFormatNumber();
const bar = ref<HTMLElement | null>(null);

onMounted(() => bar.value?.querySelector("input")?.focus());

function go(delta: number) {
  if (props.total > 0) props.onIndexChange((props.index + delta + props.total) % props.total);
}
function onKey(e: KeyboardEvent) {
  if (e.key === "Enter") {
    e.preventDefault();
    go(e.shiftKey ? -1 : 1);
  } else if (e.key === "Escape") {
    e.preventDefault();
    props.onClose();
  }
}
</script>

<template>
  <div ref="bar" data-slot="thread-search" role="search" :aria-label="t.find" :class="cn('flex items-center gap-2 border-b border-border bg-card px-3 py-2', props.class)">
    <Search aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
    <NqInput v-model="query" type="search" :placeholder="t.findPlaceholder" :aria-label="t.findPlaceholder" class="h-8 flex-1" @keydown="onKey" />
    <span role="status" class="min-w-16 text-center text-caption tabular-nums text-muted-foreground">{{ query.trim() ? (props.total > 0 ? t.findCount(fmt(props.index + 1), fmt(props.total)) : t.findNone) : "" }}</span>
    <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.findPrev" :disabled="props.total === 0" @click="go(-1)"><ChevronUp aria-hidden="true" /></NqButton>
    <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.findNext" :disabled="props.total === 0" @click="go(1)"><ChevronDown aria-hidden="true" /></NqButton>
    <NqButton type="button" variant="ghost" size="icon-sm" :aria-label="t.findClose" @click="props.onClose()"><X aria-hidden="true" /></NqButton>
  </div>
</template>
