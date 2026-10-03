<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="sidebar-header" :class="cn('flex shrink-0 flex-col gap-2', props.class)"><slot /></div>
</template>
