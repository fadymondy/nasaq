<script setup lang="ts">
import { ChevronDown, Copy, Pencil, Trash2 } from "lucide-vue-next";
import { NqButton, NqDropdownMenu, NqDropdownMenuContent, NqDropdownMenuItem, NqDropdownMenuSeparator, NqDropdownMenuTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqDropdownMenu>
    <NqDropdownMenuTrigger as-child>
      <NqButton>Actions <ChevronDown /></NqButton>
    </NqDropdownMenuTrigger>
    <NqDropdownMenuContent>
      <NqDropdownMenuItem shortcut="E"><Pencil /> Edit</NqDropdownMenuItem>
      <NqDropdownMenuItem shortcut="⌘D"><Copy /> Duplicate</NqDropdownMenuItem>
      <NqDropdownMenuSeparator />
      <NqDropdownMenuItem variant="danger"><Trash2 /> Delete</NqDropdownMenuItem>
    </NqDropdownMenuContent>
  </NqDropdownMenu>
</template>
