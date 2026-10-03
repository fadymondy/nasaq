<script setup lang="ts">
import { NqQuickCapture } from "@fadymondy/nasaq/vue";

const save = async (capture: unknown) => {
  console.log("captured", capture);
};
</script>

<template>
  <NqQuickCapture presentation="panel" shortcut="Mod+Shift+K" :suggested-tags="['idea', 'todo']" :on-capture="save" />
</template>
