<script setup lang="ts">
import { NqGlanceRow, NqTrayPopover } from "@fadymondy/nasaq/vue";
import { Clock } from "lucide-vue-next";
</script>

<template>
  <NqTrayPopover title="Today">
    <NqGlanceRow :icon="Clock" label="Timer running" value="00:42" tone="info" />
  </NqTrayPopover>
</template>
