<script setup lang="ts">
import { NqButton, NqCopilotLauncher, NqCopilotProvider, type CopilotEvent, type CopilotTransport } from "@fadymondy/nasaq/vue";

// Swap this for your backend: fetch("/api/copilot", { method: "POST", body, signal }) and yield one event per line.
const transport: CopilotTransport = async function* ({ message }, { signal }) {
  const words = `You asked: ${message.text}. This is a demo answer that streams in.`.split(" ");
  for (const word of words) {
    if (signal.aborted) return;
    await new Promise((r) => setTimeout(r, 40));
    yield { type: "delta", text: `${word} ` } satisfies CopilotEvent;
  }
  yield { type: "done" } satisfies CopilotEvent;
};
</script>

<template>
  <div class="relative h-96 w-full">
    <NqCopilotProvider :transport="transport" greeting="Hi! Ask me anything." :dock="{ launcher: false, placement: 'absolute' }">
      <template #default="{ copilot }">
        <div class="flex items-start gap-2">
          <NqCopilotLauncher />
          <NqButton variant="ghost" size="sm" @click="copilot.open({ message: 'Summarise this order', autoSend: true })">Ask about this order</NqButton>
        </div>
      </template>
    </NqCopilotProvider>
  </div>
</template>
