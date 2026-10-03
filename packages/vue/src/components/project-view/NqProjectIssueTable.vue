<script setup lang="ts">
import { ExternalLink, Link2, Plus, Trash2 } from "lucide-vue-next";
import { computed, h } from "vue";
import { NqAvatar } from "../avatar";
import { NqBadge } from "../badge";
import {
  NqDataTable,
  NqDataTableActions,
  NqDataTableFacetFilter,
  NqDataTableSearch,
  NqDataTableToolbar,
  useDataTable,
  type DataTableCellEditResult,
  type DataTableCellValue,
  type DataTableColumn,
} from "../data-table";
import { ISSUE_PRIORITIES, ISSUE_PRIORITY_RANK, type Issue, type IssuePatch, type IssuePerson, type IssuePriority, type IssueResult } from "../issue-view/issue-logic";
import NqPriorityIcon from "../issue-view/NqPriorityIcon.vue";
import { useIssueStrings } from "../issue-view/strings";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState } from "../states";
import type { WorkStatus } from "../status-label-manager/status-label-logic";
import type { ProjectViewStrings } from "./strings";

// The list tab: a DataTable with in-cell editing mapped to issue patches, facet filters, a New issue action and row actions.
const props = defineProps<{
  issues: readonly Issue[];
  statuses: readonly WorkStatus[];
  people: readonly IssuePerson[];
  onEdit?: (id: string, patch: IssuePatch) => Promise<IssueResult | void>;
  onOpen?: (issue: Issue) => void;
  onDelete?: (id: string) => Promise<IssueResult | void>;
  onCreate?: () => void;
  t: ProjectViewStrings;
}>();

const { t: it } = useIssueStrings(() => undefined);
const editable = computed(() => Boolean(props.onEdit));
const dash = () => h("span", { class: "text-muted-foreground" }, "—");

const columns = computed<DataTableColumn<Issue>[]>(() => {
  const t = props.t;
  const statusOf = new Map(props.statuses.map((s) => [s.id, s]));
  const personOf = new Map(props.people.map((p) => [p.id, p]));
  const ed = editable.value;
  return [
    { id: "key", header: t.colKey, cell: (r) => h("bdi", { dir: "ltr", class: "font-mono text-body-sm" }, r.key), sortValue: (r) => r.key, searchValue: (r) => r.key, hideable: false },
    {
      id: "title",
      header: t.colTitle,
      cell: (r) => h("span", { class: "line-clamp-2 min-w-48" }, r.title),
      sortValue: (r) => r.title,
      searchValue: (r) => r.title,
      edit: ed ? { type: "text", value: (r) => r.title, validate: (v) => (String(v ?? "").trim() ? null : t.title) } : undefined,
    },
    {
      id: "status",
      header: t.colStatus,
      cell: (r) => h(NqBadge, { variant: "tag", hue: statusOf.get(r.statusId)?.hue ?? "gray" }, () => statusOf.get(r.statusId)?.name ?? r.statusId),
      sortValue: (r) => props.statuses.findIndex((s) => s.id === r.statusId),
      filterValue: (r) => r.statusId,
      edit: ed ? { type: "select", value: (r) => r.statusId, options: props.statuses.map((s) => ({ value: s.id, label: s.name, hue: s.hue })) } : undefined,
    },
    {
      id: "priority",
      header: t.colPriority,
      cell: (r) => h("span", { class: "inline-flex items-center gap-1.5" }, [h(NqPriorityIcon, { priority: r.priority }), it.value.priorities[r.priority]]),
      sortValue: (r) => ISSUE_PRIORITY_RANK[r.priority],
      filterValue: (r) => r.priority,
      edit: ed ? { type: "select", value: (r) => r.priority, options: ISSUE_PRIORITIES.map((p) => ({ value: p, label: it.value.priorities[p] })) } : undefined,
    },
    {
      id: "assignee",
      header: t.colAssignee,
      cell: (r) => {
        const p = r.assigneeId ? personOf.get(r.assigneeId) : undefined;
        return p ? h("span", { class: "inline-flex items-center gap-2" }, [h(NqAvatar, { name: p.name, src: p.avatar, size: "xs" }), p.name]) : h("span", { class: "text-muted-foreground" }, t.unassigned);
      },
      sortValue: (r) => personOf.get(r.assigneeId ?? "")?.name ?? "",
      filterValue: (r) => r.assigneeId ?? "",
      edit: ed ? { type: "select", value: (r) => r.assigneeId ?? "", options: [{ value: "", label: t.unassigned }, ...props.people.map((p) => ({ value: p.id, label: p.name }))] } : undefined,
    },
    {
      id: "due",
      header: t.colDue,
      cell: (r) => (r.dueDate ? h(NqDateTime, { value: new Date(`${r.dueDate}T00:00:00`), format: { day: "numeric", month: "short" } }) : dash()),
      sortValue: (r) => r.dueDate ?? null,
      edit: ed ? { type: "date", value: (r) => r.dueDate ?? null } : undefined,
    },
    {
      id: "estimate",
      header: t.colEstimate,
      align: "end",
      cell: (r) => (r.estimateHours != null ? h(NqNum, { value: r.estimateHours }) : dash()),
      sortValue: (r) => r.estimateHours ?? null,
      edit: ed ? { type: "number", value: (r) => r.estimateHours ?? null, validate: (v) => (typeof v === "number" && v < 0 ? t.colEstimate : null) } : undefined,
    },
  ];
});

const table = useDataTable<Issue>({ data: () => props.issues as Issue[], columns: () => columns.value, getRowId: (r) => r.id, pageSize: 25, defaultSort: null });

async function onCellEdit(row: Issue, columnId: string, value: DataTableCellValue): Promise<DataTableCellEditResult> {
  if (!props.onEdit) return;
  const patch: IssuePatch =
    columnId === "title"
      ? { title: String(value ?? "").trim() }
      : columnId === "status"
        ? { statusId: String(value) }
        : columnId === "priority"
          ? { priority: value as IssuePriority }
          : columnId === "assignee"
            ? { assigneeId: value ? String(value) : null }
            : columnId === "due"
              ? { dueDate: value ? String(value) : null }
              : { estimateHours: typeof value === "number" ? value : null };
  const result = await props.onEdit(row.id, patch);
  return result && "error" in result ? { error: result.error } : undefined;
}

const rowActions = (r: Issue) => [
  ...(props.onOpen ? [{ id: "open", label: props.t.openIssue, icon: ExternalLink, onSelect: () => props.onOpen?.(r) }] : []),
  { id: "copy", label: props.t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(r.key) },
  ...(props.onDelete ? [{ id: "delete", label: props.t.deleteIssue, icon: Trash2, danger: true, group: "danger", onSelect: () => void props.onDelete?.(r.id) }] : []),
];
const toolbarActions = computed(() => (props.onCreate ? [{ id: "new", label: props.t.newIssue, icon: Plus, primary: true, onSelect: () => props.onCreate?.() }] : []));
</script>

<template>
  <div data-slot="project-issue-table" class="flex min-w-0 flex-col gap-3">
    <NqDataTableToolbar>
      <NqDataTableSearch :table="table" :placeholder="props.t.search" />
      <NqDataTableFacetFilter :table="table" column="status" :title="props.t.colStatus" :options="props.statuses.map((s) => ({ value: s.id, label: s.name }))" />
      <NqDataTableFacetFilter :table="table" column="priority" :title="props.t.colPriority" :options="ISSUE_PRIORITIES.map((p) => ({ value: p, label: it.priorities[p] }))" />
      <NqDataTableActions v-if="props.onCreate" class="ms-auto" :actions="toolbarActions" />
    </NqDataTableToolbar>
    <NqDataTable :table="table" :label="props.t.listLabel" :row-label="(r: Issue) => r.key" :on-row-click="props.onOpen" :on-cell-edit="props.onEdit ? onCellEdit : undefined" :row-actions="rowActions">
      <template #empty><NqEmptyState :title="props.t.emptyIssues" :description="props.t.emptyIssuesHint" /></template>
    </NqDataTable>
  </div>
</template>
