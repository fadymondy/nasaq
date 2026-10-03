<script setup lang="ts">
import { ref } from "vue";
import { NqCopilotDock, type CopilotMessage } from "@fadymondy/nasaq/vue";

const messages = ref<CopilotMessage[]>([]);
const send = (text: string) => messages.value.push({ id: String(messages.value.length + 1), role: "user", text });
</script>

<template>
  <NqCopilotDock :messages="messages" :on-send="send" :on-stop="() => {}" :starters="['Summarise my week']" />
</template>
