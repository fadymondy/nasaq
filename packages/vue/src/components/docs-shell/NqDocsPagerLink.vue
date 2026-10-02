<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import type { DocsNavNode } from "./docs-model";

// The previous / next link under a docs page. Internal to NqDocsShell.
const props = defineProps<{ node: DocsNavNode; label: string; direction: "prev" | "next" }>();
const emit = defineEmits<{ navigate: [id: string] }>();
</script>

<template>
  <button
    type="button"
    :class="
      cn(
        'flex min-w-0 flex-col gap-1 rounded-card border border-border p-4 text-start outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus',
        props.direction === 'next' && 'sm:col-start-2 sm:text-end',
      )
    "
    @click="emit('navigate', props.node.id)"
  >
    <span :class="cn('flex items-center gap-1 text-caption text-muted-foreground', props.direction === 'next' && 'sm:justify-end')">
      <NqIcon v-if="props.direction === 'prev'" :icon="ChevronLeft" directional class="size-3.5" />
      {{ props.label }}
      <NqIcon v-if="props.direction === 'next'" :icon="ChevronRight" directional class="size-3.5" />
    </span>
    <span dir="auto" class="truncate font-medium">{{ props.node.title }}</span>
  </button>
</template>
