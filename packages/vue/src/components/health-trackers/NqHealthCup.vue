<script setup lang="ts">
import { cn } from "../../lib/cn";
import type { CupState } from "./health-trackers-logic";

// One drinking glass. The shape is drawn here, it is not a brand mark.
const props = defineProps<{ state: CupState }>();
</script>

<template>
  <svg viewBox="0 0 24 32" aria-hidden="true" class="size-full">
    <path
      d="M4 4 h16 l-2 24 a2 2 0 0 1 -2 2 h-8 a2 2 0 0 1 -2 -2 z"
      stroke-width="1.6"
      stroke-linejoin="round"
      :class="cn(props.state === 'filled' ? 'fill-nq-success stroke-nq-success' : 'fill-transparent', props.state === 'next' && 'stroke-primary', props.state === 'empty' && 'stroke-nq-line-strong')"
    />
    <path v-if="props.state === 'filled'" d="M8 17 l3 3 l6 -7" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" class="stroke-background" />
  </svg>
</template>
