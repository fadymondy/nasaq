<script setup lang="ts">
import { NqResizableHandle, NqResizablePanel, NqResizablePanelGroup } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="h-72 w-full">
    <NqResizablePanelGroup orientation="horizontal">
      <NqResizablePanel id="nav" default-size="30%" min-size="15%">Navigation</NqResizablePanel>
      <NqResizableHandle with-grip />
      <NqResizablePanel id="main" default-size="70%">Content</NqResizablePanel>
    </NqResizablePanelGroup>
  </div>
</template>
