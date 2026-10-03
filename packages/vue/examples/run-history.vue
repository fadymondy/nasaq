<script setup lang="ts">
import { NqRunHistory, type RunRecord } from "@fadymondy/nasaq/vue";

// Your data: any order, newest shown first.
const runs: RunRecord[] = [
  {
    id: "run_8f2a",
    name: "Nightly sync",
    status: "error",
    startedAt: "2026-09-29T08:40:00Z",
    durationMs: 4200,
    trigger: "Schedule",
    error: "Upstream returned 502",
    steps: [
      { id: "fetch", name: "Fetch orders", status: "success", startedAtMs: 0, durationMs: 1200, output: { count: 42 } },
      { id: "push", name: "Push to warehouse", status: "error", startedAtMs: 1200, durationMs: 3000, error: "Upstream returned 502", logs: ["POST /v1/orders", "502 Bad Gateway"] },
    ],
    spans: [
      { id: "s1", name: "sync", service: "worker", startMs: 0, durationMs: 4200 },
      { id: "s2", parentId: "s1", name: "POST /v1/orders", service: "http", startMs: 1200, durationMs: 3000, error: true, attributes: { "http.status": 502 } },
    ],
  },
  {
    id: "run_7c10",
    name: "Nightly sync",
    status: "success",
    startedAt: "2026-09-28T08:40:00Z",
    durationMs: 2100,
    trigger: "Schedule",
    steps: [
      { id: "fetch", name: "Fetch orders", status: "success", startedAtMs: 0, durationMs: 1100 },
      { id: "push", name: "Push to warehouse", status: "success", startedAtMs: 1100, durationMs: 1000 },
    ],
  },
];

// Your API call.
const rerun = async (run: RunRecord) => {
  await fetch(`/api/runs/${run.id}/retry`, { method: "POST" });
};
</script>

<template>
  <NqRunHistory :runs="runs" :on-retry="rerun" />
</template>
