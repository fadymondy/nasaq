<script setup lang="ts">
import { NqChatComposer, NqChatMessage, NqChatThread } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const messages = ref<{ id: number; side: "user" | "assistant"; text: string }[]>([{ id: 1, side: "assistant", text: "Hi! How can I help?" }]);
const send = (text: string) => messages.value.push({ id: messages.value.length + 1, side: "user", text });
</script>

<template>
  <div class="flex h-96 flex-col rounded-surface border border-border">
    <NqChatThread class="flex-1">
      <NqChatMessage v-for="m in messages" :key="m.id" :side="m.side" :name="m.side === 'user' ? 'You' : 'Assistant'" :time="Date.now()" :text="m.text" />
    </NqChatThread>
    <div class="p-3 pt-0">
      <NqChatComposer @send="send" />
    </div>
  </div>
</template>
