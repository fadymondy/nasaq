<script setup lang="ts">
import type { Component } from "vue";
import { NqCard } from "../card";
import { NqHealthMeasure } from "../engine-card";
import { NqStatus, type StatusTone } from "../status";
import NqDailySummaryTile from "./NqDailySummaryTile.vue";

// A total split by kind. Each kind is a count with its own icon and word, so no kind depends on colour.
export interface TallyRow {
  key: string;
  tone: StatusTone;
  icon?: Component;
  label: string;
  count: number;
}
defineProps<{ icon: Component; label: string; total?: string; missing: string; rows: TallyRow[] }>();
</script>

<template>
  <NqCard data-slot="daily-summary-tally" class="gap-3 px-4 py-4">
    <NqDailySummaryTile>
      <template #icon><component :is="icon" /></template>
      {{ label }}
    </NqDailySummaryTile>
    <div class="text-h2 leading-tight text-foreground tabular-nums">
      <template v-if="total !== undefined">{{ total }}</template>
      <span v-else class="text-body-sm font-normal text-muted-foreground">{{ missing }}</span>
    </div>
    <ul v-if="rows.length > 0" class="m-0 flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-body-sm">
      <li v-for="row in rows" :key="row.key">
        <NqStatus :tone="row.tone" :icon="row.icon">
          {{ row.label }} <NqHealthMeasure :value="row.count" unit="level" :format="{ maximumFractionDigits: 0 }" />
        </NqStatus>
      </li>
    </ul>
  </NqCard>
</template>
