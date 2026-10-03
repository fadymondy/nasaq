<script setup lang="ts">
import { NqErrorTracking, type ErrorIssue, type ErrorStatus } from "@fadymondy/nasaq/vue";

const issues: ErrorIssue[] = [
  {
    id: "e1",
    title: "TypeError: Cannot read properties of undefined",
    culprit: "checkout/cart.ts in totals",
    level: "error",
    status: "unresolved",
    count: 482,
    users: 61,
    firstSeen: "2026-09-20T09:00:00Z",
    lastSeen: "2026-09-30T08:12:00Z",
    series: [2, 4, 9, 14, 30, 41, 58],
    release: "1.4.2",
    environment: "production",
    tags: { browser: "Chrome 128", route: "/checkout" },
    frames: [{ file: "src/checkout/cart.ts", fn: "totals", line: 42, column: 7, inApp: true, context: [{ line: 41, code: "const items = cart.items;" }, { line: 42, code: "return items.map((i) => i.price)" }] }],
    breadcrumbs: [{ at: "2026-09-30T08:11:00Z", type: "ui", message: "Clicked Pay" }],
    diagnostics: { console: [{ at: "2026-09-30T08:11:00Z", level: "error", message: "boom" }], network: [{ at: "2026-09-30T08:11:00Z", method: "POST", url: "/api/pay", status: 500, duration: 1400 }] },
  },
  { id: "e2", title: "NetworkError: timeout", level: "warning", status: "resolved", count: 12, firstSeen: "2026-09-01T09:00:00Z", lastSeen: "2026-09-05T08:00:00Z", series: [3, 3, 2, 2, 1, 1] },
];

// Your API call. Resolve { error } to show why it failed.
async function setStatus(issue: ErrorIssue, status: ErrorStatus) {
  const res = await fetch(`/api/errors/${issue.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
  if (!res.ok) return { error: "Could not update the error." };
}
</script>

<template>
  <NqErrorTracking :issues="issues" :on-status-change="setStatus" />
</template>
