<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

/** The current page: not a link, announced as the current location. */
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="breadcrumb-page" aria-current="page" :class="cn('truncate text-foreground', props.class)"><slot /></span>
</template>
