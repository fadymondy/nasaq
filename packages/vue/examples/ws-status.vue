<script setup lang="ts">
import { NqWsStatus } from "@fadymondy/nasaq/vue";
</script>

<template>
  <div class="flex flex-col items-start gap-3">
    <NqWsStatus state="connected" :latency-ms="42" />
    <NqWsStatus state="connecting" />
    <NqWsStatus state="offline" variant="inline" :on-retry="() => {}" />
  </div>
</template>
