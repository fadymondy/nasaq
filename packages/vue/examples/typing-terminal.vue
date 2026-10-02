<script setup lang="ts">
import { NqTypingTerminal } from "@fadymondy/nasaq/vue";

const steps = [
  { cmd: "npx create-togo-app my-shop", out: ["\u001b[32m✓\u001b[0m Installed 214 packages"] },
  { cmd: "cd my-shop && togo dev", out: ["ready on http://localhost:5173"] },
];
</script>

<template>
  <NqTypingTerminal title="~/my-shop" :steps="steps" />
</template>
