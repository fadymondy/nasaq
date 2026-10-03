<script setup lang="ts">
import { NqStatusPage, type CheckResult, type Incident, type StatusPageMaintenance, type StatusPageService } from "@fadymondy/nasaq/vue";

const day = 86_400_000;
const history = (bad: Record<number, CheckResult> = {}): CheckResult[] => Array.from({ length: 90 }, (_, i) => bad[i] ?? "up");

const services: StatusPageService[] = [
  { id: "web", name: "Website", description: "Storefront and checkout", status: "up", days: history({ 40: "degraded" }), uptime: 99.98 },
  { id: "api", name: "API", status: "degraded", days: history({ 70: "down", 71: "degraded", 89: "degraded" }), uptime: 99.41 },
  { id: "mail", name: "Email delivery", status: "up", days: history(), uptime: 100 },
];
const incidents: Incident[] = [
  {
    id: "i1",
    title: "Elevated API latency",
    status: "monitoring",
    impact: "minor",
    startedAt: Date.now() - 2 * 3_600_000,
    services: ["API"],
    updates: [{ at: Date.now() - 3_600_000, status: "monitoring", body: "A fix is out and we are watching the numbers." }],
  },
  { id: "i2", title: "Checkout errors", status: "resolved", impact: "major", startedAt: Date.now() - 20 * day, resolvedAt: Date.now() - 20 * day + 42 * 60_000 },
];
const maintenance: StatusPageMaintenance[] = [{ id: "m1", title: "Database upgrade", description: "Read-only for about ten minutes.", startsAt: Date.now() + 3 * day, endsAt: Date.now() + 3 * day + 3_600_000 }];
</script>

<template>
  <NqStatusPage title="Acme status" :services="services" :incidents="incidents" :maintenance="maintenance" :updated-at="Date.now()">
    <template #footer><a href="#subscribe" class="underline">Subscribe to updates</a></template>
  </NqStatusPage>
</template>
