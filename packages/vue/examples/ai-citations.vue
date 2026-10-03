<script setup lang="ts">
import { ref } from "vue";
import { NqAiCitedAnswer, type AiCitationSource } from "@fadymondy/nasaq/vue";

const sources: AiCitationSource[] = [
  { id: "s1", title: "Q3 report", url: "https://example.com/q3", quote: "Revenue grew 12% year on year.", locator: "p. 4" },
  { id: "s2", title: "Board notes", quote: "Churn fell to 2.1%." },
];
const feedback = ref<"up" | "down" | null>(null);
</script>

<template>
  <NqAiCitedAnswer
    text="Revenue grew 12% [1] while churn fell [2]."
    :sources="sources"
    :provenance="{ model: 'claude-sonnet', latencyMs: 1240, grounded: true, confidence: 0.86 }"
    :feedback="feedback"
    :on-feedback="(v) => (feedback = v)"
  />
</template>
