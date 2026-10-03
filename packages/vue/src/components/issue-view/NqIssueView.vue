<script lang="ts">
import type { ActivityInput, ActivityRecord, ActivityResult } from "../activity-composer";
import type { AiCostDay, AiCostRow } from "../ai-usage-cost";
import type { ChecklistItem } from "../checklist";
import type { GithubCommit, GithubPull, GithubRepo, GithubRun } from "../github-activity/types";
import type { RunningTimer, StoppedTimer, TimeEntry, TimeEntryInput, TimerSelection } from "../time-tracker";

type Result = void | { error?: string };
type MaybePromise<T> = T | Promise<T>;

/** What the Activity tab needs: the log, the composer and the task toggle. */
export interface IssueActivityProps {
  items: readonly ActivityRecord[];
  onSubmit: (input: ActivityInput) => Promise<ActivityResult>;
  onToggleTask?: (id: string, done: boolean) => Promise<ActivityResult>;
  onDelete?: (id: string) => Promise<ActivityResult>;
}

/** What the Time tab needs. Entries belong to this issue; the timer starts on it. */
export interface IssueTimeProps {
  entries: readonly TimeEntry[];
  running?: RunningTimer | null;
  onStart?: (selection: TimerSelection & { startedAt: number }) => MaybePromise<void | { error?: string }>;
  onStop?: (stopped: StoppedTimer) => MaybePromise<void | { error?: string }>;
  onRunningChange?: (running: RunningTimer | null) => void;
  onAdd?: (input: TimeEntryInput) => MaybePromise<void | { error?: string }>;
  onEdit?: (entry: TimeEntry, input: TimeEntryInput) => MaybePromise<void | { error?: string }>;
  onDelete?: (entry: TimeEntry) => MaybePromise<void | { error?: string }>;
}

/** What the AI cost tab needs: the daily spend, the breakdowns and, optionally, this issue's run against its budget. */
export interface IssueAiProps {
  days: readonly AiCostDay[];
  byModel?: readonly AiCostRow[];
  byProduct?: readonly AiCostRow[];
  byRun?: readonly AiCostRow[];
  markup?: number;
  currency?: string;
  previousTotal?: number;
  run?: { tokensIn: number; tokensOut: number; cached?: number; cost?: number; budget?: number | null };
}

/** Linked pull requests and commits. */
export interface IssueDevelopmentProps {
  repo: GithubRepo;
  pulls?: readonly GithubPull[];
  commits?: readonly GithubCommit[];
  runs?: readonly GithubRun[];
}

/** The checklist of an issue. */
export interface IssueChecklistProps {
  items: ChecklistItem[];
  onToggle: (id: string, done: boolean) => Promise<Result>;
  onAdd?: (text: string, parentId?: string) => Promise<Result>;
  onRemove?: (id: string) => Promise<Result>;
}
</script>

<script setup lang="ts">
import { ArrowLeft, ArrowRight, CornerLeftUp, Timer } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqActivityComposer, NqActivityTimeline } from "../activity-composer";
import { NqAiUsageCost, NqTokenCostMeter } from "../ai-usage-cost";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqChecklist } from "../checklist";
import { NqCommentThread } from "../comment-thread";
import { NqCopyButton } from "../copy-button";
import { NqGithubActivity } from "../github-activity";
import { NqNum } from "../numeric";
import type { RichTextTiptap } from "../rich-text-editor";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTimeEntryList, NqTimeTracker } from "../time-tracker";
import { issueIsOpen, type Issue, type IssuePatch, type IssuePerson, type IssueRef, type IssueResult } from "./issue-logic";
import NqIssueDescription from "./NqIssueDescription.vue";
import NqIssueInlineTitle from "./NqIssueInlineTitle.vue";
import NqIssueProperties from "./NqIssueProperties.vue";
import NqIssueSubIssues from "./NqIssueSubIssues.vue";
import NqTypeIcon from "./NqTypeIcon.vue";
import { useIssueStrings, type IssueViewLabels } from "./strings";

// One issue in full: key and inline-editable title, rich description, a properties sidebar, checklist, sub-issues,
// linked pull requests and commits, then tabs for comments, activity, time (with the running timer) and AI cost.
// Everything is presentational: changes go out through `onUpdate` and the callbacks of each part.
const props = withDefaults(defineProps<{
  issue: Issue;
  statuses: WorkStatus[];
  labels: WorkLabel[];
  people: IssuePerson[];
  projects: { id: string; name: string }[];
  /** Issues offered as the parent (the issue itself and its descendants are left out). */
  parentOptions?: (IssueRef & { parentId?: string | null })[];
  /** Save one or more properties, the title or the description. Omit for a read-only view. Return `{ error }` to show it. */
  onUpdate?: (patch: IssuePatch) => Promise<IssueResult>;
  checklist?: IssueChecklistProps;
  subIssues?: IssueRef[];
  /** Add a sub-issue by title. Omit to hide the add row. */
  onAddSubIssue?: (title: string) => Promise<IssueResult>;
  /** Open another issue (a sub-issue or the parent). */
  onOpenIssue?: (id: string) => void;
  development?: IssueDevelopmentProps;
  /** The comment thread: the props of NqCommentThread. */
  thread?: InstanceType<typeof NqCommentThread>["$props"];
  activity?: IssueActivityProps;
  time?: IssueTimeProps;
  ai?: IssueAiProps;
  /** "page" puts the properties beside the content on wide containers; "drawer" stacks them for a narrow panel. */
  variant?: "page" | "drawer";
  /** Shows a back button (page) or is ignored. */
  onBack?: () => void;
  /** The tab shown first. Default the first tab that has data. */
  defaultTab?: "comments" | "activity" | "time" | "ai";
  /** "Now" for due-date colours. */
  now?: number;
  /** The Tiptap loader. With it the description reads and edits as rich text; without it as plain HTML text. */
  load?: () => Promise<RichTextTiptap>;
  labelsText?: IssueViewLabels;
  class?: HTMLAttributes["class"];
}>(), {
  parentOptions: () => [],
  onUpdate: undefined,
  checklist: undefined,
  subIssues: () => [],
  onAddSubIssue: undefined,
  onOpenIssue: undefined,
  development: undefined,
  thread: undefined,
  activity: undefined,
  time: undefined,
  ai: undefined,
  variant: "page",
  onBack: undefined,
  defaultTab: undefined,
  now: undefined,
  load: undefined,
  labelsText: undefined,
});

const { ar, t, locale } = useIssueStrings(() => props.labelsText);
const readOnly = computed(() => !props.onUpdate);
const drawer = computed(() => props.variant === "drawer");
const Back = computed(() => (ar.value ? ArrowRight : ArrowLeft));
const parent = computed(() => (props.issue.parentId ? props.parentOptions.find((p) => p.id === props.issue.parentId) : undefined));
const status = computed(() => props.statuses.find((s) => s.id === props.issue.statusId));
const loggedSeconds = computed(() => (props.time ? props.time.entries.reduce((n, e) => n + e.seconds, 0) : 0));
const timerHere = computed(() => {
  const running = props.time?.running;
  return Boolean(running && (!running.taskId || running.taskId === props.issue.id));
});
const open = computed(() => issueIsOpen(props.issue, props.statuses));

const tabs = computed(() => {
  const list: { id: "comments" | "activity" | "time" | "ai"; label: string; count?: number }[] = [];
  if (props.thread) list.push({ id: "comments", label: t.value.comments, count: props.thread.comments.length });
  if (props.activity) list.push({ id: "activity", label: t.value.activity, count: props.activity.items.length });
  if (props.time) list.push({ id: "time", label: t.value.time });
  if (props.ai) list.push({ id: "ai", label: t.value.ai });
  return list;
});
const firstTab = computed(() => (props.defaultTab && tabs.value.some((x) => x.id === props.defaultTab) ? props.defaultTab : tabs.value[0]?.id));

const timeProjects = computed(() => {
  const p = props.projects.find((x) => x.id === props.issue.projectId);
  return [{ id: props.issue.projectId, name: p?.name ?? props.issue.projectId, tasks: [{ id: props.issue.id, name: `${props.issue.key} ${props.issue.title}` }] }];
});

const dateText = (v: Date | string | number) => new Date(v).toLocaleDateString(locale.value.startsWith("ar") ? "ar" : "en", { dateStyle: "medium" });
const saveTitle = (title: string) => props.onUpdate!({ title });
const saveDescription = (description: string) => props.onUpdate!({ description });
</script>

<template>
  <article data-slot="issue-view" :data-variant="props.variant" :class="cn('@container flex min-w-0 flex-col gap-4', props.class)">
    <header class="flex min-w-0 flex-col gap-2">
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <NqButton v-if="props.onBack && !drawer" variant="ghost" size="sm" @click="props.onBack">
          <component :is="Back" aria-hidden="true" class="size-4" />
          {{ t.back }}
        </NqButton>
        <button v-if="parent" type="button" class="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground hover:underline" @click="props.onOpenIssue?.(parent.id)">
          <bdi dir="ltr" class="font-mono">{{ parent.key }}</bdi>
          <CornerLeftUp aria-hidden="true" class="size-3.5 rtl:-scale-x-100" />
        </button>
        <NqTypeIcon :type="props.issue.type" />
        <bdi dir="ltr" class="font-mono text-body-sm text-muted-foreground">{{ props.issue.key }}</bdi>
        <NqCopyButton :value="props.issue.key" :label="t.copyKey" variant="ghost" size="icon-sm" />
        <NqBadge v-if="status" variant="tag" :hue="status.hue">{{ status.name }}</NqBadge>
        <NqBadge v-if="open && props.issue.priority !== 'none'" variant="outline">{{ t.priorities[props.issue.priority] }}</NqBadge>
        <NqBadge v-if="timerHere" variant="info">
          <Timer aria-hidden="true" class="size-3" />
          {{ t.timerRunning }}
        </NqBadge>
      </div>
      <NqIssueInlineTitle :value="props.issue.title" :read-only="readOnly" :on-save="props.onUpdate ? saveTitle : undefined" :t="t" />
    </header>

    <div :class="cn('grid min-w-0 gap-6', !drawer && '@3xl:grid-cols-[minmax(0,1fr)_19rem]')">
      <div v-if="drawer" class="rounded-card border border-border p-3">
        <section :aria-label="t.details" class="flex min-w-0 flex-col gap-3">
          <NqIssueProperties :issue="props.issue" :statuses="props.statuses" :labels="props.labels" :people="props.people" :projects="props.projects" :parent-options="props.parentOptions" :logged-seconds="loggedSeconds" :on-update="props.onUpdate" :now="props.now" :text="props.labelsText" />
          <p class="m-0 flex flex-wrap gap-x-3 text-caption text-muted-foreground">
            <span>{{ t.created }} <bdi>{{ dateText(props.issue.createdAt) }}</bdi></span>
            <span v-if="props.issue.updatedAt">{{ t.updated }} <bdi>{{ dateText(props.issue.updatedAt) }}</bdi></span>
          </p>
        </section>
      </div>
      <div class="flex min-w-0 flex-col gap-6">
        <NqIssueDescription :value="props.issue.description" :read-only="readOnly" :on-save="props.onUpdate ? saveDescription : undefined" :load="props.load" :t="t" />
        <NqChecklist v-if="props.checklist" v-bind="props.checklist" :read-only="readOnly && !props.checklist.onToggle" />
        <NqIssueSubIssues v-if="props.subIssues.length > 0 || props.onAddSubIssue" :items="props.subIssues" :statuses="props.statuses" :people="props.people" :on-add="props.onAddSubIssue" :on-open="props.onOpenIssue" :t="t" />
        <section v-if="props.development" aria-labelledby="issue-dev-h" class="flex min-w-0 flex-col gap-2">
          <h2 id="issue-dev-h" class="m-0 text-body font-semibold">{{ t.development }}</h2>
          <NqGithubActivity v-bind="props.development" hide-search />
        </section>
        <NqTabs v-if="tabs.length > 0" :default-value="firstTab">
          <NqTabsList variant="underline" :aria-label="t.activity" class="max-w-full overflow-x-auto">
            <NqTabsTab v-for="x in tabs" :key="x.id" :value="x.id">
              {{ x.label }}
              <span v-if="x.count" class="ms-1.5 text-caption text-muted-foreground"><NqNum :value="x.count" /></span>
            </NqTabsTab>
          </NqTabsList>
          <NqTabsPanel v-if="props.thread" value="comments" class="pt-4">
            <NqCommentThread v-bind="props.thread" hide-header />
          </NqTabsPanel>
          <NqTabsPanel v-if="props.activity" value="activity" class="flex flex-col gap-4 pt-4">
            <NqActivityComposer :on-submit="props.activity.onSubmit" />
            <NqActivityTimeline :activities="props.activity.items" :on-toggle-task="props.activity.onToggleTask" :on-delete="props.activity.onDelete" :now="props.now" />
          </NqTabsPanel>
          <NqTabsPanel v-if="props.time" value="time" class="flex flex-col gap-4 pt-4">
            <NqTimeTracker :projects="timeProjects" :running="props.time.running" :on-start="props.time.onStart" :on-stop="props.time.onStop" @update:running="(r) => props.time?.onRunningChange?.(r)" />
            <NqTimeEntryList :entries="props.time.entries" :projects="timeProjects" :on-add="props.time.onAdd" :on-edit="props.time.onEdit" :on-delete="props.time.onDelete" />
          </NqTabsPanel>
          <NqTabsPanel v-if="props.ai" value="ai" class="flex flex-col gap-4 pt-4">
            <NqTokenCostMeter v-if="props.ai.run" v-bind="props.ai.run" :currency="props.ai.currency" />
            <NqAiUsageCost :days="props.ai.days" :by-model="props.ai.byModel" :by-product="props.ai.byProduct" :by-run="props.ai.byRun" :markup="props.ai.markup" :currency="props.ai.currency" :previous-total="props.ai.previousTotal" />
          </NqTabsPanel>
        </NqTabs>
      </div>
      <aside v-if="!drawer" class="min-w-0 @3xl:sticky @3xl:top-4 @3xl:self-start">
        <section :aria-label="t.details" class="flex min-w-0 flex-col gap-3">
          <NqIssueProperties :issue="props.issue" :statuses="props.statuses" :labels="props.labels" :people="props.people" :projects="props.projects" :parent-options="props.parentOptions" :logged-seconds="loggedSeconds" :on-update="props.onUpdate" :now="props.now" :text="props.labelsText" />
          <p class="m-0 flex flex-wrap gap-x-3 text-caption text-muted-foreground">
            <span>{{ t.created }} <bdi>{{ dateText(props.issue.createdAt) }}</bdi></span>
            <span v-if="props.issue.updatedAt">{{ t.updated }} <bdi>{{ dateText(props.issue.updatedAt) }}</bdi></span>
          </p>
        </section>
      </aside>
    </div>
  </article>
</template>
