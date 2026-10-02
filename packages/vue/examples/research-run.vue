<script setup lang="ts">
import { ref } from "vue";
import { NqResearchRun, type ResearchRunData } from "@fadymondy/nasaq/vue";

const run = ref<ResearchRunData | null>({
  id: "r1",
  question: "Why did churn fall in Q3?",
  status: "done",
  model: "claude-sonnet",
  confidence: 0.82,
  finishedAt: "2026-09-29T08:55:00Z",
  answer: [
    { id: "a1", text: "Churn fell to 2.1% after the onboarding change.", cites: ["e1"] },
    { id: "a2", text: "Renewals also grew, which lifted revenue by 12%.", cites: ["e2"] },
  ],
  evidence: [
    { id: "e1", sourceId: "s1", quote: "Churn fell to 2.1% after the onboarding change.", relevance: 0.91 },
    { id: "e2", sourceId: "s2", quote: "Revenue grew 12% year over year, driven by renewals.", relevance: 0.78 },
    { id: "e3", sourceId: "s2", quote: "Support tickets stayed flat.", relevance: 0.4 },
  ],
  sources: [
    { id: "s1", title: "Board notes", snippet: "Churn fell to 2.1%." },
    { id: "s2", title: "Q3 report", url: "https://example.com/q3" },
  ],
});

function ask(question: string) {
  run.value = { id: "r2", question, status: "running", stages: [{ id: "g1", label: "Searching", state: "running" }, { id: "g2", label: "Reading", state: "pending" }] };
}
</script>

<template>
  <NqResearchRun :run="run" :on-ask="ask" :suggestions="['Why did churn fall in Q3?']" />
</template>
