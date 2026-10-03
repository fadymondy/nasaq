<script setup lang="ts">
import { NqArtifactList, NqArtifactRenderer, NqMarkdown, extractArtifacts } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const chosen = ref("");
const table = {
  kind: "table",
  title: "Overdue invoices",
  columns: [
    { key: "n", label: "No." },
    { key: "amt", label: "Amount", align: "end" },
  ],
  rows: [
    { n: "INV-1", amt: 1200 },
    { n: "INV-2", amt: 480 },
  ],
};

const answer = `Here is the picture for this week.

\`\`\`artifact
{ "kind": "stats", "items": [{ "label": "Revenue", "value": 48210, "delta": 0.124 }, { "label": "Open tickets", "value": 12, "delta": -0.08, "invert": true, "tone": "warning" }] }
\`\`\`

\`\`\`artifact
{ "kind": "picker", "title": "Send a reminder to", "options": [{ "value": "all", "label": "All customers" }, { "value": "late", "label": "Late payers", "description": "More than 30 days" }] }
\`\`\``;
const { text, artifacts } = extractArtifacts(answer);
const onPick = (values: string[]) => {
  chosen.value = values.join(", ");
};
</script>

<template>
  <div class="flex max-w-xl flex-col gap-4">
    <NqArtifactRenderer :artifact="table" />
    <NqMarkdown :source="text" />
    <NqArtifactList :artifacts="artifacts" :on-pick="onPick" />
    <p v-if="chosen" class="text-caption text-muted-foreground">Picked: {{ chosen }}</p>
  </div>
</template>
