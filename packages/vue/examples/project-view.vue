<script setup lang="ts">
import { NqProjectView, type Issue, type IssuePatch } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "doing", name: "In progress", hue: "blue" as const, stage: "active" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [{ id: "l1", name: "Design", hue: "violet" as const }];
const people = [{ id: "u1", name: "Layla Hassan" }, { id: "u2", name: "Omar Said" }];
const project = { id: "p1", name: "Checkout", key: "NSQ", client: "Acme", status: "active" as const, progress: 40, startDate: "2026-09-01", dueDate: "2026-11-30", members: [{ name: "Layla Hassan" }, { name: "Omar Said" }] };

const issues = ref<Issue[]>([
  { id: "i1", key: "NSQ-1", title: "Refunds fail for split payments", statusId: "doing", priority: "high", type: "bug", assigneeId: "u1", labelIds: ["l1"], estimateHours: 4, dueDate: "2026-10-02", projectId: "p1", createdAt: "2026-09-20T09:00:00Z" },
  { id: "i2", key: "NSQ-2", title: "New receipt layout", statusId: "todo", priority: "medium", type: "task", assigneeId: "u2", labelIds: [], dueDate: "2026-10-10", projectId: "p1", createdAt: "2026-09-21T09:00:00Z" },
  { id: "i3", key: "NSQ-3", title: "Saved cards", statusId: "done", priority: "low", type: "story", labelIds: [], projectId: "p1", createdAt: "2026-09-10T09:00:00Z" },
]);

// Your save: apply the patch. Return { error } to roll the change back.
const update = async (id: string, patch: IssuePatch) => {
  issues.value = issues.value.map((i) => (i.id === id ? { ...i, ...patch } : i));
};
</script>

<template>
  <NqProjectView :project="project" :issues="issues" :statuses="statuses" :labels="labels" :people="people" :on-update-issue="update" :on-open-issue="() => {}" :now="Date.parse('2026-09-29T09:00:00Z')" />
</template>
