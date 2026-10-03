<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ol data-slot="breadcrumb-list" :class="cn('flex min-w-0 flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground', props.class)"><slot /></ol>
</template>
