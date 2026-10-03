<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <caption data-slot="table-caption" :class="cn('mt-3 text-caption text-muted-foreground', props.class)"><slot /></caption>
</template>
