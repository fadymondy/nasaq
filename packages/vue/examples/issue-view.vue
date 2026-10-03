<script setup lang="ts">
import { NqIssueView, type Issue, type IssuePatch } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "doing", name: "In progress", hue: "blue" as const, stage: "active" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [
  { id: "l1", name: "Design", hue: "violet" as const },
  { id: "l2", name: "Backend", hue: "teal" as const },
];
const people = [{ id: "u1", name: "Layla Hassan" }, { id: "u2", name: "Omar Said" }];
const projects = [{ id: "p1", name: "Checkout" }];

const issue = ref<Issue>({
  id: "i1",
  key: "NSQ-42",
  title: "Refunds fail for split payments",
  description: "<p>A refund on a split payment returns a 500.</p>",
  statusId: "doing",
  priority: "high",
  type: "bug",
  assigneeId: "u1",
  labelIds: ["l2"],
  estimateHours: 4,
  dueDate: "2026-10-02",
  projectId: "p1",
  createdAt: "2026-09-20T09:00:00Z",
});

// Your save: apply the patch, then pass the updated issue back. Resolve { error } to show why it failed.
const save = async (patch: IssuePatch) => {
  issue.value = { ...issue.value, ...patch };
};
</script>

<template>
  <NqIssueView :issue="issue" :statuses="statuses" :labels="labels" :people="people" :projects="projects" :on-update="save" :now="Date.parse('2026-09-29T09:00:00Z')" />
</template>
