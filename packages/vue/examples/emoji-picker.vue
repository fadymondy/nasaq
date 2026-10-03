<script setup lang="ts">
import { ref } from "vue";
import { NqEmojiPicker } from "@fadymondy/nasaq/vue";

const text = ref("");
</script>

<template>
  <div class="flex items-center gap-2">
    <input v-model="text" aria-label="Message" />
    <NqEmojiPicker @emoji-select="({ emoji }) => (text += emoji)" />
  </div>
</template>
