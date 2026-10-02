<script setup lang="ts">
import { CalendarDays, ExternalLink, Link2 } from "lucide-vue-next";
import { computed } from "vue";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import type { Issue, IssuePerson } from "../issue-view/issue-logic";
import NqPriorityIcon from "../issue-view/NqPriorityIcon.vue";
import NqTypeIcon from "../issue-view/NqTypeIcon.vue";
import { useIssueStrings } from "../issue-view/strings";
import { NqKanbanBoard, type KanbanCardData } from "../kanban-board";
import { NqDateTime } from "../numeric";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import type { ProjectViewStrings } from "./strings";

interface CardIssue extends KanbanCardData {
  issue: Issue;
}

// The issue board: a KanbanBoard with a custom card. Card actions (Open, Copy key) are in its context menu.
const props = defineProps<{
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  labels: readonly WorkLabel[];
  people: readonly IssuePerson[];
  onMove: (id: string, statusId: string, index: number) => void;
  onOpen?: (issue: Issue) => void;
  t: ProjectViewStrings;
}>();

const { t: it } = useIssueStrings(() => undefined);
const cards = computed<CardIssue[]>(() => {
  const personOf = new Map(props.people.map((p) => [p.id, p]));
  const labelOf = new Map(props.labels.map((l) => [l.id, l]));
  return props.issues.map((i) => ({
    id: i.id,
    columnId: i.statusId,
    title: `${i.key} ${i.title}`,
    issue: i,
    labels: i.labelIds.flatMap((id) => (labelOf.has(id) ? [{ label: labelOf.get(id)!.name, hue: labelOf.get(id)!.hue }] : [])),
    assignee: i.assigneeId && personOf.has(i.assigneeId) ? { name: personOf.get(i.assigneeId)!.name, src: personOf.get(i.assigneeId)!.avatar } : undefined,
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
      <div data-slot="kanban-card" class="flex w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-card-foreground" @click="props.onOpen?.(card.issue)">
        <div class="flex items-center gap-2 text-caption text-muted-foreground">
          <NqTypeIcon :type="card.issue.type" />
          <bdi dir="ltr" class="font-mono">{{ card.issue.key }}</bdi>
          <span class="ms-auto inline-flex items-center gap-1" :title="it.priorities[card.issue.priority]">
            <NqPriorityIcon :priority="card.issue.priority" />
            <span class="sr-only">{{ it.priorities[card.issue.priority] }}</span>
          </span>
        </div>
        <div class="text-label text-foreground">{{ card.issue.title }}</div>
        <div v-if="card.labels?.length" class="flex flex-wrap gap-1">
          <NqBadge v-for="l in card.labels" :key="l.label" variant="tag" :hue="l.hue ?? 'gray'">{{ l.label }}</NqBadge>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span v-if="card.issue.dueDate" class="inline-flex items-center gap-1 text-caption text-muted-foreground">
            <CalendarDays aria-hidden="true" class="size-3.5" />
            <NqDateTime :value="new Date(`${card.issue.dueDate}T00:00:00`)" :format="{ day: 'numeric', month: 'short' }" />
          </span>
          <span v-else />
          <NqAvatar v-if="card.assignee" :name="card.assignee.name" :src="card.assignee.src" size="xs" />
        </div>
      </div>
    </template>
  </NqKanbanBoard>
</template>
