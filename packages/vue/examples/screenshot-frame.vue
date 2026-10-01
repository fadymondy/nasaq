<script setup lang="ts">
import { NqScreenshotFrame } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqScreenshotFrame variant="browser" title="app.mahaam.com/board" label="Mahaam board with three columns">
    <div class="grid h-48 grid-cols-3 gap-2 p-3">
      <div class="rounded-control bg-secondary" />
      <div class="rounded-control bg-secondary" />
      <div class="rounded-control bg-secondary" />
    </div>
  </NqScreenshotFrame>
</template>
