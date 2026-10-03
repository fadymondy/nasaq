<script setup lang="ts">
import { CalendarDays, GitBranch, Plus } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqActivityComposer, NqActivityTimeline } from "../activity-composer";
import { NqAiUsageCost } from "../ai-usage-cost";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqAvatarStack } from "../entity-list";
import { NqEnvList } from "../env-list";
import { NqGithubActivity } from "../github-activity";
import type { IssueActivityProps, IssueAiProps, IssueTimeProps } from "../issue-view";
import type { Issue, IssuePatch, IssuePerson } from "../issue-view/issue-logic";
import { NqDateTime, NqNum } from "../numeric";
import { NqProgress } from "../progress";
import { NqRepositoryPicker } from "../repository-picker";
import { NqEmptyState } from "../states";
import { NqStatus, type StatusTone } from "../status";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { NqTimeEntryList, NqTimeTracker } from "../time-tracker";
import { NqVault } from "../vault";
import NqProjectBoard from "./NqProjectBoard.vue";
import NqProjectFeed from "./NqProjectFeed.vue";
import NqProjectFiles from "./NqProjectFiles.vue";
import NqProjectIssueTable from "./NqProjectIssueTable.vue";
import NqProjectMemory from "./NqProjectMemory.vue";
import NqProjectNewIssue from "./NqProjectNewIssue.vue";
import NqProjectOverview from "./NqProjectOverview.vue";
import NqProjectSchedule from "./NqProjectSchedule.vue";
import NqProjectSettings from "./NqProjectSettings.vue";
import { dayKey, openIssues } from "./project-logic";
import { useProjectStrings, type ProjectViewLabels } from "./strings";
import type {
  NewIssueInput,
  ProjectActivityItem,
  ProjectBudget,
  ProjectDetails,
  ProjectFile,
  ProjectGithub,
  ProjectMemoryProps,
  ProjectPatch,
  ProjectResult,
  ProjectSettingsExtras,
  ProjectTab,
  ProjectVault,
  ProjectWorkflow,
} from "./types";

// A project on one screen: header, then tabs for the overview, board, list, timeline, activity, time, AI cost, files,
// memory, vault, GitHub and settings. All changes go out through callbacks.
interface Props {
  project: ProjectDetails;
  issues: Issue[];
  statuses: WorkStatus[];
  labels: WorkLabel[];
  people: IssuePerson[];
  /** Change one issue: a board drop, an in-cell edit. Return `{ error }` to roll it back. */
  onUpdateIssue?: (id: string, patch: IssuePatch) => Promise<ProjectResult>;
  /** A board drop: the issue, its new status and its position in that column. Defaults to `onUpdateIssue({ statusId })`. */
  onMoveIssue?: (id: string, statusId: string, index: number) => Promise<ProjectResult>;
  /** Create an issue from the header button. Omit to hide it. */
  onCreateIssue?: (input: NewIssueInput) => Promise<ProjectResult>;
  onDeleteIssue?: (id: string) => Promise<ProjectResult>;
  /** An issue was chosen (row, card, bar). Open the quick view or the page. */
  onOpenIssue?: (issue: Issue) => void;
  activity?: ProjectActivityItem[];
  budget?: ProjectBudget | null;
  /** Notes, calls and meetings on the Timeline tab. */
  notes?: IssueActivityProps;
  /** Time for the whole project. Shows the Time tab. */
  time?: IssueTimeProps & { projects?: InstanceType<typeof NqTimeTracker>["$props"]["projects"] };
  /** Shows the AI cost tab. */
  ai?: Omit<IssueAiProps, "run">;
  /** Shows the Files tab. */
  files?: ProjectFile[];
  onUploadFiles?: (files: File[]) => Promise<ProjectResult>;
  onDownloadFile?: (file: ProjectFile) => void;
  onDeleteFile?: (id: string) => Promise<ProjectResult>;
  /** Shows the Memory tab: facts and decisions the project remembers. */
  memory?: ProjectMemoryProps;
  /** Shows the Vault tab. */
  vault?: ProjectVault;
  /** Shows the GitHub tab. */
  github?: ProjectGithub;
  /** Shows the Settings tab: project details and the status and label manager. */
  onSaveProject?: (patch: ProjectPatch) => Promise<ProjectResult>;
  workflow?: ProjectWorkflow;
  /** Members, integrations and the danger zone on the Settings tab. */
  settings?: ProjectSettingsExtras;
  defaultTab?: ProjectTab;
  /** Controlled tab. */
  tab?: ProjectTab;
  onTabChange?: (tab: ProjectTab) => void;
  /** "Now" for overdue, the burndown edge and the timeline's today line. */
  now?: number;
  /** Which tabs to show, in order. Default all that have data. */
  tabs?: ProjectTab[];
  labelsText?: ProjectViewLabels;
}
const props = withDefaults(defineProps<Props>(), { defaultTab: "overview" });

const STATUS_TONE: Record<string, StatusTone> = { planning: "neutral", active: "info", "on-hold": "warning", completed: "success", archived: "neutral" };
const DATE_FMT = { day: "numeric", month: "short", year: "numeric" } as const;

const { t, locale } = useProjectStrings(() => props.labelsText);
const creating = ref(false);
const moveError = ref<string | null>(null);
const current = ref<ProjectTab>(props.tab ?? props.defaultTab);
watch(
  () => props.tab,
  (v) => {
    if (v) current.value = v;
  },
);
const setTab = (v: string | number) => {
  current.value = v as ProjectTab;
  props.onTabChange?.(v as ProjectTab);
};

const today = computed(() => dayKey(props.now ?? Date.now()));
const available = computed(() => {
  const all: ProjectTab[] = ["overview", "board", "list", "timeline"];
  if (props.activity) all.push("activity");
  if (props.time) all.push("time");
  if (props.ai) all.push("ai");
  if (props.files) all.push("files");
  if (props.memory) all.push("memory");
  if (props.vault) all.push("vault");
  if (props.github) all.push("github");
  if (props.onSaveProject || props.workflow || props.settings) all.push("settings");
  return props.tabs ? props.tabs.filter((x) => all.includes(x)) : all;
});
const openCount = computed(() => openIssues(props.issues, props.statuses).length);

async function move(id: string, statusId: string, index: number) {
  const result = props.onMoveIssue ? await props.onMoveIssue(id, statusId, index) : await props.onUpdateIssue?.(id, { statusId });
  moveError.value = result && "error" in result && result.error ? result.error : null;
}

const overviewText = computed(() => {
  const x = t.value;
  return {
    open: x.open, done: x.done, overdue: x.overdue, progress: x.progress, byStatus: x.byStatus, byStatusHint: x.byStatusHint, burndown: x.burndown, burndownHint: x.burndownHint,
    remaining: x.remaining, ideal: x.ideal, recent: x.recent, noActivity: x.noActivity, budget: x.budget, budgetHint: x.budgetHint, spent: x.spent, left: x.left, over: x.over, noBudget: x.noBudget, issues: x.issues,
  };
});
const scheduleText = computed(() => {
  const x = t.value;
  return { label: x.scheduleLabel, empty: x.scheduleEmpty, emptyHint: x.scheduleEmptyHint, unscheduled: x.unscheduled, open: x.openIssue, copyKey: x.copyKey, actions: x.actions, today: x.today };
});
const timeProjects = computed(() => props.time?.projects ?? [{ id: props.project.id, name: props.project.name, tasks: props.issues.map((i) => ({ id: i.id, name: `${i.key} ${i.title}` })) }]);
const dateOf = (v: string) => new Date(`${v}T00:00:00`);

const vaultProps = computed(() => {
  const { env: _env, ...rest } = props.vault ?? ({} as ProjectVault);
  return rest;
});
const githubFeeds = computed(() => {
  const { picker: _picker, repo: _repo, ...rest } = props.github ?? ({} as ProjectGithub);
  return rest;
});
</script>

<template>
  <section data-slot="project-view" :aria-label="props.project.name" class="@container flex min-w-0 flex-col gap-5">
    <header class="flex min-w-0 flex-col gap-3">
      <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1.5">
          <div class="flex min-w-0 flex-wrap items-center gap-2">
            <h1 class="m-0 min-w-0 text-title-sm font-semibold">{{ props.project.name }}</h1>
            <NqBadge v-if="props.project.key" variant="outline"><bdi dir="ltr" class="font-mono">{{ props.project.key }}</bdi></NqBadge>
            <NqStatus :tone="STATUS_TONE[props.project.status]">{{ t.statuses[props.project.status] }}</NqStatus>
          </div>
          <div class="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
            <span v-if="props.project.client">{{ t.client }}: <span class="text-foreground">{{ props.project.client }}</span></span>
            <span class="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" class="size-4" />
              <template v-if="props.project.startDate || props.project.dueDate">
                <NqDateTime v-if="props.project.startDate" :value="dateOf(props.project.startDate)" :format="DATE_FMT" />
                <template v-if="props.project.startDate && props.project.dueDate"> – </template>
                <NqDateTime v-if="props.project.dueDate" :value="dateOf(props.project.dueDate)" :format="DATE_FMT" />
              </template>
              <template v-else>{{ t.noDates }}</template>
            </span>
            <span class="inline-flex items-center gap-2">
              <span>{{ t.members }}</span>
              <NqAvatarStack :people="props.project.members ?? []" />
            </span>
          </div>
        </div>
        <NqButton v-if="props.onCreateIssue" @click="creating = true"><Plus aria-hidden="true" />{{ t.newIssue }}</NqButton>
      </div>
      <NqProgress :aria-label="t.progress" :label="t.progress" :value="props.project.progress" size="sm" />
    </header>

    <NqTabs :model-value="current" @update:model-value="setTab">
      <NqTabsList variant="underline" :aria-label="props.project.name" class="max-w-full overflow-x-auto">
        <NqTabsTab v-for="id in available" :key="id" :value="id">
          {{ t.tabs[id] }}
          <span v-if="id === 'list' || id === 'board'" class="ms-1.5 text-caption text-muted-foreground"><NqNum :value="id === 'board' ? openCount : props.issues.length" /></span>
        </NqTabsTab>
      </NqTabsList>

      <NqTabsPanel value="overview" class="pt-4">
        <NqProjectOverview :issues="props.issues" :statuses="props.statuses" :activity="props.activity" :budget="props.budget" :today="today" :t="overviewText" />
      </NqTabsPanel>
      <NqTabsPanel value="board" class="flex flex-col gap-2 pt-4">
        <p v-if="moveError" role="alert" class="m-0 text-body-sm text-nq-danger-text">{{ moveError }}</p>
        <div class="min-w-0 overflow-x-auto">
          <NqProjectBoard :issues="props.issues" :statuses="props.statuses" :labels="props.labels" :people="props.people" :on-move="(id, statusId, index) => void move(id, statusId, index)" :on-open="props.onOpenIssue" :t="t" />
        </div>
      </NqTabsPanel>
      <NqTabsPanel value="list" class="pt-4">
        <NqProjectIssueTable :issues="props.issues" :statuses="props.statuses" :people="props.people" :on-edit="props.onUpdateIssue" :on-open="props.onOpenIssue" :on-delete="props.onDeleteIssue" :on-create="props.onCreateIssue ? () => (creating = true) : undefined" :t="t" />
      </NqTabsPanel>
      <NqTabsPanel value="timeline" class="flex flex-col gap-6 pt-4">
        <NqProjectSchedule :issues="props.issues" :statuses="props.statuses" :today="today" :on-open-issue="props.onOpenIssue" :t="scheduleText" />
        <section v-if="props.notes" aria-labelledby="project-notes-h" class="flex flex-col gap-3">
          <h2 id="project-notes-h" class="m-0 text-body font-semibold">{{ t.notes }}</h2>
          <NqActivityComposer :on-submit="props.notes.onSubmit" />
          <NqActivityTimeline :activities="props.notes.items" :on-toggle-task="props.notes.onToggleTask" :on-delete="props.notes.onDelete" :now="props.now" />
        </section>
      </NqTabsPanel>
      <NqTabsPanel v-if="props.time" value="time" class="flex flex-col gap-4 pt-4">
        <NqTimeTracker :projects="timeProjects" :running="props.time.running" :on-start="props.time.onStart" :on-stop="props.time.onStop" @update:running="(r) => props.time?.onRunningChange?.(r)" />
        <NqTimeEntryList :entries="props.time.entries" :projects="timeProjects" :on-add="props.time.onAdd" :on-edit="props.time.onEdit" :on-delete="props.time.onDelete" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.ai" value="ai" class="pt-4">
        <NqAiUsageCost :days="props.ai.days" :by-model="props.ai.byModel" :by-product="props.ai.byProduct" :by-run="props.ai.byRun" :markup="props.ai.markup" :currency="props.ai.currency" :previous-total="props.ai.previousTotal" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.files" value="files" class="pt-4">
        <NqProjectFiles :files="props.files" :on-upload="props.onUploadFiles" :on-download="props.onDownloadFile" :on-delete="props.onDeleteFile" :t="t" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.activity" value="activity" class="pt-4">
        <NqProjectFeed :items="props.activity" :today="today" :t="t" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.memory" value="memory" class="pt-4">
        <NqProjectMemory v-bind="props.memory" :t="t" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.vault" value="vault" class="flex flex-col gap-8 pt-4">
        <NqVault v-bind="vaultProps" :title="props.vault.title ?? t.vaultTitle" :description="props.vault.description ?? t.vaultDescription" />
        <NqEnvList v-if="props.vault.env" v-bind="props.vault.env" :title="props.vault.env.title ?? t.envTitle" :description="props.vault.env.description ?? t.envDescription" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.github" value="github" class="flex flex-col gap-4 pt-4">
        <section v-if="props.github.picker" :aria-label="t.ghRepo" class="flex max-w-xl flex-col gap-2">
          <h2 class="m-0 text-body font-semibold">{{ props.github.repo ? t.ghRepo : t.ghConnectTitle }}</h2>
          <p v-if="!props.github.repo" class="m-0 text-body-sm text-muted-foreground">{{ t.ghConnectHint }}</p>
          <NqRepositoryPicker v-bind="props.github.picker" />
        </section>
        <NqGithubActivity v-if="props.github.repo" v-bind="githubFeeds" :repo="props.github.repo" />
        <NqEmptyState v-else :icon="GitBranch" :title="t.ghNotConnected" :description="t.ghNotConnectedHint" />
      </NqTabsPanel>
      <NqTabsPanel v-if="props.onSaveProject || props.workflow || props.settings" value="settings" class="pt-4">
        <NqProjectSettings :project="props.project" :on-save="props.onSaveProject" :workflow="props.workflow" :statuses="props.statuses" :labels="props.labels" :budget="props.budget" :extras="props.settings" :t="t" />
      </NqTabsPanel>
    </NqTabs>

    <NqProjectNewIssue v-if="props.onCreateIssue" v-model:open="creating" :on-create="props.onCreateIssue" :t="t" />
  </section>
</template>
