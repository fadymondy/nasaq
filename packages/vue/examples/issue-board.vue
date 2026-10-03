<script setup lang="ts">
import { NqIssueBoard, type IssueBoardItem } from "@fadymondy/nasaq/vue";
import { ref } from "vue";

const statuses = [
  { id: "todo", name: "To do", hue: "gray" as const, stage: "todo" as const },
  { id: "doing", name: "In progress", hue: "blue" as const, stage: "active" as const },
  { id: "done", name: "Shipped", hue: "green" as const, stage: "done" as const },
];
const labels = [
  { id: "l1", name: "Design", hue: "violet" as const },
  { id: "l2", name: "Payments", hue: "blue" as const },
];
const people = [
  { id: "u1", name: "Layla Hassan" },
  { id: "u2", name: "Omar Said" },
];

const issues = ref<IssueBoardItem[]>([
  { id: "i1", key: "NSQ-1", title: "Refunds fail for split payments", statusId: "doing", priority: "high", type: "bug", assigneeId: "u1", reporterId: "u2", labelIds: ["l2"], dueDate: "2026-09-28", projectId: "p1", createdAt: "2026-09-20T09:00:00Z", votes: 12, comments: 4, attachments: 1 },
  { id: "i2", key: "NSQ-2", title: "New receipt layout", statusId: "todo", priority: "medium", type: "task", assigneeId: "u2", reporterId: "u1", labelIds: ["l1"], dueDate: "2026-10-10", projectId: "p1", createdAt: "2026-09-21T09:00:00Z", votes: 3 },
  { id: "i3", key: "NSQ-3", title: "Saved cards", statusId: "done", priority: "low", type: "feature", reporterId: "u1", labelIds: [], projectId: "p1", createdAt: "2026-09-10T09:00:00Z", votes: 7, voted: true },
]);

// Your move: put the issue at `index` among all of the column's issues.
function move(id: string, statusId: string, index: number) {
  const moved = issues.value.find((i) => i.id === id);
  if (!moved) return;
  const rest = issues.value.filter((i) => i.id !== id);
  const column = rest.filter((i) => i.statusId === statusId);
  const before = column[index];
  const at = before ? rest.indexOf(before) : rest.length;
  issues.value = [...rest.slice(0, at), { ...moved, statusId }, ...rest.slice(at)];
}
function vote(issue: IssueBoardItem, voted: boolean) {
  issues.value = issues.value.map((i) => (i.id === issue.id ? { ...i, voted, votes: (i.votes ?? 0) + (voted ? 1 : -1) } : i));
}
</script>

<template>
  <NqIssueBoard :issues="issues" :statuses="statuses" :labels="labels" :people="people" :on-move="move" :on-open="() => {}" :on-vote="vote" :on-create="() => {}" :now="Date.parse('2026-09-29T09:00:00Z')" />
</template>
