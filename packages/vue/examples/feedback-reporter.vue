<script setup lang="ts">
import { NqFeedbackFloatingLauncher } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

// Open your report dialog from the click (the dialog itself comes from your feedback SDK).
const open = ref(false);
</script>

<template>
  <div class="relative h-40">
    <NqFeedbackFloatingLauncher shape="pill" position="bottom-end" placement="absolute" @click="open = true" />
    <p v-if="open" class="text-body-sm">Report dialog open</p>
  </div>
</template>
