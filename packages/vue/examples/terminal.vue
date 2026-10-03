<script setup lang="ts">
import { NqTerminal } from "@fadymondy/nasaq/vue";

const lines = [
  { kind: "command" as const, text: "pnpm build" },
  "\u001b[32m✓\u001b[0m compiled 214 modules",
  { kind: "error" as const, text: "warning: chunk is larger than 500 kB" },
];
</script>

<template>
  <NqTerminal title="~/app" streaming :lines="lines" />
</template>
