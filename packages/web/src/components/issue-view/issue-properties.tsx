"use client";

import { Check } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useState } from "react";
import { cn } from "../../lib/cn";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Input } from "../field";
import { Num } from "../numeric";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import {
  dueState,
  estimateSummary,
  formatHours,
  type Issue,
  ISSUE_PRIORITIES,
  ISSUE_TYPES,
  type IssuePatch,
  type IssuePerson,
  type IssueRef,
  isOpenIssue,
  parentCandidates,
  parseEstimate,
} from "./issue-logic";
import { PriorityIcon, StatusDot, TypeIcon, useIssueText, type IssueTextLabels } from "./issue-marks";

const STRINGS = {
  en: {
    title: "Properties",
    status: "Status",
    priority: "Priority",
    type: "Type",
    assignee: "Assignee",
    labels: "Labels",
    estimate: "Estimate",
    estimateHint: "Hours, for example 2 or 1h 30m",
    due: "Due date",
    project: "Project",
    parent: "Parent",
    logged: (v: string) => `${v} logged`,
    over: "Over the estimate",
    pickLabels: "Choose labels",
    saving: "Saving…",
  },
  ar: {
    title: "الخصائص",
    status: "الحالة",
    priority: "الأولوية",
    type: "النوع",
    assignee: "المسؤول",
    labels: "الوسوم",
    estimate: "التقدير",
    estimateHint: "ساعات، مثل 2 أو 1h 30m",
    due: "موعد الاستحقاق",
    project: "المشروع",
    parent: "الأصل",
    logged: (v: string) => `سُجّل ${v}`,
    over: "تجاوز التقدير",
    pickLabels: "اختر الوسوم",
    saving: "جارٍ الحفظ…",
  },
};

export type IssuePropertiesLabels = Partial<typeof STRINGS.en> & IssueTextLabels;
type Result = void | { error?: string };

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
}

const NONE = "__none__";

function PropertyRow({ label, children, id }: { label: string; children: ReactNode; id?: string }) {
  return (
    <div data-slot="issue-property" className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-center gap-2">
      <dt id={id} className="text-body-sm text-muted-foreground">
        {label}
      </dt>
      <dd className="m-0 min-w-0">{children}</dd>
    </div>
  );
}

/** A borderless select that reads like text until hovered. */
function PropertySelect({
  labelId,
  value,
  options,
  onChange,
  disabled,
  none,
}: {
  labelId: string;
  value: string | null | undefined;
  options: Option[];
  onChange: (value: string | null) => void;
  disabled?: boolean;
  /** Adds an empty choice with this label. */
  none?: { label: string; icon?: ReactNode };
}) {
  const all: Option[] = none ? [{ value: NONE, label: none.label, icon: none.icon }, ...options] : options;
  const current = value ?? (none ? NONE : "");
  return (
    <Select
      items={all.map((o) => ({ value: o.value, label: o.label }))}
      value={current}
      disabled={disabled}
      onValueChange={(v) => onChange(v === NONE || v == null ? null : (v as string))}
    >
      <SelectTrigger aria-labelledby={labelId} className="h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover">
        <SelectValue>
          {(v: string | null) => {
            const o = all.find((x) => x.value === v);
            return (
              <span className="flex min-w-0 items-center gap-2">
                {o?.icon}
                <span className="truncate">{o?.label}</span>
              </span>
            );
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {all.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            <span className="flex min-w-0 items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LabelPicker({ labelId, labels, value, onChange, disabled, t }: { labelId: string; labels: WorkLabel[]; value: string[]; onChange: (ids: string[]) => void; disabled?: boolean; t: ReturnType<typeof useIssueText>["t"] & typeof STRINGS.en }) {
  const chosen = labels.filter((l) => value.includes(l.id));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <Popover>
      <PopoverTrigger
        disabled={disabled}
        aria-labelledby={labelId}
        className="flex min-h-control-sm w-full min-w-0 flex-wrap items-center gap-1 rounded-control px-2 py-1 text-start text-body outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus data-disabled:opacity-50"
      >
        {chosen.length === 0 ? (
          <span className="text-muted-foreground">{t.noLabels}</span>
        ) : (
          chosen.map((l) => (
            <Badge key={l.id} variant="tag" hue={l.hue}>
              {l.name}
            </Badge>
          ))
        )}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-1">
        <ul aria-label={t.pickLabels} className="m-0 flex max-h-64 list-none flex-col overflow-y-auto p-0">
          {labels.map((l) => {
            const on = value.includes(l.id);
            return (
              <li key={l.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(l.id)}
                  className="flex w-full items-center gap-2 rounded-control px-2 py-1.5 text-start text-body-sm outline-none hover:bg-nq-hover focus-visible:bg-nq-hover"
                >
                  <StatusDot hue={l.hue} />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  {on ? <Check aria-hidden className="size-4 text-foreground" /> : null}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** A text input that saves on Enter or blur and reverts on Escape. */
function CommitInput({ value, onCommit, disabled, className, ...props }: { value: string; onCommit: (text: string) => void; disabled?: boolean } & Omit<ComponentProps<typeof Input>, "value" | "onChange" | "onBlur" | "onKeyDown">) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft !== value) onCommit(draft);
  };
  return (
    <Input
      {...props}
      disabled={disabled}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") setDraft(value);
      }}
      className={cn("h-control-sm border-transparent bg-transparent px-2 hover:bg-nq-hover focus:bg-card", className)}
    />
  );
}

export interface IssuePropertiesProps extends Omit<ComponentProps<"dl">, "children" | "onChange"> {
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
  onUpdate?: (patch: IssuePatch) => Promise<Result>;
  /** "Now" for the due-date colour. */
  now?: number;
  text?: IssuePropertiesLabels;
}

/**
 * The properties of an issue as an editable list: status, priority, type, assignee, labels, estimate, due date,
 * project and parent. Each field saves on its own through `onUpdate`; errors show under the list.
 */
export function IssueProperties({ issue, statuses, labels, people, projects, parentOptions = [], loggedSeconds = 0, onUpdate, now, text, className, ...props }: IssuePropertiesProps) {
  const { t: it } = useIssueText(text);
  const ar = useIssueText().ar;
  const t = { ...STRINGS[ar ? "ar" : "en"], ...text } as typeof STRINGS.en;
  const ids = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const readOnly = !onUpdate;
  const disabled = readOnly || busy;

  const save = async (patch: IssuePatch) => {
    if (!onUpdate) return;
    setBusy(true);
    setError(null);
    const result = await onUpdate(patch);
    setBusy(false);
    if (result && "error" in result && result.error) setError(result.error);
  };

  const summary = estimateSummary(loggedSeconds, issue.estimateHours);
  const open = isOpenIssue(issue, statuses);
  const due = dueState(issue.dueDate, now ?? Date.now(), open);
  const parents = parentCandidates(issue.id, parentOptions);
  const statusOf = new Map(statuses.map((s) => [s.id, s]));
  const rowId = (name: string) => `${ids}-${name}`;

  return (
    <dl data-slot="issue-properties" aria-busy={busy} className={cn("m-0 flex min-w-0 flex-col gap-1.5", className)} {...props}>
      <PropertyRow label={t.status} id={rowId("status")}>
        <PropertySelect
          labelId={rowId("status")}
          value={issue.statusId}
          disabled={disabled}
          options={statuses.map((s) => ({ value: s.id, label: s.name, icon: <StatusDot hue={s.hue} /> }))}
          onChange={(v) => v && save({ statusId: v })}
        />
      </PropertyRow>
      <PropertyRow label={t.priority} id={rowId("priority")}>
        <PropertySelect
          labelId={rowId("priority")}
          value={issue.priority}
          disabled={disabled}
          options={ISSUE_PRIORITIES.map((p) => ({ value: p, label: it.priorities[p], icon: <PriorityIcon priority={p} /> }))}
          onChange={(v) => v && save({ priority: v as Issue["priority"] })}
        />
      </PropertyRow>
      <PropertyRow label={t.type} id={rowId("type")}>
        <PropertySelect
          labelId={rowId("type")}
          value={issue.type}
          disabled={disabled}
          options={ISSUE_TYPES.map((x) => ({ value: x, label: it.types[x], icon: <TypeIcon type={x} /> }))}
          onChange={(v) => v && save({ type: v as Issue["type"] })}
        />
      </PropertyRow>
      <PropertyRow label={t.assignee} id={rowId("assignee")}>
        <PropertySelect
          labelId={rowId("assignee")}
          value={issue.assigneeId}
          disabled={disabled}
          none={{ label: it.unassigned }}
          options={people.map((p) => ({ value: p.id, label: p.name, icon: <Avatar name={p.name} src={p.avatar} size="xs" /> }))}
          onChange={(v) => save({ assigneeId: v })}
        />
      </PropertyRow>
      <PropertyRow label={t.labels} id={rowId("labels")}>
        <LabelPicker labelId={rowId("labels")} labels={labels} value={issue.labelIds} disabled={disabled} onChange={(v) => save({ labelIds: v })} t={{ ...it, ...t }} />
      </PropertyRow>
      <PropertyRow label={t.estimate} id={rowId("estimate")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CommitInput
            aria-labelledby={rowId("estimate")}
            ltr
            disabled={disabled}
            placeholder={it.noEstimate}
            title={t.estimateHint}
            value={issue.estimateHours != null ? formatHours(issue.estimateHours) : ""}
            onCommit={(text) => {
              const parsed = parseEstimate(text);
              if (text.trim() === "" || parsed !== null) void save({ estimateHours: parsed });
              else setError(t.estimateHint);
            }}
          />
          {loggedSeconds > 0 ? (
            <span className={cn("px-2 text-caption", summary.over ? "text-nq-danger-text" : "text-muted-foreground")}>
              <bdi>{t.logged(formatHours(summary.loggedHours))}</bdi>
              {summary.over ? ` · ${t.over}` : null}
              {summary.ratio !== null ? (
                <>
                  {" · "}
                  <Num value={summary.ratio} format={{ style: "percent", maximumFractionDigits: 0 }} />
                </>
              ) : null}
            </span>
          ) : null}
        </div>
      </PropertyRow>
      <PropertyRow label={t.due} id={rowId("due")}>
        <div className="flex min-w-0 flex-col gap-0.5">
          <CommitInput
            aria-labelledby={rowId("due")}
            type="date"
            ltr
            disabled={disabled}
            value={issue.dueDate ?? ""}
            onCommit={(text) => void save({ dueDate: text || null })}
          />
          {due === "overdue" || due === "today" || due === "soon" ? (
            <span className={cn("px-2 text-caption", due === "overdue" ? "text-nq-danger-text" : due === "today" ? "text-nq-warning-text" : "text-muted-foreground")}>
              {due === "overdue" ? it.overdue : due === "today" ? it.dueToday : it.dueSoon}
            </span>
          ) : null}
        </div>
      </PropertyRow>
      <PropertyRow label={t.project} id={rowId("project")}>
        <PropertySelect labelId={rowId("project")} value={issue.projectId} disabled={disabled} options={projects.map((p) => ({ value: p.id, label: p.name }))} onChange={(v) => v && save({ projectId: v })} />
      </PropertyRow>
      <PropertyRow label={t.parent} id={rowId("parent")}>
        <PropertySelect
          labelId={rowId("parent")}
          value={issue.parentId}
          disabled={disabled}
          none={{ label: it.noParent }}
          options={parents.map((p) => ({ value: p.id, label: `${p.key} ${p.title}`, icon: <StatusDot hue={statusOf.get(p.statusId)?.hue} /> }))}
          onChange={(v) => save({ parentId: v })}
        />
      </PropertyRow>
      {error ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </dl>
  );
}


