<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Inline code inside a sentence. Left-to-right and isolated, so `npm i` keeps its order in Arabic text.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <code data-slot="inline-code" dir="ltr" :class="cn('rounded-[4px] border border-border bg-secondary px-1 py-0.5 font-mono text-[0.9em] text-foreground [unicode-bidi:isolate]', props.class)"><slot /></code>
</template>
