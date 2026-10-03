<script setup lang="ts">
import { NqEmployeeKpiDashboard, NqPipelineReport, NqProfitabilityReport, NqSupportStatsReport } from "@fadymondy/nasaq/vue";

const money = { style: "currency", currency: "SAR", maximumFractionDigits: 0 } as const;
const rows = [
  { id: "p1", name: "Website rebuild", revenue: 120000, cost: 78000, hours: 410 },
  { id: "p2", name: "Mobile app", revenue: 90000, cost: 96000, hours: 520 },
];
const stages = [
  { id: "lead", label: "Leads", count: 240, value: 960000 },
  { id: "proposal", label: "Proposal", count: 80, value: 640000 },
  { id: "won", label: "Won", count: 24, value: 210000, won: true },
];
const employees = [{ id: "e1", name: "Sara", role: "Designer", target: 140, actual: 152 }];
const actions = (e: { name: string }) => [{ id: "open", label: `Open ${e.name}`, onSelect: () => {} }];
const summary = { open: 42, firstResponseMinutes: 38, resolutionMinutes: 310, csat: 0.92, slaRate: 0.87 };
const volume = [
  { date: "2026-09-27", created: 31, resolved: 28 },
  { date: "2026-09-28", created: 27, resolved: 30 },
  { date: "2026-09-29", created: 35, resolved: 29 },
];
const byStatus = [
  { id: "open", label: "Open", value: 42 },
  { id: "pending", label: "Pending", value: 18 },
  { id: "solved", label: "Solved", value: 120 },
];
const agents = [
  { id: "a1", name: "Omar", assigned: 60, resolved: 52, firstResponseMinutes: 25, csat: 0.94 },
  { id: "a2", name: "Lina", assigned: 48, resolved: 40, firstResponseMinutes: 140, csat: 0.9 },
];
</script>

<template>
  <div class="flex flex-col gap-8">
    <NqProfitabilityReport :format="money" :rows="rows" />
    <NqPipelineReport default-view="table" :format="{ style: 'currency', currency: 'SAR', notation: 'compact' }" :stages="stages" />
    <NqEmployeeKpiDashboard measure="Billable hours" :employees="employees" :actions="actions" />
    <NqSupportStatsReport :summary="summary" :volume="volume" :by-status="byStatus" :agents="agents" />
  </div>
</template>
