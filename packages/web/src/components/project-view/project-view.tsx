"use client";

import { CalendarDays, Download, ExternalLink, FileText, GitBranch, Link2, Plus, Trash2, Upload } from "lucide-react";
import { type ComponentProps, type ReactNode, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { defaultCurrency, useOptionalNasaq } from "../../provider/nasaq-provider";
import { ActivityComposer, ActivityTimeline } from "../activity-composer/activity-composer";
import { AiUsageCost } from "../ai-usage-cost";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { type DataTableCellEditResult, DataTable, DataTableActions, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable, type DataTableColumn } from "../data-table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { AvatarStack, type EntityPerson } from "../entity-list";
import { Field, FieldDescription, FieldLabel, Input } from "../field";
import { type Issue, ISSUE_PRIORITIES, ISSUE_TYPES, type IssuePatch, type IssuePerson, type IssuePriority, type IssueType, isOpenIssue, PRIORITY_RANK } from "../issue-view/issue-logic";
import { IssueCard } from "../issue-view/issue-card";
import { PriorityIcon, TypeIcon, useIssueText } from "../issue-view/issue-marks";
import type { IssueActivityProps, IssueAiProps, IssueTimeProps } from "../issue-view/issue-view";
import { EnvList, type EnvListProps } from "../env-list";
import { GithubActivity, type GithubActivityProps, type GithubRepo } from "../github-activity";
import { KanbanBoard, type KanbanCardData } from "../kanban-board";
import { MembersManager, type MembersManagerProps } from "../members-manager";
import { DateTime, formatNumber, Num } from "../numeric";
import { Meter, Progress } from "../progress";
import { type Project, type ProjectStatus } from "../project-list";
import { RepositoryPicker, type RepositoryPickerProps } from "../repository-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { SettingsSections, type SettingsGroup } from "../settings-sections";
import { EmptyState } from "../states";
import { Status, type StatusTone } from "../status";
import { StatusLabelManager, type StatusLabelManagerProps } from "../status-label-manager";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { TimeEntryList, TimeTracker } from "../time-tracker";
import { Vault, type VaultProps } from "../vault";
import { ProjectFeed } from "./project-feed";
import { ProjectMemory, type ProjectMemoryProps } from "./project-memory";
import { type ProjectActivityItem, type ProjectBudget, ProjectOverview } from "./project-overview";
import { dayKey } from "./project-logic";
import { ProjectSchedule } from "./project-schedule";
import { DangerPage, IntegrationsPage, type ProjectIntegration } from "./project-settings";
import { EXTRA } from "./project-strings";

export type { ProjectActivityItem, ProjectBudget } from "./project-overview";
export type { ProjectMemoryInput, ProjectMemoryItem, MemoryKind } from "./project-memory";
export type { ProjectIntegration } from "./project-settings";

const BASE = {
  en: {
    key: "Key",
    client: "Client",
    members: "Members",
    start: "Starts",
    due: "Due",
    noDates: "No dates",
    progress: "Progress",
    newIssue: "New issue",
    newIssueHint: "Give it a title. You can fill in the rest on the issue.",
    title: "Title",
    type: "Type",
    priority: "Priority",
    create: "Create",
    cancel: "Cancel",
    save: "Save",
    tabs: { overview: "Overview", board: "Board", list: "List", timeline: "Timeline", time: "Time", ai: "AI cost", files: "Files", settings: "Settings" },
    statuses: { planning: "Planning", active: "Active", "on-hold": "On hold", completed: "Completed", archived: "Archived" },
    // Overview
    open: "Open issues",
    done: "Done",
    overdue: "Overdue",
    byStatus: "Open issues by status",
    byStatusHint: "Where the work sits now",
    burndown: "Burndown",
    burndownHint: "Open issues per day against the ideal line",
    remaining: "Remaining",
    ideal: "Ideal",
    recent: "Recent activity",
    noActivity: "Nothing has happened yet",
    budget: "Budget",
    budgetHint: "Spent against the budget",
    spent: "Spent",
    left: "Left",
    over: "Over budget",
    noBudget: "No budget set for this project.",
    issues: "Issues",
    // List
    listLabel: "Issues",
    search: "Search issues…",
    colKey: "Key",
    colTitle: "Title",
    colStatus: "Status",
    colPriority: "Priority",
    colAssignee: "Assignee",
    colDue: "Due",
    colEstimate: "Estimate (h)",
    unassigned: "Unassigned",
    emptyIssues: "No issues yet",
    emptyIssuesHint: "Create the first issue to start the board.",
    openIssue: "Open",
    copyKey: "Copy key",
    deleteIssue: "Delete",
    actions: "Actions",
    boardLabel: "Issue board",
    boardEmpty: "No issues",
    // Timeline
    scheduleLabel: "Issue schedule",
    scheduleEmpty: "Nothing scheduled",
    scheduleEmptyHint: "Give issues a due date to see them here.",
    unscheduled: "Without dates",
    today: "Today",
    notes: "Notes and calls",
    // Files
    filesLabel: "Project files",
    fileName: "Name",
    fileSize: "Size",
    fileBy: "Added by",
    fileAt: "Added",
    upload: "Upload",
    download: "Download",
    deleteFile: "Delete",
    noFiles: "No files yet",
    noFilesHint: "Upload contracts, briefs and assets.",
    // Settings
    details: "Project details",
    name: "Name",
    status: "Status",
    startDate: "Start date",
    dueDate: "Due date",
    budgetTotal: "Budget",
    workflow: "Workflow",
    saved: "Saved",
  },
  ar: {
    key: "الرمز",
    client: "العميل",
    members: "الأعضاء",
    start: "يبدأ",
    due: "الاستحقاق",
    noDates: "بلا تواريخ",
    progress: "التقدم",
    newIssue: "مهمة جديدة",
    newIssueHint: "اكتب عنوانًا. يمكنك إكمال الباقي داخل المهمة.",
    title: "العنوان",
    type: "النوع",
    priority: "الأولوية",
    create: "إنشاء",
    cancel: "إلغاء",
    save: "حفظ",
    tabs: { overview: "نظرة عامة", board: "اللوحة", list: "القائمة", timeline: "الجدول الزمني", time: "الوقت", ai: "تكلفة الذكاء الاصطناعي", files: "الملفات", settings: "الإعدادات" },
    statuses: { planning: "قيد التخطيط", active: "نشط", "on-hold": "معلّق", completed: "مكتمل", archived: "مؤرشف" },
    open: "مهام مفتوحة",
    done: "منجزة",
    overdue: "متأخرة",
    byStatus: "المهام المفتوحة حسب الحالة",
    byStatusHint: "أين يقف العمل الآن",
    burndown: "منحنى الإنجاز",
    burndownHint: "المهام المفتوحة كل يوم مقابل الخط المثالي",
    remaining: "المتبقي",
    ideal: "المثالي",
    recent: "آخر النشاط",
    noActivity: "لم يحدث شيء بعد",
    budget: "الميزانية",
    budgetHint: "المصروف مقابل الميزانية",
    spent: "المصروف",
    left: "المتبقي",
    over: "تجاوز الميزانية",
    noBudget: "لا توجد ميزانية لهذا المشروع.",
    issues: "المهام",
    listLabel: "المهام",
    search: "ابحث في المهام…",
    colKey: "الرمز",
    colTitle: "العنوان",
    colStatus: "الحالة",
    colPriority: "الأولوية",
    colAssignee: "المسؤول",
    colDue: "الاستحقاق",
    colEstimate: "التقدير (س)",
    unassigned: "غير مسند",
    emptyIssues: "لا توجد مهام بعد",
    emptyIssuesHint: "أنشئ أول مهمة لتبدأ اللوحة.",
    openIssue: "فتح",
    copyKey: "نسخ الرمز",
    deleteIssue: "حذف",
    actions: "إجراءات",
    boardLabel: "لوحة المهام",
    boardEmpty: "لا مهام",
    scheduleLabel: "جدول المهام",
    scheduleEmpty: "لا شيء مجدول",
    scheduleEmptyHint: "أضف موعد استحقاق للمهام لتظهر هنا.",
    unscheduled: "بلا تواريخ",
    today: "اليوم",
    notes: "الملاحظات والمكالمات",
    filesLabel: "ملفات المشروع",
    fileName: "الاسم",
    fileSize: "الحجم",
    fileBy: "أضافه",
    fileAt: "أُضيف",
    upload: "رفع",
    download: "تنزيل",
    deleteFile: "حذف",
    noFiles: "لا توجد ملفات بعد",
    noFilesHint: "ارفع العقود والملخصات والأصول.",
    details: "تفاصيل المشروع",
    name: "الاسم",
    status: "الحالة",
    startDate: "تاريخ البدء",
    dueDate: "تاريخ الاستحقاق",
    budgetTotal: "الميزانية",
    workflow: "مسار العمل",
    saved: "تم الحفظ",
  },
};

const STRINGS = {
  en: { ...BASE.en, ...EXTRA.en, tabs: { ...BASE.en.tabs, ...EXTRA.en.tabs } },
  ar: { ...BASE.ar, ...EXTRA.ar, tabs: { ...BASE.ar.tabs, ...EXTRA.ar.tabs } },
};

export type ProjectViewLabels = Partial<Omit<typeof STRINGS.en, "tabs" | "statuses">> & { tabs?: Partial<typeof STRINGS.en.tabs>; statuses?: Partial<typeof STRINGS.en.statuses> };
type Result = void | { error?: string };

/** The project header and settings fields. */
export interface ProjectDetails extends Omit<Project, "dueDate" | "members" | "owner"> {
  members?: EntityPerson[];
  startDate?: string | null;
  dueDate?: string | null;
  budget?: number | null;
  currency?: string;
}

export type ProjectPatch = Partial<Pick<ProjectDetails, "name" | "client" | "status" | "startDate" | "dueDate" | "budget">>;

export interface ProjectFile {
  id: string;
  name: string;
  /** Bytes. */
  size: number;
  uploadedBy?: string;
  uploadedAt: Date | string | number;
}

export interface NewIssueInput {
  title: string;
  type: IssueType;
  priority: IssuePriority;
}

export type ProjectTab = "overview" | "board" | "list" | "timeline" | "time" | "ai" | "files" | "memory" | "vault" | "github" | "activity" | "settings";

/** The GitHub tab: the connected repository and its feeds, and the picker that connects it. */
export interface ProjectGithub extends Omit<GithubActivityProps, "repo"> {
  /** The connected repository, or null before one is picked. */
  repo: GithubRepo | null;
  /** Shows the repository picker above the feeds. */
  picker?: RepositoryPickerProps;
}

/** The Vault tab: this project's secrets, and optionally its environment variables. */
export type ProjectVault = VaultProps & { env?: EnvListProps };

/** What the Settings tab adds to the details form: members, integrations and the danger zone. */
export interface ProjectSettingsExtras {
  /** Members and roles, as `MembersManager` takes them. */
  members?: MembersManagerProps;
  integrations?: ProjectIntegration[];
  onToggleIntegration?: (id: string, connected: boolean) => Promise<Result>;
  /** Shows Archive in the danger zone, behind a confirm. */
  onArchive?: () => Promise<Result>;
  /** Shows Delete in the danger zone; the person types the project key to confirm. */
  onDelete?: () => Promise<Result>;
}

const STATUS_TONE: Record<ProjectStatus, StatusTone> = { planning: "neutral", active: "info", "on-hold": "warning", completed: "success", archived: "neutral" };

export interface ProjectViewProps extends Omit<ComponentProps<"section">, "title" | "onChange"> {
  project: ProjectDetails;
  issues: Issue[];
  statuses: WorkStatus[];
  labels: WorkLabel[];
  people: IssuePerson[];
  /** Change one issue: a board drop, an in-cell edit. Return `{ error }` to roll it back. */
  onUpdateIssue?: (id: string, patch: IssuePatch) => Promise<Result>;
  /** A board drop: the issue, its new status and its position in that column. Defaults to `onUpdateIssue({ statusId })`. */
  onMoveIssue?: (id: string, statusId: string, index: number) => Promise<Result>;
  /** Create an issue from the header button. Omit to hide it. */
  onCreateIssue?: (input: NewIssueInput) => Promise<Result>;
  onDeleteIssue?: (id: string) => Promise<Result>;
  /** An issue was chosen (row, card, bar). Open the quick view or the page. */
  onOpenIssue?: (issue: Issue) => void;
  activity?: ProjectActivityItem[];
  budget?: ProjectBudget | null;
  /** Notes, calls and meetings on the Timeline tab. */
  notes?: IssueActivityProps;
  /** Time for the whole project. Shows the Time tab. */
  time?: IssueTimeProps & { projects?: ComponentProps<typeof TimeTracker>["projects"] };
  /** Shows the AI cost tab. */
  ai?: Omit<IssueAiProps, "run">;
  /** Shows the Files tab. */
  files?: ProjectFile[];
  onUploadFiles?: (files: File[]) => Promise<Result>;
  onDownloadFile?: (file: ProjectFile) => void;
  onDeleteFile?: (id: string) => Promise<Result>;
  /** Shows the Memory tab: facts and decisions the project remembers. */
  memory?: Omit<ProjectMemoryProps, "t">;
  /** Shows the Vault tab. */
  vault?: ProjectVault;
  /** Shows the GitHub tab. */
  github?: ProjectGithub;
  /** Shows the Settings tab: project details and the status and label manager. */
  onSaveProject?: (patch: ProjectPatch) => Promise<Result>;
  workflow?: Omit<StatusLabelManagerProps, "statuses" | "labels">;
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

function useText(labelsText?: ProjectViewLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const base = STRINGS[ar ? "ar" : "en"];
  const t = { ...base, ...labelsText, tabs: { ...base.tabs, ...labelsText?.tabs }, statuses: { ...base.statuses, ...labelsText?.statuses } };
  return { locale, ar, t };
}

/** A fixed, small select that reports the chosen value. */
function SimpleSelect({ label, value, options, onChange }: { label: string; value: string; options: { value: string; label: string; icon?: ReactNode }[]; onChange: (v: string) => void }) {
  return (
    <Select items={options.map((o) => ({ value: o.value, label: o.label }))} value={value} onValueChange={(v) => v != null && onChange(v as string)}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NewIssueDialog({ open, onOpenChange, onCreate, t }: { open: boolean; onOpenChange: (open: boolean) => void; onCreate: (input: NewIssueInput) => Promise<Result>; t: ReturnType<typeof useText>["t"] }) {
  const { t: it } = useIssueText();
  const id = useId();
  const [title, setTitle] = useState("");
  const [type, setType] = useState<IssueType>("task");
  const [priority, setPriority] = useState<IssuePriority>("medium");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!title.trim()) return setError(t.title);
    setBusy(true);
    const result = await onCreate({ title: title.trim(), type, priority });
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setTitle("");
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.newIssue}</DialogTitle>
            <DialogDescription>{t.newIssueHint}</DialogDescription>
          </DialogHeader>
          <Field invalid={Boolean(error)}>
            <FieldLabel>{t.title}</FieldLabel>
            <Input value={title} autoFocus onChange={(e) => setTitle(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <span id={`${id}-type`} className="text-label">
                {t.type}
              </span>
              <SimpleSelect label={t.type} value={type} onChange={(v) => setType(v as IssueType)} options={ISSUE_TYPES.map((x) => ({ value: x, label: it.types[x], icon: <TypeIcon type={x} /> }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label">{t.priority}</span>
              <SimpleSelect label={t.priority} value={priority} onChange={(v) => setPriority(v as IssuePriority)} options={ISSUE_PRIORITIES.map((x) => ({ value: x, label: it.priorities[x], icon: <PriorityIcon priority={x} /> }))} />
            </div>
          </div>
          {error ? (
            <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" loading={busy}>
              {t.create}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface CardIssue extends KanbanCardData {
  issue: Issue;
}

function IssueBoard({ issues, statuses, labels, people, onMove, onOpen, t }: { issues: Issue[]; statuses: WorkStatus[]; labels: WorkLabel[]; people: IssuePerson[]; onMove: (id: string, statusId: string, index: number) => void; onOpen?: (issue: Issue) => void; t: ReturnType<typeof useText>["t"] }) {
  const cards: CardIssue[] = issues.map((i) => ({
    id: i.id,
    columnId: i.statusId,
    title: `${i.key} ${i.title}`,
    issue: i,
  }));
  return (
    <KanbanBoard<CardIssue>
      label={t.boardLabel}
      emptyLabel={t.boardEmpty}
      columns={statuses.map((s) => ({ id: s.id, title: s.name }))}
      cards={cards}
      onMove={onMove}
      className="pb-2"
      cardActions={(card) => [
        ...(onOpen ? [{ id: "open", label: t.openIssue, icon: ExternalLink, onSelect: () => onOpen(card.issue) }] : []),
        { id: "copy", label: t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(card.issue.key) },
      ]}
      renderCard={(card) => (
        <IssueCard
          issue={card.issue}
          labels={labels}
          people={people}
          open={isOpenIssue(card.issue, statuses)}
          onClick={onOpen ? () => onOpen(card.issue) : undefined}
          className={onOpen ? "cursor-pointer" : undefined}
        />
      )}
    />
  );
}

function IssueTable({ issues, statuses, people, onEdit, onOpen, onDelete, onCreate, t }: { issues: Issue[]; statuses: WorkStatus[]; people: IssuePerson[]; onEdit?: (id: string, patch: IssuePatch) => Promise<Result>; onOpen?: (issue: Issue) => void; onDelete?: (id: string) => Promise<Result>; onCreate?: () => void; t: ReturnType<typeof useText>["t"] }) {
  const { t: it } = useIssueText();
  const statusOf = new Map(statuses.map((s) => [s.id, s]));
  const personOf = new Map(people.map((p) => [p.id, p]));
  const editable = Boolean(onEdit);
  const columns: DataTableColumn<Issue>[] = [
    { id: "key", header: t.colKey, cell: (r) => <bdi dir="ltr" className="font-mono text-body-sm">{r.key}</bdi>, sortValue: (r) => r.key, searchValue: (r) => r.key, hideable: false },
    {
      id: "title",
      header: t.colTitle,
      cell: (r) => <span className="line-clamp-2 min-w-48">{r.title}</span>,
      sortValue: (r) => r.title,
      searchValue: (r) => r.title,
      edit: editable ? { type: "text", value: (r) => r.title, validate: (v) => (String(v ?? "").trim() ? null : t.title) } : undefined,
    },
    {
      id: "status",
      header: t.colStatus,
      cell: (r) => (
        <Badge variant="tag" hue={statusOf.get(r.statusId)?.hue ?? "gray"}>
          {statusOf.get(r.statusId)?.name ?? r.statusId}
        </Badge>
      ),
      sortValue: (r) => statuses.findIndex((s) => s.id === r.statusId),
      filterValue: (r) => r.statusId,
      edit: editable ? { type: "select", value: (r) => r.statusId, options: statuses.map((s) => ({ value: s.id, label: s.name, hue: s.hue })) } : undefined,
    },
    {
      id: "priority",
      header: t.colPriority,
      cell: (r) => (
        <span className="inline-flex items-center gap-1.5">
          <PriorityIcon priority={r.priority} />
          {it.priorities[r.priority]}
        </span>
      ),
      sortValue: (r) => PRIORITY_RANK[r.priority],
      filterValue: (r) => r.priority,
      edit: editable ? { type: "select", value: (r) => r.priority, options: ISSUE_PRIORITIES.map((p) => ({ value: p, label: it.priorities[p] })) } : undefined,
    },
    {
      id: "assignee",
      header: t.colAssignee,
      cell: (r) => {
        const p = r.assigneeId ? personOf.get(r.assigneeId) : undefined;
        return p ? (
          <span className="inline-flex items-center gap-2">
            <Avatar name={p.name} src={p.avatar} size="xs" />
            {p.name}
          </span>
        ) : (
          <span className="text-muted-foreground">{t.unassigned}</span>
        );
      },
      sortValue: (r) => personOf.get(r.assigneeId ?? "")?.name ?? "",
      filterValue: (r) => r.assigneeId ?? "",
      edit: editable ? { type: "select", value: (r) => r.assigneeId ?? "", options: [{ value: "", label: t.unassigned }, ...people.map((p) => ({ value: p.id, label: p.name }))] } : undefined,
    },
    {
      id: "due",
      header: t.colDue,
      cell: (r) => (r.dueDate ? <DateTime value={new Date(`${r.dueDate}T00:00:00`)} format={{ day: "numeric", month: "short" }} /> : <span className="text-muted-foreground">—</span>),
      sortValue: (r) => r.dueDate ?? null,
      edit: editable ? { type: "date", value: (r) => r.dueDate ?? null } : undefined,
    },
    {
      id: "estimate",
      header: t.colEstimate,
      align: "end",
      cell: (r) => (r.estimateHours != null ? <Num value={r.estimateHours} /> : <span className="text-muted-foreground">—</span>),
      sortValue: (r) => r.estimateHours ?? null,
      edit: editable ? { type: "number", value: (r) => r.estimateHours ?? null, validate: (v) => (typeof v === "number" && v < 0 ? t.colEstimate : null) } : undefined,
    },
  ];
  const table = useDataTable<Issue>({ data: issues, columns, getRowId: (r) => r.id, pageSize: 25, defaultSort: null });

  const onCellEdit = async (row: Issue, columnId: string, value: unknown): Promise<DataTableCellEditResult> => {
    if (!onEdit) return;
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
    const result = await onEdit(row.id, patch);
    return result && "error" in result ? { error: result.error } : undefined;
  };

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="status" title={t.colStatus} options={statuses.map((s) => ({ value: s.id, label: s.name }))} />
        <DataTableFacetFilter table={table} column="priority" title={t.colPriority} options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: it.priorities[p] }))} />
        {onCreate ? <DataTableActions className="ms-auto" actions={[{ id: "new", label: t.newIssue, icon: Plus, primary: true, onSelect: onCreate }]} /> : null}
      </DataTableToolbar>
      <DataTable
        table={table}
        label={t.listLabel}
        rowLabel={(r) => r.key}
        onRowClick={onOpen}
        onCellEdit={onEdit ? onCellEdit : undefined}
        empty={<EmptyState title={t.emptyIssues} description={t.emptyIssuesHint} />}
        rowActions={(r) => [
          ...(onOpen ? [{ id: "open", label: t.openIssue, icon: ExternalLink, onSelect: () => onOpen(r) }] : []),
          { id: "copy", label: t.copyKey, icon: Link2, onSelect: () => void navigator.clipboard?.writeText(r.key) },
          ...(onDelete ? [{ id: "delete", label: t.deleteIssue, icon: Trash2, danger: true, group: "danger", onSelect: () => void onDelete(r.id) }] : []),
        ]}
      />
    </div>
  );
}

const fileSize = (bytes: number, locale: string) => {
  if (bytes < 1024) return `${formatNumber(bytes, locale)} B`;
  if (bytes < 1024 * 1024) return `${formatNumber(bytes / 1024, locale, { maximumFractionDigits: 0 })} KB`;
  return `${formatNumber(bytes / 1024 / 1024, locale, { maximumFractionDigits: 1 })} MB`;
};

function FilesTab({ files, onUpload, onDownload, onDelete, t, locale }: { files: ProjectFile[]; onUpload?: (files: File[]) => Promise<Result>; onDownload?: (file: ProjectFile) => void; onDelete?: (id: string) => Promise<Result>; t: ReturnType<typeof useText>["t"]; locale: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const columns: DataTableColumn<ProjectFile>[] = [
    {
      id: "name",
      header: t.fileName,
      cell: (r) => (
        <span className="inline-flex min-w-0 items-center gap-2">
          <FileText aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <bdi dir="ltr" className="truncate">
            {r.name}
          </bdi>
        </span>
      ),
      sortValue: (r) => r.name,
      searchValue: (r) => r.name,
      hideable: false,
    },
    { id: "size", header: t.fileSize, align: "end", cell: (r) => <bdi dir="ltr">{fileSize(r.size, locale)}</bdi>, sortValue: (r) => r.size },
    { id: "by", header: t.fileBy, cell: (r) => r.uploadedBy ?? "—", sortValue: (r) => r.uploadedBy ?? "" },
    { id: "at", header: t.fileAt, cell: (r) => <DateTime value={r.uploadedAt} format={{ day: "numeric", month: "short", year: "numeric" }} />, sortValue: (r) => new Date(r.uploadedAt) },
  ];
  const table = useDataTable<ProjectFile>({ data: files, columns, getRowId: (r) => r.id, pageSize: 20 });
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <input
        ref={input}
        type="file"
        multiple
        hidden
        onChange={async (e) => {
          const chosen = [...(e.currentTarget.files ?? [])];
          e.currentTarget.value = "";
          if (!chosen.length || !onUpload) return;
          setUploading(true);
          const result = await onUpload(chosen);
          setUploading(false);
          setError(result && "error" in result && result.error ? result.error : null);
        }}
      />
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        {onUpload ? <DataTableActions className="ms-auto" actions={[{ id: "upload", label: t.upload, icon: Upload, primary: true, loading: uploading, onSelect: () => input.current?.click() }]} /> : null}
      </DataTableToolbar>
      {error ? (
        <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
      <DataTable
        table={table}
        label={t.filesLabel}
        rowLabel={(r) => r.name}
        empty={<EmptyState title={t.noFiles} description={t.noFilesHint} />}
        rowActions={(r) => [
          ...(onDownload ? [{ id: "download", label: t.download, icon: Download, onSelect: () => onDownload(r) }] : []),
          ...(onDelete ? [{ id: "delete", label: t.deleteFile, icon: Trash2, danger: true, group: "danger", onSelect: () => void onDelete(r.id) }] : []),
        ]}
      />
    </div>
  );
}

function vaultOnly({ env: _env, ...rest }: ProjectVault): VaultProps {
  return rest;
}

/** The GitHub props without the picker and the nullable repo. */
function githubFeeds({ picker: _picker, repo: _repo, ...rest }: ProjectGithub): Omit<GithubActivityProps, "repo"> {
  return rest;
}

function SettingsTab({ project, onSave, workflow, statuses, labels, budget, extras, t }: { project: ProjectDetails; onSave?: (patch: ProjectPatch) => Promise<Result>; workflow?: Omit<StatusLabelManagerProps, "statuses" | "labels">; statuses: WorkStatus[]; labels: WorkLabel[]; budget?: ProjectBudget | null; extras?: ProjectSettingsExtras; t: ReturnType<typeof useText>["t"] }) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const [draft, setDraft] = useState({ name: project.name, client: project.client ?? "", status: project.status, startDate: project.startDate ?? "", dueDate: project.dueDate ?? "", budget: project.budget != null ? String(project.budget) : "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const set = <K extends keyof typeof draft>(key: K, value: (typeof draft)[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(null);
  };
  const submit = async (message: string) => {
    if (!draft.name.trim()) return setError(t.name);
    setBusy(true);
    const total = draft.budget.trim() === "" ? null : Number(draft.budget);
    const result = await onSave?.({ name: draft.name.trim(), client: draft.client.trim() || undefined, status: draft.status, startDate: draft.startDate || null, dueDate: draft.dueDate || null, budget: Number.isFinite(total) ? total : null });
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setError(null);
    setSaved(message);
  };
  const feedback = (
    <>
      {saved ? (
        <span role="status" className="text-body-sm text-muted-foreground">
          {saved}
        </span>
      ) : null}
      {error && error !== t.name ? (
        <span role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </span>
      ) : null}
    </>
  );
  const money = (n: number) => formatNumber(n, locale, { style: "currency", currency: budget?.currency ?? project.currency ?? defaultCurrency(locale), maximumFractionDigits: 0 });

  const general = (
    <Card>
      <CardContent className="pt-4">
        <form
          className="grid gap-4 @2xl:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(t.saved);
          }}
        >
          <Field invalid={error === t.name}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input value={draft.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>{t.key}</FieldLabel>
            <Input ltr readOnly value={project.key ?? ""} />
            <FieldDescription>{t.keyHint}</FieldDescription>
          </Field>
          <Field>
            <FieldLabel>{t.client}</FieldLabel>
            <Input value={draft.client} onChange={(e) => set("client", e.target.value)} />
          </Field>
          <div className="flex flex-col gap-1.5">
            <span className="text-label">{t.status}</span>
            <SimpleSelect label={t.status} value={draft.status} onChange={(v) => set("status", v as ProjectStatus)} options={(Object.keys(t.statuses) as ProjectStatus[]).map((s) => ({ value: s, label: t.statuses[s] }))} />
          </div>
          <Field>
            <FieldLabel>{t.startDate}</FieldLabel>
            <Input ltr type="date" value={draft.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>{t.dueDate}</FieldLabel>
            <Input ltr type="date" value={draft.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          </Field>
          <div className="flex items-center gap-3 @2xl:col-span-2">
            <Button type="submit" loading={busy} disabled={!onSave}>
              {t.save}
            </Button>
            {feedback}
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const budgetPage = (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-4">
        <form
          className="grid gap-4 @2xl:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(t.budgetSaved);
          }}
        >
          <Field>
            <FieldLabel>{t.budgetTotal}</FieldLabel>
            <Input ltr inputMode="decimal" value={draft.budget} onChange={(e) => set("budget", e.target.value)} />
          </Field>
          <Field>
            <FieldLabel>{t.currency}</FieldLabel>
            <Input ltr readOnly value={budget?.currency ?? project.currency ?? defaultCurrency(locale)} />
          </Field>
          <div className="flex items-center gap-3 @2xl:col-span-2">
            <Button type="submit" loading={busy} disabled={!onSave}>
              {t.save}
            </Button>
            {feedback}
          </div>
        </form>
        {budget ? (
          <div className="flex flex-col gap-2 border-t border-border pt-4">
            <Meter aria-label={t.budgetSpent} value={Math.min(budget.spent, budget.total)} max={budget.total} size="md" showValue={false} />
            <p className="m-0 text-body-sm text-muted-foreground">
              {t.budgetSpent}: <bdi className="text-foreground">{money(budget.spent)}</bdi> / <bdi>{money(budget.total)}</bdi>
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );

  const projectPages: SettingsGroup["pages"][number][] = [];
  const teamPages: SettingsGroup["pages"][number][] = [];
  const connectionPages: SettingsGroup["pages"][number][] = [];
  const dangerPages: SettingsGroup["pages"][number][] = [];
  if (onSave) {
    projectPages.push({ id: "general", label: t.pageGeneral, description: t.pageGeneralHint, keywords: [t.name, t.client, t.status, t.startDate, t.dueDate], content: <div className="@container">{general}</div> });
    projectPages.push({ id: "budget", label: t.pageBudget, description: t.pageBudgetHint, keywords: [t.budgetTotal, t.currency], content: <div className="@container">{budgetPage}</div> });
  }
  if (extras?.members) teamPages.push({ id: "members", label: t.pageMembers, description: t.pageMembersHint, content: <MembersManager {...extras.members} /> });
  if (workflow) teamPages.push({ id: "workflow", label: t.pageWorkflow, description: t.pageWorkflowHint, content: <StatusLabelManager statuses={statuses} labels={labels} {...workflow} /> });
  if (extras?.integrations) connectionPages.push({ id: "integrations", label: t.pageIntegrations, description: t.pageIntegrationsHint, content: <IntegrationsPage integrations={extras.integrations} onToggle={extras.onToggleIntegration} t={t} /> });
  if (extras?.onArchive || extras?.onDelete) dangerPages.push({ id: "danger", label: t.pageDanger, description: t.pageDangerHint, tone: "danger", content: <DangerPage projectKey={project.key ?? project.name} archived={project.status === "archived"} onArchive={extras.onArchive} onDelete={extras.onDelete} t={t} /> });

  const groups: SettingsGroup[] = [
    { id: "project", label: t.groupProject, pages: projectPages },
    { id: "team", label: t.groupTeam, pages: teamPages },
    { id: "connections", label: t.groupConnections, pages: connectionPages },
    { id: "danger", label: t.pageDanger, pages: dangerPages },
  ].filter((g) => g.pages.length > 0);

  return <SettingsSections data-slot="project-settings" title={t.settingsTitle} description={null} groups={groups} />;
}

/**
 * A project on one screen: header with name, key, client, status, dates, members and progress, then tabs for the
 * overview (issues by status, burndown, recent activity, budget), the board, the list with in-cell editing, the
 * timeline, time, AI cost, files and settings. It reuses KanbanBoard, DataTable, Timeline, TimeTracker, AiUsageCost
 * and the ProjectList types; all changes go out through callbacks.
 */
export function ProjectView({
  project,
  issues,
  statuses,
  labels,
  people,
  onUpdateIssue,
  onMoveIssue,
  onCreateIssue,
  onDeleteIssue,
  onOpenIssue,
  activity,
  budget,
  notes,
  time,
  ai,
  files,
  onUploadFiles,
  onDownloadFile,
  onDeleteFile,
  onSaveProject,
  workflow,
  memory,
  vault,
  github,
  settings,
  defaultTab = "overview",
  tab,
  onTabChange,
  now,
  tabs: tabsProp,
  labelsText,
  className,
  ...props
}: ProjectViewProps) {
  const { locale, t } = useText(labelsText);
  const [creating, setCreating] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);
  const today = dayKey(now ?? Date.now());

  const available = useMemo(() => {
    const all: ProjectTab[] = ["overview", "board", "list", "timeline"];
    if (activity) all.push("activity");
    if (time) all.push("time");
    if (ai) all.push("ai");
    if (files) all.push("files");
    if (memory) all.push("memory");
    if (vault) all.push("vault");
    if (github) all.push("github");
    if (onSaveProject || workflow || settings) all.push("settings");
    return tabsProp ? tabsProp.filter((x) => all.includes(x)) : all;
  }, [activity, time, ai, files, memory, vault, github, onSaveProject, workflow, settings, tabsProp]);

  const move = async (id: string, statusId: string, index: number) => {
    const result = onMoveIssue ? await onMoveIssue(id, statusId, index) : await onUpdateIssue?.(id, { statusId });
    setMoveError(result && "error" in result && result.error ? result.error : null);
  };

  const overviewText = {
    open: t.open, done: t.done, overdue: t.overdue, progress: t.progress, byStatus: t.byStatus, byStatusHint: t.byStatusHint, burndown: t.burndown, burndownHint: t.burndownHint,
    remaining: t.remaining, ideal: t.ideal, recent: t.recent, noActivity: t.noActivity, budget: t.budget, budgetHint: t.budgetHint, spent: t.spent, left: t.left, over: t.over, noBudget: t.noBudget, issues: t.issues,
  };
  const dateFmt = { day: "numeric", month: "short", year: "numeric" } as const;
  const openCount = issues.filter((i) => isOpenIssue(i, statuses)).length;

  return (
    <section data-slot="project-view" aria-label={project.name} className={cn("@container flex min-w-0 flex-col gap-5", className)} {...props}>
      <header className="flex min-w-0 flex-col gap-3">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h1 className="m-0 min-w-0 text-title-sm font-semibold">{project.name}</h1>
              {project.key ? (
                <Badge variant="outline">
                  <bdi dir="ltr" className="font-mono">
                    {project.key}
                  </bdi>
                </Badge>
              ) : null}
              <Status tone={STATUS_TONE[project.status]}>{t.statuses[project.status]}</Status>
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-4 gap-y-1 text-body-sm text-muted-foreground">
              {project.client ? (
                <span>
                  {t.client}: <span className="text-foreground">{project.client}</span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays aria-hidden className="size-4" />
                {project.startDate || project.dueDate ? (
                  <>
                    {project.startDate ? <DateTime value={new Date(`${project.startDate}T00:00:00`)} format={dateFmt} /> : null}
                    {project.startDate && project.dueDate ? " – " : null}
                    {project.dueDate ? <DateTime value={new Date(`${project.dueDate}T00:00:00`)} format={dateFmt} /> : null}
                  </>
                ) : (
                  t.noDates
                )}
              </span>
              <span className="inline-flex items-center gap-2">
                <span>{t.members}</span>
                <AvatarStack people={project.members ?? []} />
              </span>
            </div>
          </div>
          {onCreateIssue ? (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              {t.newIssue}
            </Button>
          ) : null}
        </div>
        <Progress aria-label={t.progress} label={t.progress} value={project.progress} size="sm" />
      </header>

      <Tabs value={tab} defaultValue={defaultTab} onValueChange={(v) => onTabChange?.(v as ProjectTab)}>
        <TabsList variant="underline" aria-label={project.name} className="max-w-full overflow-x-auto">
          {available.map((id) => (
            <TabsTab key={id} value={id}>
              {t.tabs[id]}
              {id === "list" || id === "board" ? (
                <span className="ms-1.5 text-caption text-muted-foreground">
                  <Num value={id === "board" ? openCount : issues.length} />
                </span>
              ) : null}
            </TabsTab>
          ))}
        </TabsList>

        <TabsPanel value="overview" className="pt-4">
          <ProjectOverview issues={issues} statuses={statuses} activity={activity} budget={budget} today={today} t={overviewText} />
        </TabsPanel>
        <TabsPanel value="board" className="flex flex-col gap-2 pt-4">
          {moveError ? (
            <p role="alert" className="m-0 text-body-sm text-nq-danger-text">
              {moveError}
            </p>
          ) : null}
          <div className="min-w-0 overflow-x-auto">
            <IssueBoard issues={issues} statuses={statuses} labels={labels} people={people} onMove={(id, statusId, index) => void move(id, statusId, index)} onOpen={onOpenIssue} t={t} />
          </div>
        </TabsPanel>
        <TabsPanel value="list" className="pt-4">
          <IssueTable issues={issues} statuses={statuses} people={people} onEdit={onUpdateIssue} onOpen={onOpenIssue} onDelete={onDeleteIssue} onCreate={onCreateIssue ? () => setCreating(true) : undefined} t={t} />
        </TabsPanel>
        <TabsPanel value="timeline" className="flex flex-col gap-6 pt-4">
          <ProjectSchedule
            issues={issues}
            statuses={statuses}
            today={today}
            onOpenIssue={onOpenIssue}
            t={{ label: t.scheduleLabel, empty: t.scheduleEmpty, emptyHint: t.scheduleEmptyHint, unscheduled: t.unscheduled, open: t.openIssue, copyKey: t.copyKey, actions: t.actions, today: t.today }}
          />
          {notes ? (
            <section aria-labelledby="project-notes-h" className="flex flex-col gap-3">
              <h2 id="project-notes-h" className="m-0 text-body font-semibold">
                {t.notes}
              </h2>
              <ActivityComposer onSubmit={notes.onSubmit} />
              <ActivityTimeline activities={notes.items} onToggleTask={notes.onToggleTask} onDelete={notes.onDelete} now={now} />
            </section>
          ) : null}
        </TabsPanel>
        {time ? (
          <TabsPanel value="time" className="flex flex-col gap-4 pt-4">
            <TimeTracker projects={time.projects ?? [{ id: project.id, name: project.name, tasks: issues.map((i) => ({ id: i.id, name: `${i.key} ${i.title}` })) }]} running={time.running} onStart={time.onStart} onStop={time.onStop} onRunningChange={time.onRunningChange} />
            <TimeEntryList entries={time.entries} projects={time.projects ?? [{ id: project.id, name: project.name, tasks: issues.map((i) => ({ id: i.id, name: `${i.key} ${i.title}` })) }]} onAdd={time.onAdd} onEdit={time.onEdit} onDelete={time.onDelete} />
          </TabsPanel>
        ) : null}
        {ai ? (
          <TabsPanel value="ai" className="pt-4">
            <AiUsageCost days={ai.days} byModel={ai.byModel} byProduct={ai.byProduct} byRun={ai.byRun} markup={ai.markup} currency={ai.currency} previousTotal={ai.previousTotal} />
          </TabsPanel>
        ) : null}
        {files ? (
          <TabsPanel value="files" className="pt-4">
            <FilesTab files={files} onUpload={onUploadFiles} onDownload={onDownloadFile} onDelete={onDeleteFile} t={t} locale={locale} />
          </TabsPanel>
        ) : null}
        {activity ? (
          <TabsPanel value="activity" className="pt-4">
            <ProjectFeed items={activity} today={today} t={t} />
          </TabsPanel>
        ) : null}
        {memory ? (
          <TabsPanel value="memory" className="pt-4">
            <ProjectMemory {...memory} t={t} />
          </TabsPanel>
        ) : null}
        {vault ? (
          <TabsPanel value="vault" className="flex flex-col gap-8 pt-4">
            <Vault {...vaultOnly(vault)} title={vault.title ?? t.vaultTitle} description={vault.description ?? t.vaultDescription} />
            {vault.env ? <EnvList {...vault.env} title={vault.env.title ?? t.envTitle} description={vault.env.description ?? t.envDescription} /> : null}
          </TabsPanel>
        ) : null}
        {github ? (
          <TabsPanel value="github" className="flex flex-col gap-4 pt-4">
            {github.picker ? (
              <section aria-label={t.ghRepo} className="flex max-w-xl flex-col gap-2">
                <h2 className="m-0 text-body font-semibold">{github.repo ? t.ghRepo : t.ghConnectTitle}</h2>
                {github.repo ? null : <p className="m-0 text-body-sm text-muted-foreground">{t.ghConnectHint}</p>}
                <RepositoryPicker {...github.picker} />
              </section>
            ) : null}
            {github.repo ? <GithubActivity {...githubFeeds(github)} repo={github.repo} /> : <EmptyState icon={GitBranch} title={t.ghNotConnected} description={t.ghNotConnectedHint} />}
          </TabsPanel>
        ) : null}
        {onSaveProject || workflow || settings ? (
          <TabsPanel value="settings" className="pt-4">
            <SettingsTab project={project} onSave={onSaveProject} workflow={workflow} statuses={statuses} labels={labels} budget={budget} extras={settings} t={t} />
          </TabsPanel>
        ) : null}
      </Tabs>

      {onCreateIssue ? <NewIssueDialog open={creating} onOpenChange={setCreating} onCreate={onCreateIssue} t={t} /> : null}
    </section>
  );
}

