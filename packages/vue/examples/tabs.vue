<script setup lang="ts">
import { NqTabs, NqTabsIndicator, NqTabsList, NqTabsPanel, NqTabsTab } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqTabs default-value="board">
    <NqTabsList>
      <NqTabsTab value="board">Board</NqTabsTab>
      <NqTabsTab value="timeline">Timeline</NqTabsTab>
      <NqTabsIndicator />
    </NqTabsList>
    <NqTabsPanel value="board">Board view</NqTabsPanel>
    <NqTabsPanel value="timeline">Timeline view</NqTabsPanel>
  </NqTabs>
</template>
