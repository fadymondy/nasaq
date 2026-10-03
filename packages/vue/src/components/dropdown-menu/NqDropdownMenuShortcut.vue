<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// Shortcut hints are not mirrored: dir="ltr".
const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <span data-slot="dropdown-menu-shortcut" dir="ltr" :class="cn('ms-auto font-mono text-[11px] text-muted-foreground', props.class)"><slot /></span>
</template>
