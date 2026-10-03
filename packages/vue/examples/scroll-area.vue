<script setup lang="ts">
import { NqScrollArea } from "@fadymondy/nasaq/vue";

const items = Array.from({ length: 24 }, (_, i) => `Note ${i + 1}`);
</script>

<template>
  <NqScrollArea aria-label="Notes" class="h-64 w-72 rounded-card border border-border">
    <ul class="flex flex-col gap-2 p-3 text-body-sm">
      <li v-for="item in items" :key="item">{{ item }}</li>
    </ul>
  </NqScrollArea>
</template>
