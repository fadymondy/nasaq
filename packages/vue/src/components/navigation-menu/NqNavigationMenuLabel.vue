<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A section title above a link list, for panels with more than one group.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <p data-slot="navigation-menu-label" :class="cn('m-0 px-2.5 pb-1 text-caption font-medium text-muted-foreground', props.class)"><slot /></p>
</template>
