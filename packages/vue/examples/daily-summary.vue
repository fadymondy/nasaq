<script setup lang="ts">
import { ref } from "vue";
import { NqDailySummary, addCivilDays, type DailySummaryData } from "@fadymondy/nasaq/vue";

const summary = ref<DailySummaryData>({
  date: "2026-09-29",
  waterMl: 2400,
  meals: { total: 4, safe: 3, unsafe: 1 },
  caffeine: { total: 2, clean: 2, sugar: 0 },
  pomodorosCompleted: 5,
  shutdownViolations: 0,
  steps: 8421,
  sleepMinutes: 432,
  activeEnergyKcal: 512,
  restingHeartRate: 61,
  source: "watch",
});

// A real app loads the neighbouring day here.
function load(date: string) {
  summary.value = { ...summary.value, date };
}
</script>

<template>
  <NqDailySummary :summary="summary" :water-goal-ml="3000" max-date="2026-09-29" :on-date-change="load" />
</template>
