<script setup lang="ts">
import { NqButton, NqTooltip } from "@fadymondy/nasaq/vue";
import { Settings } from "lucide-vue-next";
</script>

<template>
  <NqTooltip content="Settings">
    <NqButton size="icon" variant="ghost" aria-label="Settings">
      <Settings />
    </NqButton>
  </NqTooltip>
</template>
