<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqKbd } from "../text";

// A shortcut as one string ("⌘S") or a list of keys (["Ctrl", "S"]). Always left-to-right.
const props = defineProps<{ keys?: readonly string[]; class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="menubar-shortcut" dir="ltr" :class="cn('ms-auto inline-flex items-center gap-1 ps-6', props.class)">
    <template v-if="props.keys"><NqKbd v-for="key in props.keys" :key="key">{{ key }}</NqKbd></template>
    <NqKbd v-else-if="$slots.default"><slot /></NqKbd>
  </span>
</template>
