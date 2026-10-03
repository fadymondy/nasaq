<script setup lang="ts">
import { NqHealthReport, reportToCsv, type HistoryDay, type ReportDay } from "@fadymondy/nasaq/vue";

const days: ReportDay[] = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-09-${String(23 + i).padStart(2, "0")}`,
  waterMl: 2000 + i * 150,
  steps: 6000 + i * 400,
  sleepMinutes: 420 + i * 5,
  weightKg: 84.2 - i * 0.1,
  meals: { total: 3, safe: 3 - (i % 2), unsafe: i % 2 },
}));
const hydrationHistory: HistoryDay[] = days.map((d, i) => ({ date: d.date, verdict: i === 2 ? "off_protocol" : "on_protocol", entries: 6 }));

// Load that period and pass it back through `days`.
async function load(period: number) {
  void period;
}
async function exportCsv() {
  const csv = reportToCsv(days);
  void csv; // hand it to a download here
  return {};
}
</script>

<template>
  <NqHealthReport :days="days" :engines="[{ engine: 'hydration', days: hydrationHistory }]" :period="30" :on-period-change="load" :on-export="exportCsv" />
</template>
