<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A vertical list of events, newest first by convention, with a rail on the inline-start side.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ol data-slot="timeline" :class="cn('m-0 flex list-none flex-col p-0', props.class)"><slot /></ol>
</template>
