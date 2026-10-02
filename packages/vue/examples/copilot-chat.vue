<script setup lang="ts">
import { NqCopilotChat, type CopilotMessage } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

declare function ask(prompt: string, onToken: (t: string) => void): Promise<void>;

const messages = ref<CopilotMessage[]>([]);

async function onSend(text: string) {
  const id = crypto.randomUUID();
  messages.value = [
    ...messages.value,
    { id: `${id}u`, role: "user", text },
    { id, role: "assistant", text: "", streaming: true },
  ];
  await ask(text, (token) => {
    messages.value = messages.value.map((x) => (x.id === id ? { ...x, text: x.text + token } : x));
  });
  messages.value = messages.value.map((x) => (x.id === id ? { ...x, streaming: false } : x));
}
</script>

<template>
  <NqCopilotChat :messages="messages" :starters="['Summarise this week', 'What is overdue?']" :on-send="onSend" />
</template>
