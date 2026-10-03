<script setup lang="ts">
import { Copy, Trash2 } from "lucide-vue-next";
import { NqContextMenu, NqContextMenuContent, NqContextMenuItem, NqContextMenuSeparator, NqContextMenuTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqContextMenu>
    <NqContextMenuTrigger class="rounded-control border border-border p-4">report.pdf</NqContextMenuTrigger>
    <NqContextMenuContent>
      <NqContextMenuItem shortcut="⌘C"><Copy /> Copy</NqContextMenuItem>
      <NqContextMenuSeparator />
      <NqContextMenuItem variant="danger"><Trash2 /> Delete</NqContextMenuItem>
    </NqContextMenuContent>
  </NqContextMenu>
</template>
