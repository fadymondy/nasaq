<script setup lang="ts">
import { NqCodeBlock } from "@fadymondy/nasaq/vue";

const code = "export const greet = (name: string) => `Hello, ${name}`;";
</script>

<template>
  <NqCodeBlock language="ts" filename="greet.ts" line-numbers :code="code" />
</template>
