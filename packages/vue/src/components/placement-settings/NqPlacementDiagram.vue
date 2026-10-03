<script setup lang="ts">
import { cn } from "../../lib/cn";
import type { PlacementMode } from "./placement-logic";

// A small picture of the app shell, with where this item would sit filled in.
const props = defineProps<{ mode: PlacementMode }>();
const on = "bg-primary";
</script>

<template>
  <span
    aria-hidden="true"
    data-slot="placement-diagram"
    :class="
      cn(
        'relative block h-11 w-16 shrink-0 overflow-hidden rounded-control border bg-background',
        props.mode === 'hidden' ? 'border-dashed border-nq-line-strong opacity-60' : 'border-border',
      )
    "
  >
    <span class="absolute inset-y-0 start-0 w-3.5 border-e border-border bg-muted" />
    <span class="absolute inset-x-0 top-0 h-2.5 border-b border-border bg-muted" />
    <span class="absolute start-1 top-4 h-0.5 w-1.5 rounded-full bg-nq-line-strong" />
    <span class="absolute start-1 top-6 h-0.5 w-1.5 rounded-full bg-nq-line-strong" />
    <span v-if="props.mode === 'sidebar'" :class="cn('absolute start-0.5 top-[1.875rem] h-1 w-2.5 rounded-full', on)" />
    <span v-if="props.mode === 'header'" :class="cn('absolute end-1 top-0.5 h-1.5 w-3 rounded-full', on)" />
    <span v-if="props.mode === 'sideover'" class="absolute inset-y-0 end-0 w-5 border-s-2 border-primary bg-nq-selected" />
    <span v-if="props.mode === 'fixed'" :class="cn('absolute bottom-1 end-1 size-2.5 rounded-full', on)" />
  </span>
</template>
