<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Layout for a panel with a link list and a featured card: DOM order is visual order and mirrors in RTL.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="navigation-menu-layout" :class="cn('flex flex-col gap-3 sm:flex-row', props.class)"><slot /></div>
</template>
