<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { colorToCss } from "./color-picker-logic";

// The little colour square inside the ColorPicker. Not exported.
const props = defineProps<{ color?: string | null; class?: HTMLAttributes["class"] }>();
const style = computed(() => (props.color ? { backgroundColor: colorToCss(props.color) } : undefined));
</script>

<template>
  <span
    aria-hidden="true"
    data-slot="color-picker-chip"
    :style="style"
    :class="cn('inline-block size-5 shrink-0 rounded-[6px] border border-nq-line-strong', !props.color && 'border-dashed bg-transparent', props.class)"
  />
</template>
