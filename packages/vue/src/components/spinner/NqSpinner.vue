<script setup lang="ts">
import { LoaderCircle } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{
  /** When set, the spinner is announced (`role="status"`) with this text. Omit for a decorative spinner. */
  label?: string;
  class?: HTMLAttributes["class"];
}>();
</script>

<template>
  <span v-if="props.label" role="status" class="inline-flex">
    <LoaderCircle data-slot="spinner" aria-hidden="true" :class="cn('size-4 animate-spin motion-reduce:animate-none', props.class)" />
    <span class="sr-only">{{ props.label }}</span>
  </span>
  <LoaderCircle v-else data-slot="spinner" aria-hidden="true" :class="cn('size-4 animate-spin motion-reduce:animate-none', props.class)" />
</template>
