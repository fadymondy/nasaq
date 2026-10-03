<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="drawer-header" :class="cn('flex flex-col gap-1 border-b border-border px-4 pb-3.5 pe-12', props.class)"><slot /></div>
</template>
