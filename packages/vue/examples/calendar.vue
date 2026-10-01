<script setup lang="ts">
import { ref } from "vue";
import { NqCalendar, type DateRange } from "@fadymondy/nasaq/vue";

const day = ref<Date | null>(new Date(2026, 8, 15));
const range = ref<DateRange>({ from: new Date(2026, 8, 8), to: new Date(2026, 8, 12) });
</script>

<template>
  <div class="flex flex-wrap gap-8">
    <NqCalendar v-model="day" :today="new Date(2026, 8, 15)" locale="en" />
    <NqCalendar v-model="range" mode="range" :today="new Date(2026, 8, 15)" locale="en" />
  </div>
</template>
