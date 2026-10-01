<script setup lang="ts">
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { parseAnsiRows } from "./ansi";
import NqAnsiSpans from "./NqAnsiSpans.vue";

// Renders text with ANSI colours as spans, one block per row. Use inside your own <pre>.
const props = defineProps<{ text: string; class?: string }>();
const rows = computed(() => parseAnsiRows(props.text));
</script>

<template>
  <span v-for="(spans, r) in rows" :key="r" :class="cn('block min-h-[1lh]', props.class)"><NqAnsiSpans :spans="spans" /></span>
</template>
