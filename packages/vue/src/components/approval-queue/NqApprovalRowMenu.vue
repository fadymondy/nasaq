<script setup lang="ts">
import { NqContextMenu, NqContextMenuContent, NqContextMenuTrigger } from "../context-menu";

// Right-click, Shift+F10 or the Menu key on an item opens the same actions as its buttons.
defineProps<{ enabled: boolean }>();
</script>

<template>
  <slot v-if="!enabled" />
  <NqContextMenu v-else>
    <NqContextMenuTrigger><slot /></NqContextMenuTrigger>
    <NqContextMenuContent><slot name="menu" /></NqContextMenuContent>
  </NqContextMenu>
</template>
