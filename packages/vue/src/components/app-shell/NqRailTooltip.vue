<script setup lang="ts">
import type { PopupSide } from "../popover/popup";
import { NqTooltip } from "../tooltip";

// Internal. Wraps the trigger in a tooltip only while `enabled` (the collapsed rail), like React's `collapsed && name ? <Tooltip> : link`.
defineProps<{ enabled: boolean; content?: string; side?: PopupSide }>();
</script>

<template>
  <NqTooltip v-if="enabled" :content="content" :side="side ?? 'inline-end'"><slot /></NqTooltip>
  <slot v-else />
</template>
