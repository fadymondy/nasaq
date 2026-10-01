<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Lays out search, filters and view options above the table; wraps on narrow screens.
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <div data-slot="data-table-toolbar" :class="cn('flex flex-wrap items-center gap-2', props.class)"><slot /></div>
</template>
