<script setup lang="ts">
import { NqChatWidget, type WidgetMessage } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const messages = ref<WidgetMessage[]>([]);

async function send(text: string, _files: File[]) {
  messages.value.push({ id: String(messages.value.length + 1), from: "visitor", text, at: Date.now() });
}
</script>

<template>
  <div class="relative h-[34rem] w-full">
    <NqChatWidget placement="absolute" default-open :messages="messages" :agent="{ name: 'Layla' }" :starters="['Pricing', 'Talk to sales']" :on-send="send" />
  </div>
</template>
