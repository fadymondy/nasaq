<script setup lang="ts">
import { NqEngineDetails, type HistoryDay } from "@fadymondy/nasaq/vue";

const history: HistoryDay[] = Array.from({ length: 7 }, (_, i) => ({
  date: `2026-09-${String(23 + i).padStart(2, "0")}`,
  verdict: i === 3 ? "off_protocol" : i === 0 ? "unevaluated" : "on_protocol",
  entries: 4 + i,
}));

// Load that window and pass it back through `history`.
async function loadWindow(days: number) {
  void days;
}
</script>

<template>
  <NqEngineDetails
    :snapshot="{ engine: 'hydration', state: 'idle', totalMl: 1500, dailyCapMl: 5000, unitMl: 250, unitsLogged: 6, unitsTotal: 20 }"
    :history="history"
    :windows="[7, 30, 365]"
    :on-window-change="loadWindow"
    :records="[{ id: '1', at: '2026-09-29T07:10:00Z', title: '250 mL logged', tone: 'success' }]"
    back-href="/health"
  />
</template>
