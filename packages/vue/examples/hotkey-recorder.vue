<script setup lang="ts">
import { NqHotkeyRecorder } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const value = ref<string | null>("Mod+K");
</script>

<template>
  <NqHotkeyRecorder v-model="value" require-modifier reset-to="Mod+K" label="Command palette" />
</template>
