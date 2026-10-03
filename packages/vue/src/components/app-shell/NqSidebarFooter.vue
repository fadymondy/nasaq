<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="sidebar-footer" :class="cn('mt-auto flex shrink-0 flex-col gap-1 pt-2', props.class)"><slot /></div>
</template>
