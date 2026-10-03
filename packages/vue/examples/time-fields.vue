<script setup lang="ts">
import { NqTimeField, NqTimeZoneField } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const time = ref<string | null>("09:00");
const zone = ref<string | null>("Asia/Riyadh");
</script>

<template>
  <div class="flex max-w-sm flex-col gap-3">
    <NqTimeField v-model="time" aria-label="Remind me at" />
    <NqTimeZoneField v-model="zone" />
  </div>
</template>
