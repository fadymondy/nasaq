<script setup lang="ts">
import { ExternalLink, Link2 } from "lucide-vue-next";
import { computed } from "vue";
import type { Issue, IssuePerson } from "../issue-view/issue-logic";
import NqIssueCard from "../issue-board/NqIssueCard.vue";
import { NqKanbanBoard, type KanbanCardData } from "../kanban-board";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import type { ProjectViewStrings } from "./strings";

interface CardIssue extends KanbanCardData {
  issue: Issue;
}

// The issue board: a KanbanBoard with an issue card (NqIssueCard). Card actions (Open, Copy key) are in its context menu.
const props = defineProps<{
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  labels: readonly WorkLabel[];
  people: readonly IssuePerson[];
  onMove: (id: string, statusId: string, index: number) => void;
  onOpen?: (issue: Issue) => void;
  t: ProjectViewStrings;
}>();

const isOpen = (issue: Issue) => {
  const stage = props.statuses.find((s) => s.id === issue.statusId)?.stage;
  return stage !== "done" && stage !== "canceled";
};
const cards = computed<CardIssue[]>(() => {
  return props.issues.map((i) => ({
    id: i.id,
    columnId: i.statusId,
    title: `${i.key} ${i.title}`,
    issue: i,
  }));
});
const columns = computed(() => props.statuses.map((s) => ({ id: s.id, title: s.name })));
const cardActions = (card: CardIssue) => [
  ...(props.onOpen ? [{ id: "open", label: props.t.openIssue, icon: ExternalLink, onSelect: () => props.onOpen?.(card.issue) }] : []),
  { id: "copy", label: props.t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(card.issue.key) },
];
</script>

<template>
  <NqKanbanBoard :label="props.t.boardLabel" :empty-label="props.t.boardEmpty" :columns="columns" :cards="cards" :on-move="props.onMove" class="pb-2" :card-actions="cardActions">
    <template #card="{ card }">
      <NqIssueCard
        :issue="card.issue"
        :labels="props.labels"
        :people="props.people"
        :open="isOpen(card.issue)"
        :class="props.onOpen ? 'cursor-pointer' : undefined"
        @click="props.onOpen?.(card.issue)"
      />
    </template>
  </NqKanbanBoard>
</template>
