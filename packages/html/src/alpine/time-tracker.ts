// nqTimeTracker: the time tracker scope. The Blade <x-nq::time-tracker> root holds the projects, the entries and the running timer;
// its parts (timer, entries with the add / edit dialog, timesheet) read this state, so a stopped timer or a new entry shows up everywhere.
//
//   <div data-slot="time-tracker-root" x-data="nqTimeTracker({ projects: [...], entries: [...], running: null, view: 'week', logOnStop: true })">…</div>
//
// Events from the root (bubbling): `time-start`, `time-stop`, `time-entry-add`, `time-entry-edit` and `time-entry-delete` run BEFORE the change and
// can be vetoed from a listener: call `event.detail.fail("message")` to keep the old state and show the message. After a change come
// `time-running-change` (detail: the running timer or null), `time-entries-change` (detail: all entries, to persist them) and `time-date-change`.
// The clock derives from the start time (epoch ms), so a running timer restored from storage keeps counting.

import { addDays, buildGrid, dateKey, formatClock, formatHours, fromDateKey, parseDuration, startOfWeek, sumSeconds, weekKeys } from "./time-tracker-logic";
import type { Magics, Register } from "./types";

const SEP = "\u0000";

const STR: Record<string, readonly [string, string]> = {
  timer: ["Timer", "المؤقّت"],
  project: ["Project", "المشروع"],
  task: ["Task", "المهمة"],
  noTask: ["No task", "بدون مهمة"],
  pickProject: ["Choose a project", "اختر مشروعًا"],
  pickTask: ["Choose a task", "اختر مهمة"],
  note: ["What are you working on?", "على ماذا تعمل؟"],
  start: ["Start timer", "ابدأ المؤقّت"],
  stop: ["Stop timer", "أوقف المؤقّت"],
  running: ["Timer running", "المؤقّت يعمل"],
  stopped: ["Timer stopped", "توقّف المؤقّت"],
  needProject: ["Choose a project to start the timer.", "اختر مشروعًا لبدء المؤقّت."],
  failed: ["That did not go through. Try again.", "لم تتم العملية. حاول مرة أخرى."],
  entries: ["Time entries", "سجلّ الوقت"],
  addEntry: ["Add time", "إضافة وقت"],
  edit: ["Edit entry", "تعديل السجل"],
  remove: ["Delete entry", "حذف السجل"],
  emptyTitle: ["No time logged yet", "لا يوجد وقت مسجّل بعد"],
  emptyDescription: ["Start the timer or add time by hand.", "ابدأ المؤقّت أو أضف وقتًا يدويًا."],
  dayTotal: ["Day total", "مجموع اليوم"],
  entryTitle: ["Add time", "إضافة وقت"],
  editTitle: ["Edit time entry", "تعديل سجل الوقت"],
  entryDescription: ["Log time you already spent.", "سجّل وقتًا قضيته بالفعل."],
  date: ["Date", "التاريخ"],
  duration: ["Duration", "المدة"],
  durationHint: ["For example 1:30, 1.5h or 90m.", "مثل 1:30 أو 1.5h أو 90m."],
  invalidDuration: ["Enter a duration such as 1:30 or 45m.", "أدخل مدة مثل 1:30 أو 45m."],
  tooLong: ["An entry cannot be longer than 24 hours.", "لا يمكن أن يتجاوز السجل 24 ساعة."],
  needProjectField: ["Choose a project.", "اختر مشروعًا."],
  save: ["Save", "حفظ"],
  cancel: ["Cancel", "إلغاء"],
  timesheet: ["Timesheet", "الجدول الزمني"],
  day: ["Day", "يوم"],
  week: ["Week", "أسبوع"],
  view: ["Timesheet view", "عرض الجدول الزمني"],
  previous: ["Previous", "السابق"],
  next: ["Next", "التالي"],
  today: ["Today", "اليوم"],
  total: ["Total", "المجموع"],
  row: ["Project and task", "المشروع والمهمة"],
  gridLabel: ["Timesheet grid, hours per day", "شبكة الجدول الزمني، الساعات لكل يوم"],
  emptyGrid: ["No time logged in this period.", "لا يوجد وقت مسجّل في هذه الفترة."],
  hoursShort: ["h", "س"],
};

export interface TimeTask {
  id: string;
  name: string;
}

export interface TimeProject {
  id: string;
  name: string;
  tasks?: TimeTask[];
}

export interface TimeEntry {
  id: string;
  date: string;
  seconds: number;
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface TimeRunning {
  projectId: string;
  taskId?: string;
  note?: string;
  startedAt: number;
}

export interface TimeTrackerOptions {
  projects?: TimeProject[];
  entries?: TimeEntry[];
  running?: TimeRunning | null;
  view?: "day" | "week";
  /** Any day inside the period shown, "YYYY-MM-DD". Default today. */
  date?: string;
  weekStartsOn?: number;
  /** Add an entry to the list when the timer stops. */
  logOnStop?: boolean;
}

interface Nq {
  t(en: string, ar: string): string;
  locale: string;
}

interface Dlg {
  open: boolean;
  entry: TimeEntry | null;
  date: string | null;
  projectId: string | null;
  taskId: string | null;
  duration: string;
  note: string;
  tried: boolean;
  busy: boolean;
  message: string | null;
}

type Model = "sel" | "dlg";

interface TimeData extends Magics {
  $nq: Nq;
  projects: TimeProject[];
  entries: TimeEntry[];
  running: TimeRunning | null;
  sel: { projectId: string | null; taskId: string | null };
  note: string;
  message: string | null;
  needProject: boolean;
  announce: string;
  now: number;
  viewValue: string[];
  lastView: "day" | "week";
  date: string;
  weekStartsOn: number | null;
  logOnStop: boolean;
  counter: number;
  busy: boolean;
  dlg: Dlg;
  t(key: string): string;
  tasksOf(projectId: string | null): TimeTask[];
  names(projectId: string, taskId?: string): { project: string; task?: string };
  label(projectId: string, taskId?: string): string;
  elapsed(): number;
  currentView(): "day" | "week";
  days(): string[];
  dateValue(): Date;
  fmt(date: Date, options: Intl.DateTimeFormatOptions): string;
  emit(name: string, detail: Record<string, unknown>): string | null;
  announceEntries(): void;
  durationProblem(): string | null;
  setTimer(): void;
  locked(model: Model): boolean;
  projectValue(model: Model): string;
  taskValue(model: Model): string;
}

const NONE = "";

export const timeTracker: Register = (Alpine) => {
  Alpine.data("nqTimeTracker", (options: TimeTrackerOptions = {}) => {
    // Non-serialisable state stays out of the reactive data.
    let rootEl: HTMLElement = document.body;
    let ticker: ReturnType<typeof setInterval> | undefined;
    const running = options.running ?? null;
    const view = options.view ?? "week";
    return {
      projects: options.projects ?? [],
      entries: options.entries ?? [],
      running,
      sel: { projectId: running?.projectId ?? null, taskId: running?.taskId ?? null },
      note: running?.note ?? "",
      message: null as string | null,
      needProject: false,
      announce: "",
      now: Date.now(),
      viewValue: [view],
      lastView: view,
      date: options.date ?? dateKey(new Date()),
      weekStartsOn: options.weekStartsOn ?? null,
      logOnStop: options.logOnStop ?? false,
      counter: 0,
      busy: false,
      dlg: { open: false, entry: null, date: null, projectId: null, taskId: null, duration: "", note: "", tried: false, busy: false, message: null } as Dlg,

      init(this: TimeData) {
        rootEl = this.$el;
        this.setTimer();
        // Seed an element that shows the picker with the running timer's selection.
        this.$watch("running", () => this.setTimer());
      },
      destroy() {
        clearInterval(ticker);
      },
      setTimer(this: TimeData) {
        clearInterval(ticker);
        if (!this.running) return;
        this.now = Date.now();
        ticker = setInterval(() => (this.now = Date.now()), 1000);
      },

      // Strings and lookups
      t(this: TimeData, key: string) {
        const pair = STR[key] ?? [key, key];
        return this.$nq.t(pair[0], pair[1]);
      },
      tasksOf(this: TimeData, projectId: string | null) {
        return this.projects.find((p) => p.id === projectId)?.tasks ?? [];
      },
      names(this: TimeData, projectId: string, taskId?: string) {
        const project = this.projects.find((p) => p.id === projectId);
        const task = taskId ? project?.tasks?.find((x) => x.id === taskId) : undefined;
        return { project: project?.name ?? projectId, task: task?.name };
      },
      label(this: TimeData, projectId: string, taskId?: string) {
        const n = this.names(projectId, taskId);
        return n.task ? `${n.project} / ${n.task}` : n.project;
      },
      hours(seconds: number) {
        return formatHours(seconds);
      },
      fmt(this: TimeData, date: Date, opts: Intl.DateTimeFormatOptions) {
        try {
          return new Intl.DateTimeFormat(new Intl.Locale(this.$nq.locale, { numberingSystem: "latn" }).toString(), opts).format(date);
        } catch {
          return date.toDateString();
        }
      },
      emit(this: TimeData, name: string, detail: Record<string, unknown>) {
        let error: string | null = null;
        const fail = (message?: string) => {
          error = message || this.t("failed");
        };
        rootEl.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, fail } }));
        return error;
      },
      announceEntries(this: TimeData) {
        rootEl.dispatchEvent(new CustomEvent("time-entries-change", { bubbles: true, detail: JSON.parse(JSON.stringify(this.entries)) }));
      },

      // Timer
      isRunning(this: TimeData) {
        return this.running !== null;
      },
      locked(this: TimeData, model: Model) {
        return model === "dlg" ? this.dlg.busy : this.running !== null || this.busy;
      },
      elapsed(this: TimeData) {
        return this.running ? Math.max(0, Math.floor((this.now - this.running.startedAt) / 1000)) : 0;
      },
      clockText(this: TimeData) {
        return formatClock(this.elapsed());
      },
      activeLabel(this: TimeData) {
        return this.running ? this.label(this.running.projectId, this.running.taskId) : this.t("needProject");
      },
      projectValue(this: TimeData, model: Model) {
        return (model === "dlg" ? this.dlg.projectId : this.sel.projectId) ?? NONE;
      },
      taskValue(this: TimeData, model: Model) {
        return (model === "dlg" ? this.dlg.taskId : this.sel.taskId) ?? NONE;
      },
      pickProject(this: TimeData, model: Model, value: string) {
        const target = model === "dlg" ? this.dlg : this.sel;
        target.projectId = value || null;
        target.taskId = null;
        if (value && model === "sel") this.needProject = false;
      },
      pickTask(this: TimeData, model: Model, value: string) {
        (model === "dlg" ? this.dlg : this.sel).taskId = value || null;
      },
      syncProject(this: TimeData, el: HTMLSelectElement, model: Model) {
        const value = this.projectValue(model);
        void this.$nextTick(() => {
          el.value = value;
        });
      },
      syncTask(this: TimeData, el: HTMLSelectElement, model: Model) {
        this.tasksOf(model === "dlg" ? this.dlg.projectId : this.sel.projectId);
        const value = this.taskValue(model);
        void this.$nextTick(() => {
          el.value = value;
        });
      },
      taskLocked(this: TimeData, model: Model) {
        return this.locked(model) ? true : !this.projectValue(model);
      },
      invalidProject(this: TimeData, model: Model) {
        return model === "dlg" ? this.dlg.tried && !this.dlg.projectId : this.needProject && !this.sel.projectId;
      },
      start(this: TimeData) {
        if (!this.sel.projectId) {
          this.needProject = true;
          return;
        }
        this.needProject = false;
        this.message = null;
        const at = Date.now();
        const selection = { projectId: this.sel.projectId, taskId: this.sel.taskId ?? undefined, note: this.note.trim() || undefined };
        const error = this.emit("time-start", { ...selection, startedAt: at });
        if (error) {
          this.message = error;
          return;
        }
        this.now = at;
        this.running = { ...selection, startedAt: at };
        this.announce = this.t("running");
        rootEl.dispatchEvent(new CustomEvent("time-running-change", { bubbles: true, detail: { ...this.running } }));
      },
      stop(this: TimeData) {
        const run = this.running;
        if (!run) return;
        this.message = null;
        const seconds = Math.max(0, Math.floor((Date.now() - run.startedAt) / 1000));
        const note = this.note.trim() || undefined;
        const error = this.emit("time-stop", { projectId: run.projectId, taskId: run.taskId, note, startedAt: run.startedAt, seconds });
        if (error) {
          this.message = error;
          return;
        }
        if (this.logOnStop) {
          this.entries = [{ id: `new-${++this.counter}`, date: dateKey(new Date(run.startedAt)), seconds, projectId: run.projectId, taskId: run.taskId, note }, ...this.entries];
          this.announceEntries();
        }
        this.running = null;
        this.note = "";
        this.announce = this.t("stopped");
        rootEl.dispatchEvent(new CustomEvent("time-running-change", { bubbles: true, detail: null }));
      },

      // Entries
      groups(this: TimeData) {
        const map = new Map<string, TimeEntry[]>();
        for (const e of this.entries) map.set(e.date, [...(map.get(e.date) ?? []), e]);
        return [...map.entries()]
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([day, items]) => ({ day, items, total: sumSeconds(items), text: this.fmt(fromDateKey(day), { weekday: "long", day: "numeric", month: "long" }) }));
      },
      entryAria(this: TimeData, kind: "edit" | "remove", e: TimeEntry) {
        return `${this.t(kind)}: ${this.names(e.projectId).project}`;
      },
      openDialog(this: TimeData, entry: TimeEntry | null) {
        this.dlg = {
          open: true,
          entry,
          date: entry?.date ?? dateKey(new Date()),
          projectId: entry?.projectId ?? null,
          taskId: entry?.taskId ?? null,
          duration: entry ? formatHours(entry.seconds) : "",
          note: entry?.note ?? "",
          tried: false,
          busy: false,
          message: null,
        };
      },
      dialogTitle(this: TimeData) {
        return this.t(this.dlg.entry ? "editTitle" : "entryTitle");
      },
      durationProblem(this: TimeData) {
        const s = parseDuration(this.dlg.duration);
        if (!this.dlg.duration.trim() || s === null || s <= 0) return this.t("invalidDuration");
        return s > 86400 ? this.t("tooLong") : null;
      },
      showDurationProblem(this: TimeData) {
        return this.dlg.tried && this.durationProblem() !== null;
      },
      submitDialog(this: TimeData) {
        const d = this.dlg;
        d.tried = true;
        const seconds = parseDuration(d.duration);
        if (this.durationProblem() || !d.projectId || seconds === null || !d.date) return;
        d.message = null;
        const input = { date: d.date, seconds, projectId: d.projectId, taskId: d.taskId ?? undefined, note: d.note.trim() || undefined };
        const entry = d.entry;
        const error = entry ? this.emit("time-entry-edit", { entry: { ...entry }, input }) : this.emit("time-entry-add", { input });
        if (error) {
          d.message = error;
          return;
        }
        if (entry) this.entries = this.entries.map((e) => (e.id === entry.id ? { ...e, ...input } : e));
        else this.entries = [{ id: `new-${++this.counter}`, ...input }, ...this.entries];
        this.announceEntries();
        d.open = false;
      },
      removeEntry(this: TimeData, entry: TimeEntry) {
        if (this.emit("time-entry-delete", { entry: { ...entry } })) return;
        this.entries = this.entries.filter((e) => e.id !== entry.id);
        this.announceEntries();
      },

      // Timesheet
      currentView(this: TimeData) {
        const v = this.viewValue[0];
        return v === "day" || v === "week" ? v : this.lastView;
      },
      isWeek(this: TimeData) {
        const v = this.currentView();
        this.lastView = v;
        return v === "week";
      },
      dateValue(this: TimeData) {
        return fromDateKey(this.date);
      },
      days(this: TimeData) {
        if (this.currentView() === "day") return [this.date];
        return weekKeys(startOfWeek(this.dateValue(), this.weekStartsOn ?? (this.$nq.locale.startsWith("ar") ? 6 : 1)));
      },
      shift(this: TimeData, direction: 1 | -1) {
        this.date = dateKey(addDays(this.dateValue(), direction * (this.currentView() === "week" ? 7 : 1)));
        rootEl.dispatchEvent(new CustomEvent("time-date-change", { bubbles: true, detail: this.date }));
      },
      goToday(this: TimeData) {
        this.date = dateKey(new Date());
        rootEl.dispatchEvent(new CustomEvent("time-date-change", { bubbles: true, detail: this.date }));
      },
      range(this: TimeData) {
        const days = this.days();
        if (this.currentView() === "day") return this.fmt(this.dateValue(), { weekday: "long", day: "numeric", month: "long" });
        const a = fromDateKey(days[0] ?? this.date);
        const b = fromDateKey(days[6] ?? this.date);
        try {
          return new Intl.DateTimeFormat(new Intl.Locale(this.$nq.locale, { numberingSystem: "latn" }).toString(), { month: "short", day: "numeric" }).formatRange(a, b);
        } catch {
          return `${this.fmt(a, { month: "short", day: "numeric" })} - ${this.fmt(b, { month: "short", day: "numeric" })}`;
        }
      },
      colLabel(this: TimeData, day: string) {
        return this.currentView() === "week" ? this.fmt(fromDateKey(day), { weekday: "short", day: "numeric" }) : this.t("duration");
      },
      isToday(day: string) {
        return day === dateKey(new Date());
      },
      grid(this: TimeData) {
        const g = buildGrid(this.entries, this.days(), (e) => `${e.projectId}${SEP}${e.taskId ?? ""}`);
        return {
          ...g,
          rows: g.rows.map((r) => {
            const [projectId = "", taskId = ""] = r.key.split(SEP);
            return { ...r, text: this.label(projectId, taskId || undefined) };
          }),
        };
      },
      cellText(row: { cells: Record<string, number> }, day: string) {
        return row.cells[day] ? formatHours(row.cells[day]) : "";
      },
      colspan(this: TimeData) {
        return this.days().length + (this.currentView() === "week" ? 2 : 1);
      },
    };
  });
};
