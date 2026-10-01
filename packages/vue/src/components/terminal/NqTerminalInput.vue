<script setup lang="ts">
import { ref } from "vue";

// The command line under the output: Enter submits, up and down walk the history, disabled while the handler runs.
const props = defineProps<{ prompt: string; label: string; runningLabel: string; onCommand: (command: string) => Promise<void> | void }>();

const value = ref("");
const busy = ref(false);
let history: string[] = [];
let cursor = -1;
const input = ref<HTMLInputElement | null>(null);

async function submit() {
  const command = value.value.trim();
  if (!command || busy.value) return;
  history = [command, ...history].slice(0, 50);
  cursor = -1;
  value.value = "";
  busy.value = true;
  try {
    await props.onCommand(command);
  } finally {
    busy.value = false;
    setTimeout(() => input.value?.focus(), 0);
  }
}
function onKeyDown(e: KeyboardEvent) {
  if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
  e.preventDefault();
  cursor = Math.min(history.length - 1, Math.max(-1, cursor + (e.key === "ArrowUp" ? 1 : -1)));
  value.value = cursor === -1 ? "" : (history[cursor] ?? "");
}
</script>

<template>
  <form data-slot="terminal-input" class="flex h-control shrink-0 items-center gap-2 border-t border-border px-3 font-mono text-code" @submit.prevent="submit">
    <span aria-hidden="true" class="select-none text-nq-accent-text">{{ props.prompt }}</span>
    <input
      ref="input"
      v-model="value"
      :disabled="busy"
      :aria-label="props.label"
      :placeholder="busy ? props.runningLabel : undefined"
      autocapitalize="off"
      autocomplete="off"
      autocorrect="off"
      :spellcheck="false"
      class="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
      @keydown="onKeyDown"
    />
  </form>
</template>
