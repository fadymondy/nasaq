<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="drawer-footer" :class="cn('flex items-center gap-2 border-t border-border px-4 py-3', props.class)"><slot /></div>
</template>
