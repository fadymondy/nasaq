<script setup lang="ts" generic="T extends IssueBoardItem">
import { ExternalLink, Link2, Plus, Search, X } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import type { ContextMenuAction } from "../context-menu";
import { NqInputGroup, NqInputGroupAddon, NqInputGroupInput } from "../input-group";
import type { IssuePerson } from "../issue-view/issue-logic";
import { NqKanbanBoard, type KanbanCardData } from "../kanban-board";
import { NqNativeSelect } from "../native-select";
import { formatNumber } from "../numeric";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { boardIndex, EMPTY_ISSUE_FILTER, filterIssues, isIssueFilterActive, type IssueBoardFilter, type IssueBoardItem } from "./issue-board-logic";
import NqIssueCard from "./NqIssueCard.vue";

export interface IssueBoardLabels {
  title: string;
  board: string;
  empty: string;
  search: string;
  searchPlaceholder: string;
  assignee: string;
  reporter: string;
  anyone: string;
  nobody: string;
  noReporter: string;
  newIssue: string;
  clear: string;
  count: (shown: string, total: string) => string;
  open: string;
  copyKey: string;
}

// A ready-made issue board: NqKanbanBoard with issue cards (type, key, priority, labels, due date, votes, comments,
// attachments, assignee), a toolbar with search and assignee / reporter filters, and a header with the count and
// "New issue". Filtering hides cards but keeps drops in the right place among hidden ones.
const props = withDefaults(
  defineProps<{
    issues: readonly T[];
    /** The columns, in order. */
    statuses: readonly WorkStatus[];
    labels?: readonly WorkLabel[];
    /** Assignees and reporters. */
    people?: readonly IssuePerson[];
    /** An issue was dropped. `index` is its position among *all* the column's issues, hidden ones included. */
    onMove: (issueId: string, statusId: string, index: number) => void;
    /** Click or Enter on a card, and "Open issue" in its menu. */
    onOpen?: (issue: T) => void;
    /** Adds a vote button to each card. */
    onVote?: (issue: T, voted: boolean) => void;
    /** Adds a "New issue" button to the header. */
    onCreate?: () => void;
    /** Header title. Default "Issues". `null` hides the header row. */
    title?: string | null;
    /** Show the reporter filter. Default: when any issue has a `reporterId`. */
    reporterFilter?: boolean;
    /** Initial filter. */
    defaultFilter?: Partial<IssueBoardFilter>;
    /** Called when the reader changes the search or a filter. */
    onFilterChange?: (filter: IssueBoardFilter) => void;
    /** More actions for a card's context menu, after Open and Copy key. */
    cardActions?: (issue: T) => ContextMenuAction[];
    /** Done or canceled issues are never shown as overdue. For the due-date colours. Default `Date.now()`. */
    now?: number;
    text?: Partial<IssueBoardLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { labels: () => [], people: () => [], onOpen: undefined, onVote: undefined, onCreate: undefined, title: undefined, reporterFilter: undefined, defaultFilter: undefined, onFilterChange: undefined, cardActions: undefined, now: undefined, text: undefined },
);
defineSlots<{
  /** Extra controls at the end of the toolbar. */
  toolbar?: () => unknown;
}>();

const STRINGS: { en: IssueBoardLabels; ar: IssueBoardLabels } = {
  en: {
    title: "Issues",
    board: "Issue board",
    empty: "No issues",
    search: "Search issues",
    searchPlaceholder: "Search by key, title or label",
    assignee: "Assignee",
    reporter: "Reporter",
    anyone: "Anyone",
    nobody: "Unassigned",
    noReporter: "No reporter",
    newIssue: "New issue",
    clear: "Clear filters",
    count: (shown, total) => (shown === total ? `${total} issues` : `${shown} of ${total} issues`),
    open: "Open issue",
    copyKey: "Copy key",
  },
  ar: {
    title: "المهام",
    board: "لوحة المهام",
    empty: "لا توجد مهام",
    search: "بحث في المهام",
    searchPlaceholder: "ابحث بالمعرّف أو العنوان أو الوسم",
    assignee: "المسؤول",
    reporter: "المُبلّغ",
    anyone: "الجميع",
    nobody: "غير مسندة",
    noReporter: "بلا مُبلّغ",
    newIssue: "مهمة جديدة",
    clear: "مسح عوامل التصفية",
    count: (shown, total) => (shown === total ? `${total} مهام` : `${shown} من ${total} مهام`),
    open: "فتح المهمة",
    copyKey: "نسخ المعرّف",
  },
};

interface Card extends KanbanCardData {
  issue: T;
}

const nasaq = useNasaq();
const locale = computed(() => (nasaq.locale.value.startsWith("ar") ? "ar" : "en"));
const t = computed<IssueBoardLabels>(() => ({ ...STRINGS[locale.value], ...props.text }));
const filter = ref<IssueBoardFilter>({ ...EMPTY_ISSUE_FILTER, ...props.defaultFilter });
function setFilter(patch: Partial<IssueBoardFilter>) {
  filter.value = { ...filter.value, ...patch };
  props.onFilterChange?.(filter.value);
}
const labelName = computed(() => {
  const byId = new Map(props.labels.map((l) => [l.id, l.name]));
  return (id: string) => byId.get(id);
});
const visible = computed(() => filterIssues(props.issues, filter.value, labelName.value) as T[]);
const visibleIds = computed(() => new Set(visible.value.map((i) => i.id)));
const stageOf = computed(() => new Map(props.statuses.map((s) => [s.id, s.stage])));
const withReporter = computed(() => props.reporterFilter ?? props.issues.some((i) => i.reporterId));
const active = computed(() => isIssueFilterActive(filter.value));
const n = (v: number) => formatNumber(v, locale.value);

const cards = computed(() => visible.value.map((i) => ({ id: i.id, columnId: i.statusId, title: `${i.key} ${i.title}`, issue: i }) as Card));
const columns = computed(() => props.statuses.map((s) => ({ id: s.id, title: s.name })));
const personOptions = (none: string, label: string) => [
  { value: "", label: `${label}: ${t.value.anyone}` },
  { value: "none", label: none },
  ...props.people.map((p) => ({ value: p.id, label: p.name })),
];
const assigneeOptions = computed(() => personOptions(t.value.nobody, t.value.assignee));
const reporterOptions = computed(() => personOptions(t.value.noReporter, t.value.reporter));
const actionsFor = (card: Card): ContextMenuAction[] => [
  ...(props.onOpen ? [{ id: "open", label: t.value.open, icon: ExternalLink, onSelect: () => props.onOpen?.(card.issue) }] : []),
  { id: "copy", label: t.value.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(card.issue.key) },
  ...(props.cardActions?.(card.issue) ?? []),
];
const isOpen = (i: T) => {
  const stage = stageOf.value.get(i.statusId);
  return stage !== "done" && stage !== "canceled";
};
function move(id: string, statusId: string, index: number) {
  props.onMove(id, statusId, boardIndex(props.issues, visibleIds.value, id, statusId, index));
}
</script>

<template>
  <section data-slot="issue-board" :aria-label="typeof props.title === 'string' ? props.title : t.board" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <header v-if="props.title !== null" class="flex flex-wrap items-center gap-2">
      <h2 class="m-0 text-heading-sm text-foreground">{{ props.title ?? t.title }}</h2>
      <span class="text-caption tabular-nums text-muted-foreground" aria-live="polite">{{ t.count(n(visible.length), n(props.issues.length)) }}</span>
      <NqButton v-if="props.onCreate" type="button" size="sm" variant="primary" class="ms-auto" @click="props.onCreate()">
        <Plus aria-hidden="true" />
        {{ t.newIssue }}
      </NqButton>
    </header>
    <div data-slot="issue-board-toolbar" class="flex flex-wrap items-center gap-2">
      <NqInputGroup class="min-w-48 flex-1 basis-60 sm:max-w-80">
        <NqInputGroupAddon align="start">
          <Search aria-hidden="true" class="size-4 text-muted-foreground" />
        </NqInputGroupAddon>
        <NqInputGroupInput
          type="search"
          :model-value="filter.query"
          :placeholder="t.searchPlaceholder"
          :aria-label="t.search"
          @update:model-value="setFilter({ query: String($event ?? '') })"
          @keydown="(e: KeyboardEvent) => { if (e.key === 'Escape' && filter.query) { e.preventDefault(); setFilter({ query: '' }); } }"
        />
      </NqInputGroup>
      <NqNativeSelect size="sm" :aria-label="t.assignee" data-slot="issue-board-assignee" :model-value="filter.assigneeId ?? ''" :options="assigneeOptions" class="w-auto" @update:model-value="setFilter({ assigneeId: $event || null })" />
      <NqNativeSelect
        v-if="withReporter"
        size="sm"
        :aria-label="t.reporter"
        data-slot="issue-board-reporter"
        :model-value="filter.reporterId ?? ''"
        :options="reporterOptions"
        class="w-auto"
        @update:model-value="setFilter({ reporterId: $event || null })"
      />
      <NqButton v-if="active" type="button" size="sm" variant="ghost" @click="setFilter(EMPTY_ISSUE_FILTER)">
        <X aria-hidden="true" />
        {{ t.clear }}
      </NqButton>
      <div v-if="$slots.toolbar" class="ms-auto flex items-center gap-2"><slot name="toolbar" /></div>
    </div>
    <NqKanbanBoard :label="t.board" :empty-label="t.empty" :columns="columns" :cards="cards" :on-move="move" class="pb-2" :card-actions="actionsFor">
      <template #card="{ card }">
        <NqIssueCard
          :issue="card.issue"
          :labels="props.labels"
          :people="props.people"
          :votes="props.onVote || card.issue.votes !== undefined ? (card.issue.votes ?? 0) : undefined"
          :voted="card.issue.voted"
          :on-vote="props.onVote ? (v: boolean) => props.onVote?.(card.issue, v) : undefined"
          :comments="card.issue.comments"
          :attachments="card.issue.attachments"
          :open="isOpen(card.issue)"
          :now="props.now"
          :class="props.onOpen ? 'cursor-pointer' : undefined"
          @click="props.onOpen?.(card.issue)"
        />
      </template>
    </NqKanbanBoard>
  </section>
</template>
