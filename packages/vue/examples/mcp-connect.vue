<script setup lang="ts">
import { NqMcpConnect } from "@fadymondy/nasaq/vue";

const token = "nsq_live_a1b2c3d4e5f6g7h8i9j0";
const onTest = async () => ({ ok: true, tools: 12 });
</script>

<template>
  <NqMcpConnect server-url="https://mcp.example.com/mcp" server-name="example" :token="token" :on-test="onTest" />
</template>
