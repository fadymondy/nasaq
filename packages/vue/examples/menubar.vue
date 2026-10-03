<script setup lang="ts">
import { NqMenubar, NqMenubarContent, NqMenubarItem, NqMenubarMenu, NqMenubarSeparator, NqMenubarTrigger } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqMenubar aria-label="Application">
    <NqMenubarMenu>
      <NqMenubarTrigger>File</NqMenubarTrigger>
      <NqMenubarContent>
        <NqMenubarItem :shortcut="['Ctrl', 'N']">New file</NqMenubarItem>
        <NqMenubarItem :shortcut="['Ctrl', 'S']">Save</NqMenubarItem>
        <NqMenubarSeparator />
        <NqMenubarItem variant="danger">Quit</NqMenubarItem>
      </NqMenubarContent>
    </NqMenubarMenu>
  </NqMenubar>
</template>
