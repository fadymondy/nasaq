<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="skeleton" aria-hidden="true" :class="cn('rounded-[4px] bg-secondary motion-safe:animate-pulse', props.class)" />
</template>
