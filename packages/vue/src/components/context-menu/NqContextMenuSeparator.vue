<script setup lang="ts">
import { ContextMenuSeparator } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

const props = defineProps<{ class?: HTMLAttributes["class"] }>();
</script>

<template>
  <ContextMenuSeparator data-slot="context-menu-separator" :class="cn('-mx-1.5 my-1.5 h-px bg-border', props.class)" />
</template>
