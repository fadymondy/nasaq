"use client";

import { ChevronLeft, ChevronRight, Clock, Pencil, Play, Plus, Square, Trash2 } from "lucide-react";
import { type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { useFormatDate } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "../table";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  addDays,
  buildGrid,
  dateKey,
  formatClock,
  formatHours,
  fromDateKey,
  parseDuration,
  startOfWeek,
  sumSeconds,
  weekKeys,
} from "./time-math";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    timer: "Timer",
    project: "Project",
    task: "Task",
    noTask: "No task",
    pickProject: "Choose a project",
    pickTask: "Choose a task",
    note: "What are you working on?",
    start: "Start timer",
    stop: "Stop timer",
    running: "Timer running",
    stopped: "Timer stopped",
    needProject: "Choose a project to start the timer.",
    failed: "That did not go through. Try again.",
    entries: "Time entries",
    addEntry: "Add time",
    edit: "Edit entry",
    remove: "Delete entry",
    emptyTitle: "No time logged yet",
    emptyDescription: "Start the timer or add time by hand.",
    dayTotal: "Day total",
    entryTitle: "Add time",
    editTitle: "Edit time entry",
    entryDescription: "Log time you already spent.",
    date: "Date",
    duration: "Duration",
    durationHint: "For example 1:30, 1.5h or 90m.",
    invalidDuration: "Enter a duration such as 1:30 or 45m.",
    tooLong: "An entry cannot be longer than 24 hours.",
    needProjectField: "Choose a project.",
    save: "Save",
    cancel: "Cancel",
    timesheet: "Timesheet",
    day: "Day",
    week: "Week",
    view: "Timesheet view",
    previous: "Previous",
    next: "Next",
    today: "Today",
    total: "Total",
    row: "Project and task",
    gridLabel: "Timesheet grid, hours per day",
    emptyGrid: "No time logged in this period.",
    hoursShort: "h",
  },
  ar: {
    timer: "المؤقّت",
    project: "المشروع",
    task: "المهمة",
    noTask: "بدون مهمة",
    pickProject: "اختر مشروعًا",
    pickTask: "اختر مهمة",
    note: "على ماذا تعمل؟",
    start: "ابدأ المؤقّت",
    stop: "أوقف المؤقّت",
    running: "المؤقّت يعمل",
    stopped: "توقّف المؤقّت",
    needProject: "اختر مشروعًا لبدء المؤقّت.",
    failed: "لم تتم العملية. حاول مرة أخرى.",
    entries: "سجلّ الوقت",
    addEntry: "إضافة وقت",
    edit: "تعديل السجل",
    remove: "حذف السجل",
    emptyTitle: "لا يوجد وقت مسجّل بعد",
    emptyDescription: "ابدأ المؤقّت أو أضف وقتًا يدويًا.",
    dayTotal: "مجموع اليوم",
    entryTitle: "إضافة وقت",
    editTitle: "تعديل سجل الوقت",
    entryDescription: "سجّل وقتًا قضيته بالفعل.",
    date: "التاريخ",
    duration: "المدة",
    durationHint: "مثل 1:30 أو 1.5h أو 90m.",
    invalidDuration: "أدخل مدة مثل 1:30 أو 45m.",
    tooLong: "لا يمكن أن يتجاوز السجل 24 ساعة.",
    needProjectField: "اختر مشروعًا.",
    save: "حفظ",
    cancel: "إلغاء",
    timesheet: "الجدول الزمني",
    day: "يوم",
    week: "أسبوع",
    view: "عرض الجدول الزمني",
    previous: "السابق",
    next: "التالي",
    today: "اليوم",
    total: "المجموع",
    row: "المشروع والمهمة",
    gridLabel: "شبكة الجدول الزمني، الساعات لكل يوم",
    emptyGrid: "لا يوجد وقت مسجّل في هذه الفترة.",
    hoursShort: "س",
  },
};

export type TimeTrackerLabels = Partial<(typeof STRINGS)["en"]>;

function useStrings(labels?: TimeTrackerLabels) {
  const ar = useOptionalNasaq()?.locale?.startsWith("ar") ?? false;
  return { ar, t: { ...STRINGS[ar ? "ar" : "en"], ...labels } };
}

/* ------------------------------------------------------------------ types */

export interface TimeTask {
  id: string;
  name: string;
}

export interface TimeProject {
  id: string;
  name: string;
  tasks?: readonly TimeTask[];
}

export interface TimeEntry {
  id: string;
  /** Local date key, "YYYY-MM-DD". */
  date: string;
  /** Whole seconds. */
  seconds: number;
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface TimerSelection {
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface RunningTimer extends TimerSelection {
  /** When the timer started (ms since epoch, or a Date). */
  startedAt: number | Date;
}

export interface StoppedTimer extends TimerSelection {
  startedAt: number;
  seconds: number;
}

export interface TimeEntryInput {
  date: string;
  seconds: number;
  projectId: string;
  taskId?: string;
  note?: string;
}

type Result = void | { error?: string };

/* ------------------------------------------------------------------ helpers */

/** Clock and hour figures always read left to right, in the same digits as the surrounding text. */
function Figure({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <bdi dir="ltr" className={cn("tabular-nums", className)}>
      {children}
    </bdi>
  );
}

function projectItems(projects: readonly TimeProject[]) {
  return projects.map((p) => ({ value: p.id, label: p.name }));
}

function lookup(projects: readonly TimeProject[], projectId: string, taskId?: string) {
  const project = projects.find((p) => p.id === projectId);
  const task = taskId ? project?.tasks?.find((x) => x.id === taskId) : undefined;
  return { project: project?.name ?? projectId, task: task?.name };
}

interface PickerProps {
  projects: readonly TimeProject[];
  projectId: string | null;
  taskId: string | null;
  onChange: (next: { projectId: string | null; taskId: string | null }) => void;
  disabled?: boolean;
  invalidProject?: boolean;
  t: (typeof STRINGS)["en"];
}

const NO_TASK = "__none__";

/** Project, then task: the task list follows the project. */
function ProjectTaskPicker({ projects, projectId, taskId, onChange, disabled, invalidProject, t }: PickerProps) {
  const project = projects.find((p) => p.id === projectId);
  const tasks = project?.tasks ?? [];
  const projectList = projectItems(projects);
  const taskList = [{ value: NO_TASK, label: t.noTask }, ...tasks.map((x) => ({ value: x.id, label: x.name }))];
  return (
    <>
      <Field invalid={invalidProject} disabled={disabled}>
        <FieldLabel>{t.project}</FieldLabel>
        <Select items={projectList} value={projectId} onValueChange={(v) => onChange({ projectId: v as string | null, taskId: null })}>
          <SelectTrigger>
            <SelectValue placeholder={t.pickProject} />
          </SelectTrigger>
          <SelectContent>
            {projectList.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {invalidProject ? <FieldError match>{t.needProjectField}</FieldError> : null}
      </Field>
      <Field disabled={disabled || !project}>
        <FieldLabel>{t.task}</FieldLabel>
        <Select
          items={taskList}
          value={taskId ?? NO_TASK}
          onValueChange={(v) => onChange({ projectId, taskId: v && v !== NO_TASK ? (v as string) : null })}
        >
          <SelectTrigger>
            <SelectValue placeholder={t.pickTask} />
          </SelectTrigger>
          <SelectContent>
            {taskList.map((x) => (
              <SelectItem key={x.value} value={x.value}>
                {x.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ TimeTracker */

export interface TimeTrackerProps {
  projects: readonly TimeProject[];
  /** Controlled running timer (null when stopped). */
  running?: RunningTimer | null;
  defaultRunning?: RunningTimer | null;
  /** Start; return `{ error }` to stay stopped and show the message. */
  onStart?: (selection: TimerSelection & { startedAt: number }) => Promise<Result> | Result;
  /** Stop; receives the elapsed whole seconds. Return `{ error }` to keep the timer running. */
  onStop?: (stopped: StoppedTimer) => Promise<Result> | Result;
  /** Fires whenever the running timer changes, for controlled use and persistence. */
  onRunningChange?: (running: RunningTimer | null) => void;
  labels?: TimeTrackerLabels;
  className?: string;
}

/** The running timer: pick a project and task, add a note, press start. The clock derives from the start time, so it survives remounts. */
export function TimeTracker({ projects, running: runningProp, defaultRunning = null, onStart, onStop, onRunningChange, labels, className }: TimeTrackerProps) {
  const { t } = useStrings(labels);
  const [inner, setInner] = useState<RunningTimer | null>(defaultRunning);
  const running = runningProp !== undefined ? runningProp : inner;
  const [projectId, setProjectId] = useState<string | null>(running?.projectId ?? null);
  const [taskId, setTaskId] = useState<string | null>(running?.taskId ?? null);
  const [note, setNote] = useState(running?.note ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [needProject, setNeedProject] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const noteId = useId();

  const startedAt = running ? new Date(running.startedAt).getTime() : null;
  useEffect(() => {
    if (startedAt === null) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [startedAt]);

  // A controlled timer that changes from outside shows its own selection.
  const lastRunning = useRef(running);
  useEffect(() => {
    if (running && running !== lastRunning.current) {
      setProjectId(running.projectId);
      setTaskId(running.taskId ?? null);
      setNote(running.note ?? "");
    }
    lastRunning.current = running;
  }, [running]);

  const elapsed = startedAt === null ? 0 : Math.max(0, Math.floor((now - startedAt) / 1000));

  const change = (next: RunningTimer | null) => {
    setInner(next);
    onRunningChange?.(next);
  };

  async function start() {
    if (!projectId) {
      setNeedProject(true);
      return;
    }
    setNeedProject(false);
    setMessage(null);
    const at = Date.now();
    setBusy(true);
    try {
      const result = await onStart?.({ projectId, taskId: taskId ?? undefined, note: note.trim() || undefined, startedAt: at });
      if (result && result.error) {
        setMessage(result.error);
        return;
      }
      setNow(at);
      change({ projectId, taskId: taskId ?? undefined, note: note.trim() || undefined, startedAt: at });
      setAnnounce(t.running);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!running || startedAt === null) return;
    setMessage(null);
    setBusy(true);
    try {
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      const result = await onStop?.({
        projectId: running.projectId,
        taskId: running.taskId,
        note: note.trim() || undefined,
        startedAt,
        seconds,
      });
      if (result && result.error) {
        setMessage(result.error);
        return;
      }
      change(null);
      setNote("");
      setAnnounce(t.stopped);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  const active = running ? lookup(projects, running.projectId, running.taskId) : null;

  return (
    <Card data-slot="time-tracker" className={className}>
      <CardHeader>
        <CardTitle>{t.timer}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div role="timer" aria-label={t.timer} aria-live="off" className="flex flex-col gap-0.5">
            <Figure className="text-display-sm font-semibold text-foreground">{formatClock(elapsed)}</Figure>
            <span className="text-body-sm text-muted-foreground">
              {active ? (active.task ? `${active.project} / ${active.task}` : active.project) : t.needProject}
            </span>
          </div>
          {running ? (
            <Button type="button" variant="danger" size="lg" loading={busy} onClick={() => void stop()}>
              <Square aria-hidden="true" />
              {t.stop}
            </Button>
          ) : (
            <Button type="button" variant="primary" size="lg" loading={busy} onClick={() => void start()}>
              <Play aria-hidden="true" />
              {t.start}
            </Button>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <ProjectTaskPicker
            projects={projects}
            projectId={projectId}
            taskId={taskId}
            disabled={Boolean(running) || busy}
            invalidProject={needProject && !projectId}
            t={t}
            onChange={(next) => {
              setProjectId(next.projectId);
              setTaskId(next.taskId);
              if (next.projectId) setNeedProject(false);
            }}
          />
          <Field className="sm:col-span-2">
            <FieldLabel htmlFor={noteId}>{t.note}</FieldLabel>
            <Input id={noteId} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </div>
        {message ? (
          <p role="alert" className="text-body-sm text-nq-danger-text">
            {message}
          </p>
        ) : null}
        <span role="status" className="sr-only">
          {announce}
        </span>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ TimeEntryDialog */

export interface TimeEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: readonly TimeProject[];
  /** Entry being edited; omit to add a new one. */
  entry?: TimeEntry | null;
  defaultDate?: string;
  /** Resolves to `{ error }` to keep the dialog open. */
  onSubmit: (input: TimeEntryInput, entry?: TimeEntry | null) => Promise<Result> | Result;
  labels?: TimeTrackerLabels;
}

/** Manual entry: date, project and task, a duration typed the way people say it, and a note. */
export function TimeEntryDialog({ open, onOpenChange, projects, entry, defaultDate, onSubmit, labels }: TimeEntryDialogProps) {
  const { t } = useStrings(labels);
  const [date, setDate] = useState<Date>(() => fromDateKey(entry?.date ?? defaultDate ?? dateKey(new Date())));
  const [projectId, setProjectId] = useState<string | null>(entry?.projectId ?? null);
  const [taskId, setTaskId] = useState<string | null>(entry?.taskId ?? null);
  const [duration, setDuration] = useState(entry ? formatHours(entry.seconds) : "");
  const [note, setNote] = useState(entry?.note ?? "");
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const durationId = useId();
  const noteId = useId();

  // Each time the dialog opens it starts from the entry (or blank), not from the last edit.
  useEffect(() => {
    if (!open) return;
    setDate(fromDateKey(entry?.date ?? defaultDate ?? dateKey(new Date())));
    setProjectId(entry?.projectId ?? null);
    setTaskId(entry?.taskId ?? null);
    setDuration(entry ? formatHours(entry.seconds) : "");
    setNote(entry?.note ?? "");
    setTried(false);
    setMessage(null);
  }, [open, entry, defaultDate]);

  const seconds = parseDuration(duration);
  const durationProblem = !duration.trim() || seconds === null || seconds <= 0 ? t.invalidDuration : seconds > 86400 ? t.tooLong : null;
  const projectProblem = !projectId;

  async function submit() {
    setTried(true);
    if (durationProblem || projectProblem || seconds === null || !projectId) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await onSubmit(
        { date: dateKey(date), seconds, projectId, taskId: taskId ?? undefined, note: note.trim() || undefined },
        entry,
      );
      if (result && result.error) {
        setMessage(result.error);
        return;
      }
      onOpenChange(false);
    } catch {
      setMessage(t.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle>{entry ? t.editTitle : t.entryTitle}</DialogTitle>
            <DialogDescription>{t.entryDescription}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.date}</FieldLabel>
            <DatePicker aria-label={t.date} value={date} onValueChange={(d) => d && setDate(d)} />
          </Field>
          <ProjectTaskPicker
            projects={projects}
            projectId={projectId}
            taskId={taskId}
            invalidProject={tried && projectProblem}
            t={t}
            onChange={(next) => {
              setProjectId(next.projectId);
              setTaskId(next.taskId);
            }}
          />
          <Field invalid={tried && Boolean(durationProblem)}>
            <FieldLabel htmlFor={durationId}>{t.duration}</FieldLabel>
            <Input id={durationId} inputMode="text" dir="ltr" autoComplete="off" value={duration} onChange={(e) => setDuration(e.target.value)} />
            <FieldDescription>{t.durationHint}</FieldDescription>
            {tried && durationProblem ? <FieldError match>{durationProblem}</FieldError> : null}
          </Field>
          <Field>
            <FieldLabel htmlFor={noteId}>{t.note}</FieldLabel>
            <Input id={noteId} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          {message ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {message}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy}>
              {t.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ TimeEntryList */

export interface TimeEntryListProps {
  entries: readonly TimeEntry[];
  projects: readonly TimeProject[];
  /** Add a manual entry. Omit to hide the add button and dialog. */
  onAdd?: (input: TimeEntryInput) => Promise<Result> | Result;
  onEdit?: (entry: TimeEntry, input: TimeEntryInput) => Promise<Result> | Result;
  onDelete?: (entry: TimeEntry) => Promise<Result> | Result;
  labels?: TimeTrackerLabels;
  className?: string;
}

/** Entries grouped by day, newest first, with a total per day and add, edit and delete. */
export function TimeEntryList({ entries, projects, onAdd, onEdit, onDelete, labels, className }: TimeEntryListProps) {
  const { t } = useStrings(labels);
  const fmt = useFormatDate();
  const [dialog, setDialog] = useState<{ open: boolean; entry: TimeEntry | null }>({ open: false, entry: null });
  const titleId = useId();

  const groups = useMemo(() => {
    const map = new Map<string, TimeEntry[]>();
    for (const e of entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  return (
    <section data-slot="time-entry-list" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 id={titleId} className="text-title-sm text-foreground">
          {t.entries}
        </h2>
        {onAdd ? (
          <Button type="button" variant="secondary" size="sm" onClick={() => setDialog({ open: true, entry: null })}>
            <Plus aria-hidden="true" />
            {t.addEntry}
          </Button>
        ) : null}
      </div>
      {groups.length === 0 ? (
        <EmptyState
          icon={Clock}
          title={t.emptyTitle}
          description={t.emptyDescription}
          actions={
            onAdd ? (
              <Button type="button" variant="primary" size="sm" onClick={() => setDialog({ open: true, entry: null })}>
                <Plus aria-hidden="true" />
                {t.addEntry}
              </Button>
            ) : undefined
          }
        />
      ) : (
        groups.map(([day, items]) => (
          <Card key={day}>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle className="text-label">{fmt.date(fromDateKey(day), { weekday: "long", day: "numeric", month: "long" })}</CardTitle>
              <span className="text-body-sm text-muted-foreground">
                {t.dayTotal} <Figure className="font-medium text-foreground">{formatHours(sumSeconds(items))}</Figure>
              </span>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {items.map((e) => {
                  const names = lookup(projects, e.projectId, e.taskId);
                  return (
                    <li key={e.id} className="flex items-center gap-3 py-2">
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-body-sm font-medium text-foreground">{names.task ? `${names.project} / ${names.task}` : names.project}</span>
                        {e.note ? <span className="truncate text-body-sm text-muted-foreground">{e.note}</span> : null}
                      </div>
                      <Figure className="text-body-sm font-medium text-foreground">{formatHours(e.seconds)}</Figure>
                      {onEdit ? (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t.edit}: ${names.project}`} onClick={() => setDialog({ open: true, entry: e })}>
                          <Pencil aria-hidden="true" />
                        </Button>
                      ) : null}
                      {onDelete ? (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label={`${t.remove}: ${names.project}`} onClick={() => void onDelete(e)}>
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
      {onAdd || onEdit ? (
        <TimeEntryDialog
          open={dialog.open}
          onOpenChange={(open) => setDialog((d) => ({ ...d, open }))}
          projects={projects}
          entry={dialog.entry}
          labels={labels}
          onSubmit={(input, entry) => (entry ? onEdit?.(entry, input) : onAdd?.(input))}
        />
      ) : null}
    </section>
  );
}

/* ------------------------------------------------------------------ Timesheet */

export type TimesheetView = "day" | "week";

export interface TimesheetProps {
  entries: readonly TimeEntry[];
  projects: readonly TimeProject[];
  view?: TimesheetView;
  defaultView?: TimesheetView;
  onViewChange?: (view: TimesheetView) => void;
  /** Any date inside the period being shown; defaults to today. */
  date?: Date;
  defaultDate?: Date;
  onDateChange?: (date: Date) => void;
  /** 0 Sunday … 6 Saturday. Defaults to Monday, or Saturday in Arabic. */
  weekStartsOn?: number;
  labels?: TimeTrackerLabels;
  className?: string;
}

/** Project and task rows by day columns, with hours per cell, per row and per day. */
export function Timesheet({
  entries,
  projects,
  view: viewProp,
  defaultView = "week",
  onViewChange,
  date: dateProp,
  defaultDate,
  onDateChange,
  weekStartsOn,
  labels,
  className,
}: TimesheetProps) {
  const { ar, t } = useStrings(labels);
  const fmt = useFormatDate();
  const [viewInner, setViewInner] = useState<TimesheetView>(defaultView);
  const [dateInner, setDateInner] = useState<Date>(() => defaultDate ?? new Date());
  const view = viewProp ?? viewInner;
  const date = dateProp ?? dateInner;
  const titleId = useId();

  const setView = (v: TimesheetView) => {
    setViewInner(v);
    onViewChange?.(v);
  };
  const setDate = (d: Date) => {
    setDateInner(d);
    onDateChange?.(d);
  };

  const start = startOfWeek(date, weekStartsOn ?? (ar ? 6 : 1));
  const days = view === "week" ? weekKeys(start) : [dateKey(date)];
  const step = view === "week" ? 7 : 1;
  const todayKey = dateKey(new Date());

  const grid = useMemo(
    () => buildGrid(entries, days, (e) => `${e.projectId}\u0000${e.taskId ?? ""}`),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entries, days.join(",")],
  );

  const range =
    view === "week"
      ? fmt.range(fromDateKey(days[0] ?? dateKey(date)), fromDateKey(days[6] ?? dateKey(date)), { month: "short", day: "numeric" })
      : fmt.date(date, { weekday: "long", day: "numeric", month: "long" });

  return (
    <section data-slot="timesheet" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-title-sm text-foreground">
          {t.timesheet}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <ToggleGroup aria-label={t.view} value={[view]} onValueChange={(v) => v[0] && setView(v[0] as TimesheetView)}>
            <Toggle value="day">{t.day}</Toggle>
            <Toggle value="week">{t.week}</Toggle>
          </ToggleGroup>
          <div className="flex items-center gap-1">
            <Button type="button" variant="secondary" size="icon-sm" aria-label={t.previous} onClick={() => setDate(addDays(date, -step))}>
              <ChevronLeft aria-hidden="true" className="rtl:rotate-180" />
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setDate(new Date())}>
              {t.today}
            </Button>
            <Button type="button" variant="secondary" size="icon-sm" aria-label={t.next} onClick={() => setDate(addDays(date, step))}>
              <ChevronRight aria-hidden="true" className="rtl:rotate-180" />
            </Button>
          </div>
        </div>
      </div>
      <p aria-live="polite" className="text-body-sm text-muted-foreground">
        {range}
      </p>
      <Card>
        <Table label={t.gridLabel}>
          <TableHeader>
            <TableRow>
              <TableHead>{t.row}</TableHead>
              {days.map((d) => (
                <TableHead key={d} className={cn("text-end", d === todayKey && "text-foreground")} aria-current={d === todayKey ? "date" : undefined}>
                  {view === "week" ? fmt.date(fromDateKey(d), { weekday: "short", day: "numeric" }) : t.duration}
                </TableHead>
              ))}
              {view === "week" ? <TableHead className="text-end">{t.total}</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grid.rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={days.length + (view === "week" ? 2 : 1)} className="py-8 text-center text-muted-foreground">
                  {t.emptyGrid}
                </TableCell>
              </TableRow>
            ) : (
              grid.rows.map((row) => {
                const [projectId = "", taskId = ""] = row.key.split("\u0000");
                const names = lookup(projects, projectId, taskId || undefined);
                return (
                  <TableRow key={row.key}>
                    <TableCell className="font-medium">{names.task ? `${names.project} / ${names.task}` : names.project}</TableCell>
                    {days.map((d) => (
                      <TableCell key={d} className="text-end">
                        {row.cells[d] ? <Figure>{formatHours(row.cells[d])}</Figure> : <span aria-hidden="true" className="text-muted-foreground">-</span>}
                      </TableCell>
                    ))}
                    {view === "week" ? (
                      <TableCell className="text-end font-medium">
                        <Figure>{formatHours(row.total)}</Figure>
                      </TableCell>
                    ) : null}
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {grid.rows.length ? (
            <TableFooter>
              <TableRow>
                <TableCell className="font-semibold">{t.total}</TableCell>
                {days.map((d) => (
                  <TableCell key={d} className="text-end font-semibold">
                    <Figure>{formatHours(grid.columns[d] ?? 0)}</Figure>
                  </TableCell>
                ))}
                {view === "week" ? (
                  <TableCell className="text-end font-semibold">
                    <Figure>{formatHours(grid.total)}</Figure>
                  </TableCell>
                ) : null}
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </Card>
    </section>
  );
}
