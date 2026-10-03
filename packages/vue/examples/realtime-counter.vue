<script setup lang="ts">
import { NqRealtimeCounter } from "@fadymondy/nasaq/vue";
</script>

<template>
  <NqRealtimeCounter
    :value="87"
    :per-minute="[62, 70, 66, 81, 79, 87]"
    :sections="[{ id: 'pages', title: 'Top active pages', ltr: true, rows: [{ id: 'a', label: '/pricing', value: 14 }] }]"
  />
</template>
