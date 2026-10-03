<script setup lang="ts">
import { CalendarDays, ChevronUp, MessageSquare, Paperclip } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import { issueDueState, type Issue, type IssuePerson } from "../issue-view/issue-logic";
import NqPriorityIcon from "../issue-view/NqPriorityIcon.vue";
import NqTypeIcon from "../issue-view/NqTypeIcon.vue";
import { useIssueStrings } from "../issue-view/strings";
import { formatNumber, NqDateTime } from "../numeric";
import type { WorkLabel } from "../status-label-manager/status-label-logic";

export interface IssueCardLabels {
  vote: (n: string) => string;
  voted: (n: string) => string;
  comments: (n: string) => string;
  attachments: (n: string) => string;
  assignee: (name: string) => string;
  due: string;
}

// One issue as a board card: type, key and priority, the title, labels, due date, counts (votes, comments,
// attachments) and the assignee. Votes are a toggle button; the rest is read-only. Use inside NqKanbanBoard
// (NqIssueBoard does) or on its own. `@click` and `class` fall through to the card.
const props = withDefaults(
  defineProps<{
    issue: Pick<Issue, "key" | "title" | "type" | "priority" | "labelIds" | "assigneeId" | "dueDate">;
    /** Label definitions, to show names and colours for `issue.labelIds`. */
    labels?: readonly WorkLabel[];
    /** People, to show the assignee's avatar. */
    people?: readonly IssuePerson[];
    votes?: number;
    /** The viewer has voted: the vote button shows pressed. */
    voted?: boolean;
    /** Adds a vote button. Called with the new state. */
    onVote?: (voted: boolean) => void;
    comments?: number;
    attachments?: number;
    /** A finished issue is never shown as overdue. Default true. */
    open?: boolean;
    /** For the due-date colour. Default `Date.now()`. */
    now?: number;
    text?: Partial<IssueCardLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { labels: () => [], people: () => [], votes: undefined, voted: false, onVote: undefined, comments: undefined, attachments: undefined, open: true, now: undefined, text: undefined },
);

const STRINGS: { en: IssueCardLabels; ar: IssueCardLabels } = {
  en: {
    vote: (n) => `Upvote, ${n} votes`,
    voted: (n) => `Remove your vote, ${n} votes`,
    comments: (n) => `${n} comments`,
    attachments: (n) => `${n} attachments`,
    assignee: (name) => `Assigned to ${name}`,
    due: "Due",
  },
  ar: {
    vote: (n) => `تصويت، ${n} أصوات`,
    voted: (n) => `إلغاء تصويتك، ${n} أصوات`,
    comments: (n) => `${n} تعليقات`,
    attachments: (n) => `${n} مرفقات`,
    assignee: (name) => `مسندة إلى ${name}`,
    due: "الاستحقاق",
  },
};

const DUE_TEXT = { overdue: "text-nq-danger-text", today: "text-nq-warning-text", soon: "text-nq-warning-text", later: "text-muted-foreground", none: "text-muted-foreground" };

const nasaq = useNasaq();
const locale = computed(() => (nasaq.locale.value.startsWith("ar") ? "ar" : "en"));
const t = computed<IssueCardLabels>(() => ({ ...STRINGS[locale.value], ...props.text }));
const { t: it } = useIssueStrings(() => undefined);
const n = (v: number) => formatNumber(v, locale.value);
const tags = computed(() => props.issue.labelIds.flatMap((id) => props.labels.filter((l) => l.id === id)));
const assignee = computed(() => (props.issue.assigneeId ? props.people.find((p) => p.id === props.issue.assigneeId) : undefined));
const due = computed(() => issueDueState(props.issue.dueDate, props.now ?? Date.now(), props.open));
const hasCounts = computed(() => props.votes !== undefined || props.onVote || props.comments || props.attachments);

// Keys and pointer presses on a control inside a draggable card must not start a drag.
const keep = (e: Event) => e.stopPropagation();
</script>

<template>
  <div data-slot="issue-card" :class="cn('flex w-full flex-col gap-2 rounded-card border border-border bg-card p-3 text-start text-card-foreground', props.class)">
    <div class="flex items-center gap-2 text-caption text-muted-foreground">
      <NqTypeIcon :type="props.issue.type" :aria-label="it.types[props.issue.type]" />
      <bdi dir="ltr" class="font-mono">{{ props.issue.key }}</bdi>
      <span class="ms-auto inline-flex items-center gap-1" :title="it.priorities[props.issue.priority]">
        <NqPriorityIcon :priority="props.issue.priority" />
        <span class="sr-only">{{ it.priorities[props.issue.priority] }}</span>
      </span>
    </div>
    <div class="text-label text-foreground">{{ props.issue.title }}</div>
    <div v-if="tags.length" class="flex flex-wrap gap-1">
      <NqBadge v-for="l in tags" :key="l.id" variant="tag" :hue="l.hue">{{ l.name }}</NqBadge>
    </div>
    <div v-if="props.issue.dueDate || hasCounts || assignee" class="flex items-center gap-3 text-caption text-muted-foreground">
      <button
        v-if="props.onVote"
        type="button"
        data-slot="issue-card-vote"
        :aria-pressed="props.voted"
        :aria-label="(props.voted ? t.voted : t.vote)(n(props.votes ?? 0))"
        :class="
          cn(
            '-ms-1 inline-flex h-6 items-center gap-0.5 rounded-control border px-1.5 tabular-nums outline-none transition-colors duration-150 ease-nq',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
            props.voted ? 'border-nq-accent/40 bg-nq-selected text-foreground' : 'border-border hover:bg-nq-hover',
          )
        "
        @click.stop="props.onVote(!props.voted)"
        @keydown="keep"
        @pointerdown="keep"
      >
        <ChevronUp aria-hidden="true" class="size-3.5" />
        {{ n(props.votes ?? 0) }}
      </button>
      <span v-else-if="props.votes !== undefined" class="inline-flex items-center gap-0.5 tabular-nums" :aria-label="t.vote(n(props.votes))">
        <ChevronUp aria-hidden="true" class="size-3.5" />
        {{ n(props.votes) }}
      </span>
      <span v-if="props.comments" class="inline-flex items-center gap-1 tabular-nums">
        <MessageSquare aria-hidden="true" class="size-3.5" />
        <span aria-hidden="true">{{ n(props.comments) }}</span>
        <span class="sr-only">{{ t.comments(n(props.comments)) }}</span>
      </span>
      <span v-if="props.attachments" class="inline-flex items-center gap-1 tabular-nums">
        <Paperclip aria-hidden="true" class="size-3.5" />
        <span aria-hidden="true">{{ n(props.attachments) }}</span>
        <span class="sr-only">{{ t.attachments(n(props.attachments)) }}</span>
      </span>
      <span v-if="props.issue.dueDate" :data-due="due" :class="cn('inline-flex items-center gap-1', DUE_TEXT[due])">
        <CalendarDays aria-hidden="true" class="size-3.5" />
        <span class="sr-only">{{ t.due }}</span>
        <NqDateTime :value="new Date(`${props.issue.dueDate}T00:00:00`)" :format="{ day: 'numeric', month: 'short' }" />
        <span v-if="due === 'overdue'" class="sr-only">({{ it.overdue }})</span>
      </span>
      <NqAvatar v-if="assignee" :name="assignee.name" :src="assignee.avatar" size="xs" class="ms-auto" :aria-label="t.assignee(assignee.name)" />
    </div>
  </div>
</template>
