<script setup lang="ts">
import { NqStatusLabelManager, type StatusDraft, type LabelDraft } from "@fadymondy/nasaq/vue";

const statuses = [
  { id: "s1", name: "To do", hue: "gray" as const, stage: "todo" as const, usage: 12 },
  { id: "s4", name: "Ready", hue: "teal" as const, stage: "todo" as const, usage: 0 },
  { id: "s2", name: "In progress", hue: "blue" as const, stage: "active" as const, usage: 4 },
  { id: "s3", name: "Shipped", hue: "green" as const, stage: "done" as const, usage: 31 },
];
const labels = [{ id: "l1", name: "Design", hue: "violet" as const, usage: 3 }];

// Your calls: save, then pass the updated lists back. Resolve { error } to show why it failed.
const save = async (_draft: StatusDraft) => undefined;
const del = async (_id: string) => undefined;
const reorder = async (_ids: string[]) => undefined;
const saveLabel = async (_draft: LabelDraft) => undefined;
</script>

<template>
  <NqStatusLabelManager :statuses="statuses" :labels="labels" :on-save-status="save" :on-delete-status="del" :on-reorder-statuses="reorder" :on-save-label="saveLabel" :on-delete-label="del" />
</template>
