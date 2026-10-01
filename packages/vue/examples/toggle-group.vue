<script setup lang="ts">
import { NqToggle, NqToggleGroup } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqToggleGroup :default-value="['list']" aria-label="View mode">
    <NqToggle value="list">List</NqToggle>
    <NqToggle value="grid">Grid</NqToggle>
  </NqToggleGroup>
</template>
