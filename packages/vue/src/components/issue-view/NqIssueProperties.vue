<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqNum } from "../numeric";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import {
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  issueDueState,
  issueEstimateSummary,
  issueFormatHours,
  issueIsOpen,
  issueParentCandidates,
  issueParseEstimate,
  type Issue,
  type IssuePatch,
  type IssuePerson,
  type IssueRef,
  type IssueResult,
} from "./issue-logic";
import NqIssueCommitInput from "./NqIssueCommitInput.vue";
import NqIssueLabelPicker from "./NqIssueLabelPicker.vue";
import NqIssuePropertySelect, { type IssueOption } from "./NqIssuePropertySelect.vue";
import { useIssueStrings, type IssueViewLabels } from "./strings";

// The properties of an issue as an editable list: status, priority, type, assignee, labels, estimate, due date, project and parent.
// Each field saves on its own through `onUpdate`; errors show under the list.
interface Props {
  issue: Issue;
  statuses: WorkStatus[];
  labels: WorkLabel[];
  people: IssuePerson[];
  projects: { id: string; name: string }[];
  /** Issues offered as the parent. The issue and its descendants are left out. */
  parentOptions?: (IssueRef & { parentId?: string | null })[];
  /** Whole seconds already logged, for the estimate line. */
  loggedSeconds?: number;
  /** Save a change. Return `{ error }` to show it. Omit for read-only properties. */
  onUpdate?: (patch: IssuePatch) => Promise<IssueResult>;
  /** "Now" for the due-date colour. */
  now?: number;
  text?: IssueViewLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { parentOptions: () => [], loggedSeconds: 0, onUpdate: undefined, now: undefined, text: undefined });
const { t } = useIssueStrings(() => props.text);
const ids = useId();
const busy = ref(false);
const error = ref<string | null>(null);
const disabled = computed(() => !props.onUpdate || busy.value);
const rowId = (name: string) => `${ids}-${name}`;

async function save(patch: IssuePatch) {
  const update = props.onUpdate;
  if (!update) return;
  busy.value = true;
  error.value = null;
  const result = await update(patch);
  busy.value = false;
  if (result && "error" in result && result.error) error.value = result.error;
}

const summary = computed(() => issueEstimateSummary(props.loggedSeconds, props.issue.estimateHours));
const open = computed(() => issueIsOpen(props.issue, props.statuses));
const due = computed(() => issueDueState(props.issue.dueDate, props.now ?? Date.now(), open.value));
const statusOf = computed(() => new Map(props.statuses.map((s) => [s.id, s])));

const statusOptions = computed<IssueOption[]>(() => props.statuses.map((s) => ({ value: s.id, label: s.name, icon: { status: s.hue } })));
const priorityOptions = computed<IssueOption[]>(() => ISSUE_PRIORITIES.map((p) => ({ value: p, label: t.value.priorities[p], icon: { priority: p } })));
const typeOptions = computed<IssueOption[]>(() => ISSUE_TYPES.map((x) => ({ value: x, label: t.value.types[x], icon: { type: x } })));
const peopleOptions = computed<IssueOption[]>(() => props.people.map((p) => ({ value: p.id, label: p.name, icon: { avatar: { name: p.name, src: p.avatar } } })));
const projectOptions = computed<IssueOption[]>(() => props.projects.map((p) => ({ value: p.id, label: p.name })));
const parentOpts = computed<IssueOption[]>(() =>
  issueParentCandidates(props.issue.id, props.parentOptions).map((p) => ({ value: p.id, label: `${p.key} ${p.title}`, icon: { status: statusOf.value.get(p.statusId)?.hue } })),
);

function commitEstimate(text: string) {
  const parsed = issueParseEstimate(text);
  if (text.trim() === "" || parsed !== null) void save({ estimateHours: parsed });
  else error.value = t.value.estimateHint;
}
</script>

<template>
  <dl data-slot="issue-properties" :aria-busy="busy" :class="cn('m-0 flex min-w-0 flex-col gap-1.5', props.class)">
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('status')" class="text-body-sm text-muted-foreground">{{ t.status }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('status')" :value="props.issue.statusId" :disabled="disabled" :options="statusOptions" @change="(v) => v && save({ statusId: v })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('priority')" class="text-body-sm text-muted-foreground">{{ t.priority }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('priority')" :value="props.issue.priority" :disabled="disabled" :options="priorityOptions" @change="(v) => v && save({ priority: v as Issue['priority'] })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('type')" class="text-body-sm text-muted-foreground">{{ t.type }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('type')" :value="props.issue.type" :disabled="disabled" :options="typeOptions" @change="(v) => v && save({ type: v as Issue['type'] })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('assignee')" class="text-body-sm text-muted-foreground">{{ t.assignee }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('assignee')" :value="props.issue.assigneeId" :disabled="disabled" :none="t.unassigned" :options="peopleOptions" @change="(v) => save({ assigneeId: v })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('labels')" class="text-body-sm text-muted-foreground">{{ t.labels }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssueLabelPicker :label-id="rowId('labels')" :labels="props.labels" :value="props.issue.labelIds" :disabled="disabled" :t="t" @change="(v) => save({ labelIds: v })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('estimate')" class="text-body-sm text-muted-foreground">{{ t.estimate }}</dt>
      <dd class="m-0 min-w-0">
        <div class="flex min-w-0 flex-col gap-0.5">
          <NqIssueCommitInput
            :aria-labelledby="rowId('estimate')"
            ltr
            :disabled="disabled"
            :placeholder="t.noEstimate"
            :title="t.estimateHint"
            :value="props.issue.estimateHours != null ? issueFormatHours(props.issue.estimateHours) : ''"
            @commit="commitEstimate"
          />
          <span v-if="props.loggedSeconds > 0" :class="cn('px-2 text-caption', summary.over ? 'text-nq-danger-text' : 'text-muted-foreground')">
            <bdi>{{ t.logged(issueFormatHours(summary.loggedHours)) }}</bdi>
            <template v-if="summary.over"> · {{ t.over }}</template>
            <template v-if="summary.ratio !== null">
              {{ " · " }}
              <NqNum :value="summary.ratio" :format="{ style: 'percent', maximumFractionDigits: 0 }" />
            </template>
          </span>
        </div>
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('due')" class="text-body-sm text-muted-foreground">{{ t.due }}</dt>
      <dd class="m-0 min-w-0">
        <div class="flex min-w-0 flex-col gap-0.5">
          <NqIssueCommitInput :aria-labelledby="rowId('due')" type="date" ltr :disabled="disabled" :value="props.issue.dueDate ?? ''" @commit="(text) => save({ dueDate: text || null })" />
          <span v-if="due === 'overdue' || due === 'today' || due === 'soon'" :class="cn('px-2 text-caption', due === 'overdue' ? 'text-nq-danger-text' : due === 'today' ? 'text-nq-warning-text' : 'text-muted-foreground')">
            {{ due === "overdue" ? t.overdue : due === "today" ? t.dueToday : t.dueSoon }}
          </span>
        </div>
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('project')" class="text-body-sm text-muted-foreground">{{ t.project }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('project')" :value="props.issue.projectId" :disabled="disabled" :options="projectOptions" @change="(v) => v && save({ projectId: v })" />
      </dd>
    </div>
    <div data-slot="issue-property" class="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt :id="rowId('parent')" class="text-body-sm text-muted-foreground">{{ t.parent }}</dt>
      <dd class="m-0 min-w-0">
        <NqIssuePropertySelect :label-id="rowId('parent')" :value="props.issue.parentId" :disabled="disabled" :none="t.noParent" :options="parentOpts" @change="(v) => save({ parentId: v })" />
      </dd>
    </div>
    <p v-if="error" role="alert" class="text-body-sm text-nq-danger-text">{{ error }}</p>
  </dl>
</template>
