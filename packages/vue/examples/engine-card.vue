<script setup lang="ts">
import { NqEngineCard, NqEngineCardGrid } from "@fadymondy/nasaq/vue";

const hydration = { engine: "hydration", state: "idle", totalMl: 750, dailyCapMl: 5000, unitMl: 250, unitsLogged: 3, unitsTotal: 20 } as const;
const caffeine = { engine: "caffeine", state: "awaiting_wake", blockMinutes: 90, violationsToday: 0, cupsToday: 0 } as const;
const triggers = { engine: "triggers", triggerBearing: 1, safe: 3, unclassified: 0, families: [{ id: "gout", count: 1 }] } as const;

// Resolve with nothing on success, or { error } to show the server message.
async function onAction() {
  await new Promise((resolve) => setTimeout(resolve, 400));
}
</script>

<template>
  <NqEngineCardGrid>
    <NqEngineCard :snapshot="hydration" :on-action="onAction" detail-href="/engines/hydration" />
    <NqEngineCard :snapshot="caffeine" :on-action="onAction" />
    <NqEngineCard :snapshot="triggers" />
  </NqEngineCardGrid>
</template>
