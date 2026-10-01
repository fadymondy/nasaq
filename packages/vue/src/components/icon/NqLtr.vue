<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** Isolates left-to-right content (codes, emails, URLs, numbers with units) inside RTL text. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="ltr" dir="ltr" :class="cn('[unicode-bidi:isolate]', props.class)"><slot /></span>
</template>
