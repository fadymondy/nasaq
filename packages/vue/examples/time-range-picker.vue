<script setup lang="ts">
import { NqTimeRangePicker, type TimeRangeValue } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const value = ref<TimeRangeValue>({ kind: "relative", preset: "24h" });
</script>

<template>
  <NqTimeRangePicker v-model="value" time-zone="Asia/Riyadh" />
</template>
