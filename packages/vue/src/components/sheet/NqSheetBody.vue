<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="sheet-body" :class="cn('min-h-0 flex-1 overflow-y-auto overscroll-contain', props.class)"><slot /></div>
</template>
