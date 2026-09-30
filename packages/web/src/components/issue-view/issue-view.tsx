"use client";

import { ArrowLeft, ArrowRight, CornerLeftUp, ExternalLink, Link2, Pencil, Plus, Timer } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { ActionsMenu } from "../comment-thread/actions-menu";
import { CommentThread, type CommentThreadProps } from "../comment-thread/comment-thread";
import { ActivityComposer, ActivityTimeline, type ActivityInput, type ActivityRecord } from "../activity-composer/activity-composer";
import { AiUsageCost, type AiUsageCostProps, TokenCostMeter, type TokenCostMeterProps } from "../ai-usage-cost";
import { Avatar } from "../avatar";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checklist, type ChecklistProps } from "../checklist";
import { type ContextMenuAction, ContextMenuActions } from "../context-menu";
import { CopyButton } from "../copy-button";
import { Input } from "../field";
import { GithubActivity, type GithubActivityProps } from "../github-activity";
import { Num } from "../numeric";
import { Progress } from "../progress";
import { RichTextEditor } from "../rich-text-editor";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../sheet";
import type { WorkLabel, WorkStatus } from "../status-label-manager/status-label-logic";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { type RunningTimer, type TimeEntry, type TimeEntryListProps, TimeEntryList, TimeTracker, type TimeTrackerProps } from "../time-tracker";
import { type Issue, type IssuePatch, type IssuePerson, type IssueRef, isOpenIssue, subIssueProgress } from "./issue-logic";
import { StatusDot, TypeIcon, useIssueText, type IssueTextLabels } from "./issue-marks";
import { IssueProperties } from "./issue-properties";

const STRINGS = {
  en: {
    back: "Back",
    close: "Close",
    copyKey: "Copy issue key",
    description: "Description",
    noDescription: "No description yet.",
    edit: "Edit",
    save: "Save",
    cancel: "Cancel",
    editTitle: "Edit title",
    titleEmpty: "A title is required",
    subIssues: "Sub-issues",
    subIssuePlaceholder: "Add a sub-issue",
    addSubIssue: "Add",
    noSubIssues: "No sub-issues",
    open: "Open",
    copyKeyAction: "Copy key",
    actions: "Actions",
    development: "Development",
    comments: "Comments",
    activity: "Activity",
    time: "Time",
    ai: "AI cost",
    timerRunning: "Timer running",
    created: "Created",
    updated: "Updated",
    loading: "Loading",
    details: "Details",
  },
  ar: {
    back: "رجوع",
    close: "إغلاق",
    copyKey: "نسخ رمز المهمة",
    description: "الوصف",
    noDescription: "لا يوجد وصف بعد.",
    edit: "تعديل",
    save: "حفظ",
    cancel: "إلغاء",
    editTitle: "تعديل العنوان",
    titleEmpty: "العنوان مطلوب",
    subIssues: "المهام الفرعية",
    subIssuePlaceholder: "أضف مهمة فرعية",
    addSubIssue: "إضافة",
    noSubIssues: "لا مهام فرعية",
    open: "فتح",
    copyKeyAction: "نسخ الرمز",
    actions: "إجراءات",
    development: "التطوير",
    comments: "التعليقات",
    activity: "النشاط",
    time: "الوقت",
    ai: "تكلفة الذكاء الاصطناعي",
    timerRunning: "المؤقت يعمل",
    created: "أُنشئت",
    updated: "حُدّثت",
    loading: "جارٍ التحميل",
    details: "التفاصيل",
  },
};

export type IssueViewLabels = Partial<typeof STRINGS.en> & IssueTextLabels;
type Result = void | { error?: string };

/** What the Activity tab needs: the log, the composer and the task toggle. */
export interface IssueActivityProps {
  items: readonly ActivityRecord[];
  onSubmit: (input: ActivityInput) => Promise<Result>;
  onToggleTask?: (id: string, done: boolean) => Promise<Result>;
  onDelete?: (id: string) => Promise<Result>;
}

/** What the Time tab needs. Entries belong to this issue; the timer starts on it. */
export interface IssueTimeProps extends Pick<TimeTrackerProps, "running" | "onStart" | "onStop" | "onRunningChange">, Pick<TimeEntryListProps, "onAdd" | "onEdit" | "onDelete"> {
  entries: readonly TimeEntry[];
}

/** What the AI cost tab needs: the daily spend, the breakdowns and, optionally, this issue's run against its budget. */
export interface IssueAiProps extends Pick<AiUsageCostProps, "days" | "byModel" | "byProduct" | "byRun" | "markup" | "currency" | "previousTotal"> {
  run?: Pick<TokenCostMeterProps, "tokensIn" | "tokensOut" | "cached" | "cost" | "budget">;
}

export interface IssueViewProps extends Omit<ComponentProps<"article">, "title" | "onChange"> {
  issue: Issue;
  statuses: WorkStatus[];
  labels: WorkLabel[];
  people: IssuePerson[];
  projects: { id: string; name: string }[];
  /** Issues offered as the parent (the issue itself and its descendants are left out). */
  parentOptions?: (IssueRef & { parentId?: string | null })[];
  /** Save one or more properties, the title or the description. Omit for a read-only view. Return `{ error }` to show it. */
  onUpdate?: (patch: IssuePatch) => Promise<Result>;
  checklist?: Pick<ChecklistProps, "items" | "onToggle" | "onAdd" | "onRemove">;
  subIssues?: IssueRef[];
  /** Add a sub-issue by title. Omit to hide the add row. */
  onAddSubIssue?: (title: string) => Promise<Result>;
  /** Open another issue (a sub-issue or the parent). */
  onOpenIssue?: (id: string) => void;
  /** Linked pull requests and commits. */
  development?: Pick<GithubActivityProps, "repo" | "pulls" | "commits" | "runs">;
  thread?: CommentThreadProps;
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
  labelsText?: IssueViewLabels;
}

/** The title as a heading that turns into an input on click. Enter saves, Escape cancels. */
function InlineTitle({ value, onSave, readOnly, t }: { value: string; onSave?: (title: string) => Promise<Result>; readOnly: boolean; t: typeof STRINGS.en }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => setDraft(value), [value]);
  useEffect(() => {
    if (editing) ref.current?.select();
  }, [editing]);

  const commit = async () => {
    const next = draft.trim();
    if (next === value) return setEditing(false);
    if (!next) return setError(t.titleEmpty);
    if (!onSave) return setEditing(false);
    setBusy(true);
    const result = await onSave(next);
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setError(null);
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value);
    setError(null);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <Input
          ref={ref}
          aria-label={t.editTitle}
          aria-invalid={error ? true : undefined}
          value={draft}
          disabled={busy}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void commit();
            } else if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          className="h-control-lg text-title-sm font-semibold"
        />
        {error ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {error}
          </p>
        ) : null}
      </div>
    );
  }
  return (
    <h1 className="m-0 min-w-0 text-title-sm font-semibold text-foreground">
      {readOnly ? (
        <span className="break-words">{value}</span>
      ) : (
        <button
          type="button"
          title={t.editTitle}
          onClick={() => setEditing(true)}
          className="group -mx-2 inline-flex max-w-full items-start gap-2 rounded-control px-2 py-0.5 text-start outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
        >
          <span className="break-words">{value}</span>
          <Pencil aria-hidden className="mt-1.5 size-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </button>
      )}
    </h1>
  );
}

function DescriptionBlock({ value, onSave, readOnly, t }: { value: string | undefined; onSave?: (html: string) => Promise<Result>; readOnly: boolean; t: typeof STRINGS.en }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!editing) setDraft(value ?? "");
  }, [value, editing]);
  const has = Boolean(value && value.replace(/<[^>]*>/g, "").trim());

  const save = async () => {
    if (!onSave) return setEditing(false);
    setBusy(true);
    const result = await onSave(draft);
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setError(null);
    setEditing(false);
  };

  return (
    <section data-slot="issue-description" aria-labelledby="issue-description-h" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="issue-description-h" className="m-0 text-body font-semibold">
          {t.description}
        </h2>
        {!readOnly && !editing ? (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            {t.edit}
          </Button>
        ) : null}
      </div>
      {editing ? (
        <div className="flex flex-col gap-2">
          <RichTextEditor aria-labelledby="issue-description-h" value={draft} onValueChange={setDraft} minHeight="9rem" />
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              {t.cancel}
            </Button>
            <Button size="sm" loading={busy} onClick={() => void save()}>
              {t.save}
            </Button>
          </div>
        </div>
      ) : has ? (
        <RichTextEditor aria-labelledby="issue-description-h" readOnly value={value ?? ""} toolbar={[]} minHeight="0" />
      ) : (
        <p className="m-0 text-body-sm text-muted-foreground">{t.noDescription}</p>
      )}
    </section>
  );
}

function SubIssues({ items, statuses, people, onAdd, onOpen, t }: { items: IssueRef[]; statuses: WorkStatus[]; people: IssuePerson[]; onAdd?: (title: string) => Promise<Result>; onOpen?: (id: string) => void; t: typeof STRINGS.en }) {
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progress = subIssueProgress(items, statuses);
  const statusOf = new Map(statuses.map((s) => [s.id, s]));
  const personOf = new Map(people.map((p) => [p.id, p]));

  const add = async () => {
    const next = title.trim();
    if (!next || !onAdd) return;
    setBusy(true);
    const result = await onAdd(next);
    setBusy(false);
    if (result && "error" in result && result.error) return setError(result.error);
    setError(null);
    setTitle("");
  };

  const actionsFor = (item: IssueRef): ContextMenuAction[] => [
    ...(onOpen ? [{ id: "open", label: t.open, icon: ExternalLink, onSelect: () => onOpen(item.id) }] : []),
    {
      id: "copy",
      label: t.copyKeyAction,
      icon: Link2,
      onSelect: () => void navigator.clipboard?.writeText(item.key),
    },
  ];

  return (
    <section data-slot="issue-sub-issues" aria-labelledby="issue-sub-h" className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 id="issue-sub-h" className="m-0 text-body font-semibold">
          {t.subIssues}
        </h2>
        {items.length > 0 ? (
          <span className="text-body-sm text-muted-foreground">
            <Num value={progress.done} /> / <Num value={progress.total} />
          </span>
        ) : null}
      </div>
      {items.length > 0 ? <Progress aria-label={t.subIssues} value={progress.percent} size="sm" /> : null}
      {items.length === 0 ? (
        <p className="m-0 text-body-sm text-muted-foreground">{t.noSubIssues}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col divide-y divide-border rounded-control border border-border p-0">
          {items.map((item) => {
            const s = statusOf.get(item.statusId);
            const who = item.assigneeId ? personOf.get(item.assigneeId) : undefined;
            const actions = actionsFor(item);
            return (
              <ContextMenuActions
                key={item.id}
                actions={actions}
                focusTarget={(el) => el.querySelector<HTMLElement>("button")}
                render={
                  <li className="flex min-w-0 items-center gap-2 px-3 py-2">
                    <StatusDot hue={s?.hue} />
                    <bdi dir="ltr" className="shrink-0 font-mono text-caption text-muted-foreground">
                      {item.key}
                    </bdi>
                    <button
                      type="button"
                      onClick={() => onOpen?.(item.id)}
                      title={s?.name}
                      className={cn("min-w-0 flex-1 truncate text-start text-body-sm outline-none hover:underline focus-visible:underline", s?.stage === "done" && "text-muted-foreground line-through")}
                    >
                      {item.title}
                    </button>
                    {who ? <Avatar name={who.name} src={who.avatar} size="xs" /> : null}
                    <ActionsMenu actions={actions} label={`${t.actions}: ${item.key}`} />
                  </li>
                }
              />
            );
          })}
        </ul>
      )}
      {onAdd ? (
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void add();
          }}
        >
          <Input aria-label={t.subIssuePlaceholder} placeholder={t.subIssuePlaceholder} value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy} />
          <Button type="submit" variant="secondary" loading={busy} disabled={!title.trim()}>
            <Plus aria-hidden />
            {t.addSubIssue}
          </Button>
        </form>
      ) : null}
      {error ? (
        <p role="alert" className="text-body-sm text-nq-danger-text">
          {error}
        </p>
      ) : null}
    </section>
  );
}

const sumSeconds = (entries: readonly TimeEntry[]) => entries.reduce((n, e) => n + e.seconds, 0);

/**
 * One issue in full: key and inline-editable title, rich description, a properties sidebar, checklist, sub-issues,
 * linked pull requests and commits, then tabs for comments, activity, time (with the running timer) and AI cost.
 * Everything is presentational: changes go out through `onUpdate` and the callbacks of each part.
 */
export function IssueView({
  issue,
  statuses,
  labels,
  people,
  projects,
  parentOptions,
  onUpdate,
  checklist,
  subIssues = [],
  onAddSubIssue,
  onOpenIssue,
  development,
  thread,
  activity,
  time,
  ai,
  variant = "page",
  onBack,
  defaultTab,
  now,
  labelsText,
  className,
  ...props
}: IssueViewProps) {
  const { ar, t: it } = useIssueText(labelsText);
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labelsText } as typeof STRINGS.en;
  const readOnly = !onUpdate;
  const drawer = variant === "drawer";
  const Back = ar ? ArrowRight : ArrowLeft;
  const parent = issue.parentId ? parentOptions?.find((p) => p.id === issue.parentId) : undefined;
  const status = statuses.find((s) => s.id === issue.statusId);
  const loggedSeconds = time ? sumSeconds(time.entries) : 0;
  const running: RunningTimer | null | undefined = time?.running;
  const timerHere = Boolean(running && (!running.taskId || running.taskId === issue.id));
  const open = isOpenIssue(issue, statuses);

  const tabs = useMemo(() => {
    const list: { id: "comments" | "activity" | "time" | "ai"; label: string; count?: number }[] = [];
    if (thread) list.push({ id: "comments", label: t.comments, count: thread.comments.length });
    if (activity) list.push({ id: "activity", label: t.activity, count: activity.items.length });
    if (time) list.push({ id: "time", label: t.time });
    if (ai) list.push({ id: "ai", label: t.ai });
    return list;
  }, [thread, activity, time, ai, t.comments, t.activity, t.time, t.ai]);
  const firstTab = defaultTab && tabs.some((x) => x.id === defaultTab) ? defaultTab : tabs[0]?.id;

  const timeProjects = useMemo(() => {
    const p = projects.find((x) => x.id === issue.projectId);
    return [{ id: issue.projectId, name: p?.name ?? issue.projectId, tasks: [{ id: issue.id, name: `${issue.key} ${issue.title}` }] }];
  }, [projects, issue.projectId, issue.id, issue.key, issue.title]);

  const properties = (
    <section aria-label={t.details} className="flex min-w-0 flex-col gap-3">
      <IssueProperties
        issue={issue}
        statuses={statuses}
        labels={labels}
        people={people}
        projects={projects}
        parentOptions={parentOptions}
        loggedSeconds={loggedSeconds}
        onUpdate={onUpdate}
        now={now}
        text={labelsText}
      />
      <p className="m-0 flex flex-wrap gap-x-3 text-caption text-muted-foreground">
        <span>
          {t.created} <bdi>{new Date(issue.createdAt).toLocaleDateString(ar ? "ar" : "en", { dateStyle: "medium" })}</bdi>
        </span>
        {issue.updatedAt ? (
          <span>
            {t.updated} <bdi>{new Date(issue.updatedAt).toLocaleDateString(ar ? "ar" : "en", { dateStyle: "medium" })}</bdi>
          </span>
        ) : null}
      </p>
    </section>
  );

  return (
    <article data-slot="issue-view" data-variant={variant} className={cn("@container flex min-w-0 flex-col gap-4", className)} {...props}>
      <header className="flex min-w-0 flex-col gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {onBack && !drawer ? (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <Back aria-hidden className="size-4" />
              {t.back}
            </Button>
          ) : null}
          {parent ? (
            <button type="button" onClick={() => onOpenIssue?.(parent.id)} className="inline-flex items-center gap-1 text-body-sm text-muted-foreground hover:text-foreground hover:underline">
              <bdi dir="ltr" className="font-mono">
                {parent.key}
              </bdi>
              <CornerLeftUp aria-hidden className="size-3.5 rtl:-scale-x-100" />
            </button>
          ) : null}
          <TypeIcon type={issue.type} />
          <bdi dir="ltr" className="font-mono text-body-sm text-muted-foreground">
            {issue.key}
          </bdi>
          <CopyButton value={issue.key} label={t.copyKey} variant="ghost" size="icon-sm" />
          {status ? (
            <Badge variant="tag" hue={status.hue}>
              {status.name}
            </Badge>
          ) : null}
          {open && issue.priority !== "none" ? <Badge variant="outline">{it.priorities[issue.priority]}</Badge> : null}
          {timerHere ? (
            <Badge variant="info">
              <Timer aria-hidden className="size-3" />
              {t.timerRunning}
            </Badge>
          ) : null}
        </div>
        <InlineTitle value={issue.title} readOnly={readOnly} onSave={onUpdate ? (title) => onUpdate({ title }) : undefined} t={t} />
      </header>

      <div className={cn("grid min-w-0 gap-6", !drawer && "@3xl:grid-cols-[minmax(0,1fr)_19rem]")}>
        {drawer ? <div className="rounded-card border border-border p-3">{properties}</div> : null}
        <div className="flex min-w-0 flex-col gap-6">
          <DescriptionBlock value={issue.description} readOnly={readOnly} onSave={onUpdate ? (description) => onUpdate({ description }) : undefined} t={t} />
          {checklist ? <Checklist {...checklist} readOnly={readOnly && !checklist.onToggle} /> : null}
          {subIssues.length > 0 || onAddSubIssue ? <SubIssues items={subIssues} statuses={statuses} people={people} onAdd={onAddSubIssue} onOpen={onOpenIssue} t={t} /> : null}
          {development ? (
            <section aria-labelledby="issue-dev-h" className="flex min-w-0 flex-col gap-2">
              <h2 id="issue-dev-h" className="m-0 text-body font-semibold">
                {t.development}
              </h2>
              <GithubActivity {...development} hideSearch />
            </section>
          ) : null}
          {tabs.length > 0 ? (
            <Tabs defaultValue={firstTab}>
              <TabsList variant="underline" aria-label={t.activity} className="max-w-full overflow-x-auto">
                {tabs.map((x) => (
                  <TabsTab key={x.id} value={x.id}>
                    {x.label}
                    {x.count ? (
                      <span className="ms-1.5 text-caption text-muted-foreground">
                        <Num value={x.count} />
                      </span>
                    ) : null}
                  </TabsTab>
                ))}
              </TabsList>
              {thread ? (
                <TabsPanel value="comments" className="pt-4">
                  <CommentThread {...thread} hideHeader />
                </TabsPanel>
              ) : null}
              {activity ? (
                <TabsPanel value="activity" className="flex flex-col gap-4 pt-4">
                  <ActivityComposer onSubmit={activity.onSubmit} />
                  <ActivityTimeline activities={activity.items} onToggleTask={activity.onToggleTask} onDelete={activity.onDelete} now={now} />
                </TabsPanel>
              ) : null}
              {time ? (
                <TabsPanel value="time" className="flex flex-col gap-4 pt-4">
                  <TimeTracker projects={timeProjects} running={time.running} onStart={time.onStart} onStop={time.onStop} onRunningChange={time.onRunningChange} />
                  <TimeEntryList entries={time.entries} projects={timeProjects} onAdd={time.onAdd} onEdit={time.onEdit} onDelete={time.onDelete} />
                </TabsPanel>
              ) : null}
              {ai ? (
                <TabsPanel value="ai" className="flex flex-col gap-4 pt-4">
                  {ai.run ? <TokenCostMeter {...ai.run} currency={ai.currency} /> : null}
                  <AiUsageCost days={ai.days} byModel={ai.byModel} byProduct={ai.byProduct} byRun={ai.byRun} markup={ai.markup} currency={ai.currency} previousTotal={ai.previousTotal} />
                </TabsPanel>
              ) : null}
            </Tabs>
          ) : null}
        </div>
        {!drawer ? <aside className="min-w-0 @3xl:sticky @3xl:top-4 @3xl:self-start">{properties}</aside> : null}
      </div>
    </article>
  );
}

export interface IssueQuickViewProps extends Omit<IssueViewProps, "variant" | "onBack"> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Opens the full page for the issue. Shows an "Open" link in the header. */
  onOpenFull?: (issue: Issue) => void;
  labelsText?: IssueViewLabels;
}

/** The issue in a side drawer, for boards and lists: the same content as `IssueView`, stacked for a narrow panel. */
export function IssueQuickView({ open, onOpenChange, onOpenFull, labelsText, issue, ...rest }: IssueQuickViewProps): ReactNode {
  const { ar } = useIssueText(labelsText);
  const t = { ...STRINGS[ar ? "ar" : "en"], ...labelsText } as typeof STRINGS.en;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="end" className="w-[min(46rem,100vw)]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <bdi dir="ltr" className="font-mono text-body">
              {issue.key}
            </bdi>
          </SheetTitle>
          <SheetDescription className="sr-only">{issue.title}</SheetDescription>
          {onOpenFull ? (
            <Button variant="ghost" size="sm" className="self-start" onClick={() => onOpenFull(issue)}>
              <ExternalLink aria-hidden />
              {t.open}
            </Button>
          ) : null}
        </SheetHeader>
        <SheetBody>
          <IssueView issue={issue} variant="drawer" labelsText={labelsText} {...rest} />
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

