// nqHrAttendance: the HR attendance and leave scope. The Blade <x-nq::hr-attendance> root holds the punches, the leave types and requests and the
// payroll runs; its parts (marker, balances, request-dialog, request-list, payroll-runs) read this state, so a punch, a decision or a new request
// shows up everywhere at once.
//
//   <div data-slot="hr-attendance-root" x-data="nqHrAttendance({ punches: [...], shift: { start: '09:00', end: '17:00' }, types: [...], requests: [...], runs: [...] })">…</div>
//
// Events from the root (bubbling) run BEFORE the change and can be vetoed: call `event.detail.fail("message")` to keep the old state and show the
// message, or `event.detail.wait(promise)` to hold the change until your server call settles (a rejection or `{ error }` keeps the old state).
//   hr-punch            detail { kind, at }                       then hr-punches-change (all punches)
//   hr-leave-decide     detail { request, decision, note }        then hr-requests-change (all requests)
//   hr-leave-withdraw   detail { request }
//   hr-leave-request    detail { input: { typeId, start, end, halfStart, halfEnd, reason, days } }
//   hr-payroll-approve  detail { run }                            then hr-runs-change (all runs)
//   hr-payroll-paid     detail { run }
// Money is integer minor units; dates are "YYYY-MM-DD"; punch times are epoch milliseconds (or an ISO string).

import {
  attendanceLateMinutes,
  attendanceMinutes,
  attendanceState,
  checkLeaveRequest,
  leaveBalance,
  leaveDays,
  parseDay,
  payrollNet,
  payrollTotals,
  todayKey,
  type LeaveCalendar,
  type LeaveRequestLike,
  type LeaveTypeLike,
  type PayrollLineLike,
  type PunchLike,
} from "./hr-attendance-logic";
import type { Magics, Register } from "./types";

const STR: Record<string, readonly [string, string]> = {
  attendance: ["Attendance", "الحضور"],
  requestLeave: ["Request leave", "طلب إجازة"],
  clockedOut: ["Clocked out", "تم تسجيل الانصراف"],
  clockedIn: ["Working", "على رأس العمل"],
  onBreak: ["On break", "في استراحة"],
  since: ["Since {time}", "منذ {time}"],
  workedToday: ["Worked today", "ساعات العمل اليوم"],
  shift: ["Shift {start} to {end}", "الدوام من {start} إلى {end}"],
  clockIn: ["Clock in", "تسجيل حضور"],
  clockOut: ["Clock out", "تسجيل انصراف"],
  startBreak: ["Start break", "بدء استراحة"],
  endBreak: ["End break", "إنهاء الاستراحة"],
  late: ["Clocked in {min} late", "سُجّل الحضور بتأخر {min}"],
  onTime: ["On time", "في الموعد"],
  noPunches: ["No punches yet today.", "لا توجد بصمات اليوم بعد."],
  punchIn: ["Clocked in", "تسجيل حضور"],
  punchOut: ["Clocked out", "تسجيل انصراف"],
  punchBreakStart: ["Break started", "بدء استراحة"],
  punchBreakEnd: ["Break ended", "انتهاء استراحة"],
  failed: ["That did not go through. Try again.", "لم تتم العملية. حاول مرة أخرى."],
  hoursShort: ["h", "س"],
  minutesShort: ["m", "د"],
  remaining: ["days left", "يومًا متبقيًا"],
  unlimited: ["No limit", "بلا حد"],
  daysTaken: ["{n} taken", "{n} مستخدمة"],
  used: ["Used", "المستخدم"],
  accrues: ["Earned monthly", "يُكتسب شهريًا"],
  carry: ["Up to {n} carry over", "يُرحّل حتى {n}"],
  workingDays: ["{n} working days", "{n} أيام عمل"],
  afterRequest: ["{n} left after this request", "يتبقى {n} بعد هذا الطلب"],
  "problems.range": ["The end date is before the start date.", "تاريخ النهاية قبل تاريخ البداية."],
  "problems.none": ["These dates have no working days.", "لا توجد أيام عمل ضمن هذه التواريخ."],
  "problems.overlap": ["You already have leave on some of these days.", "لديك إجازة في بعض هذه الأيام."],
  "problems.balance": ["You do not have enough days available for this.", "رصيدك المتاح لا يكفي لهذا الطلب."],
  "problems.missing": ["Pick both dates.", "اختر التاريخين."],
  "statuses.pending": ["Pending", "قيد الموافقة"],
  "statuses.approved": ["Approved", "موافق عليها"],
  "statuses.rejected": ["Rejected", "مرفوضة"],
  "statuses.cancelled": ["Withdrawn", "مسحوبة"],
  rejectDescription: ["{who} will see your note.", "سيرى {who} ملاحظتك."],
  "runStatuses.draft": ["Draft", "مسودة"],
  "runStatuses.approved": ["Approved", "معتمدة"],
  "runStatuses.paid": ["Paid", "مصروفة"],
  runTitle: ["Payroll for {period}", "رواتب {period}"],
  runDescription: ["{count} employees. Amounts are what each person is owed for the period.", "{count} موظفين. المبالغ هي المستحق لكل شخص عن الفترة."],
};

export type HrPunchKind = PunchLike["kind"];

export interface HrPunch {
  id?: string;
  kind: HrPunchKind;
  /** Epoch milliseconds, or an ISO string. */
  at: number | string;
  place?: string;
}

export interface HrLeaveType extends LeaveTypeLike {
  name: string;
}

export interface HrLeaveRequest extends LeaveRequestLike {
  id: string;
  employee?: string;
  reason?: string;
  note?: string;
}

export interface HrPayrollLine extends PayrollLineLike {
  id: string;
  employee: string;
  workedDays?: number;
  workingDays?: number;
}

export interface HrPayrollRun {
  id: string;
  /** "2026-09". */
  period: string;
  status: "draft" | "approved" | "paid";
  lines: HrPayrollLine[];
  payDate?: string;
}

export interface HrAttendanceOptions {
  punches?: HrPunch[];
  shift?: { start: string; end: string; graceMinutes?: number } | null;
  place?: string | null;
  breaks?: boolean;
  /** The current time in ms. Default: the real clock, ticking every 15 seconds. */
  now?: number | null;
  types?: HrLeaveType[];
  requests?: HrLeaveRequest[];
  year?: number | null;
  asOf?: string | null;
  carriedOver?: Record<string, number>;
  calendar?: LeaveCalendar;
  mode?: "manager" | "self";
  /** The person the balances and the request dialog are for: only their requests count. Default: every request in the list. */
  employee?: string | null;
  runs?: HrPayrollRun[];
  /** ISO 4217 code. Default USD, or SAR in Arabic. */
  currency?: string | null;
  labels?: Record<string, unknown>;
}

interface Nq {
  t(en: string, ar: string): string;
  money(amount: number, currency?: string): string;
  locale: string;
}

interface Punch {
  id: string;
  kind: HrPunchKind;
  at: number;
  place?: string;
}

type Row = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Self = Magics & { $nq: Nq } & Record<string, any>;

const fill = (s: string, vars: Record<string, string | number> = {}) => Object.entries(vars).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);

const toMs = (v: number | string) => (typeof v === "number" ? v : Date.parse(v));

const lookup = (labels: Record<string, unknown>, key: string): string | undefined => {
  const direct = labels[key];
  if (typeof direct === "string") return direct;
  let cur: unknown = labels;
  for (const part of key.split(".")) cur = cur && typeof cur === "object" ? (cur as Record<string, unknown>)[part] : undefined;
  return typeof cur === "string" ? cur : undefined;
};

export const hrAttendance: Register = (Alpine) => {
  Alpine.data("nqHrAttendance", (options: HrAttendanceOptions = {}) => {
    // Non-serialisable state stays out of the reactive data.
    let rootEl: HTMLElement = document.body;
    let ticker: ReturnType<typeof setInterval> | undefined;
    const fixedNow = options.now ?? null;
    let counter = 0;
    return {
      punches: (options.punches ?? []).map((p) => ({ id: p.id ?? `p-${++counter}`, kind: p.kind, at: toMs(p.at), place: p.place })) as Punch[],
      shift: options.shift ?? null,
      place: options.place ?? null,
      breaks: options.breaks ?? true,
      now: fixedNow ?? Date.now(),
      busy: null as HrPunchKind | null,
      error: null as string | null,
      types: options.types ?? [],
      requests: (options.requests ?? []).map((r) => ({ ...r })),
      year: options.year ?? null,
      asOf: options.asOf ?? null,
      carriedOver: options.carriedOver ?? {},
      calendar: options.calendar ?? {},
      mode: options.mode ?? "manager",
      employee: options.employee ?? null,
      runs: (options.runs ?? []).map((r) => ({ ...r, lines: r.lines.map((l) => ({ ...l })) })),
      currencyCode: options.currency ?? null,
      labels: options.labels ?? {},
      reqRows: [] as Row[],
      runRows: [] as Row[],
      lineRows: [] as Row[],
      listBusy: null as string | null,
      listError: null as string | null,
      req: { open: false, typeId: "", start: null as string | null, end: null as string | null, halfStart: false, halfEnd: false, reason: "", busy: false, error: null as string | null },
      rej: { open: false, request: null as HrLeaveRequest | null, note: "" },
      runDlg: { open: false, id: null as string | null, busy: false, error: null as string | null },

      init(this: Self) {
        rootEl = this.$el;
        if (fixedNow === null) ticker = setInterval(() => (this.now = Date.now()), 15_000);
        this.syncRows();
        this.$watch("req.start", (start: string | null) => {
          this.req.error = null;
          if (start && (!this.req.end || this.req.end < start)) this.req.end = start;
        });
        this.$watch("req.end", () => (this.req.error = null));
        this.$watch("runDlg.id", () => this.syncRows());
        this.$watch("requests", () => this.syncRows());
        this.$watch("runs", () => this.syncRows());
      },
      destroy() {
        clearInterval(ticker);
      },

      // Strings and formatting
      t(this: Self, key: string, vars?: Record<string, string | number>) {
        const custom = lookup(this.labels, key);
        if (custom !== undefined) return fill(custom, vars);
        const pair = STR[key] ?? [key, key];
        return fill(this.$nq.t(pair[0], pair[1]), vars);
      },
      locale(this: Self) {
        return this.$nq.locale || "en";
      },
      isArabic(this: Self) {
        return this.locale().startsWith("ar");
      },
      num(this: Self, value: number, opts: Intl.NumberFormatOptions = { maximumFractionDigits: 1 }) {
        try {
          return new Intl.NumberFormat(`${this.locale()}-u-nu-latn`, opts).format(value);
        } catch {
          return String(value);
        }
      },
      cur(this: Self) {
        return (this.currencyCode ?? (this.isArabic() ? "SAR" : "USD")).toUpperCase();
      },
      /** Minor units to the amount in major units: 12345 cents is 123.45. */
      major(this: Self, minor: number) {
        let digits = 2;
        try {
          digits = new Intl.NumberFormat("en", { style: "currency", currency: this.cur() }).resolvedOptions().maximumFractionDigits ?? 2;
        } catch {
          /* unknown code: keep two */
        }
        return minor / 10 ** digits;
      },
      fmt(this: Self, minor: number) {
        return this.$nq.money(this.major(minor), this.cur());
      },
      time(this: Self, ms: number) {
        try {
          return new Intl.DateTimeFormat(`${this.locale()}-u-nu-latn`, { timeStyle: "short" }).format(new Date(ms));
        } catch {
          return new Date(ms).toTimeString().slice(0, 5);
        }
      },
      duration(this: Self, minutes: number) {
        const h = Math.floor(minutes / 60);
        const m = minutes % 60;
        return `${this.num(h, {})}${this.t("hoursShort")} ${this.num(m, { minimumIntegerDigits: 2 })}${this.t("minutesShort")}`;
      },
      emit(name: string, detail: unknown) {
        rootEl.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));
      },
      /** Dispatches a cancelable event and resolves to the error message that vetoed it, or null. */
      async ask(this: Self, name: string, detail: Record<string, unknown>): Promise<string | null> {
        let error = null as string | null;
        const waits: Promise<unknown>[] = [];
        const fail = (message?: string) => {
          error = message || this.t("failed");
        };
        const wait = (promise: Promise<unknown> | unknown) => {
          waits.push(Promise.resolve(promise));
        };
        rootEl.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, fail, wait } }));
        if (error) return error;
        for (const p of waits) {
          try {
            const result = (await p) as { error?: string } | undefined | null;
            if (result && typeof result === "object" && result.error) return String(result.error);
          } catch (e) {
            return e instanceof Error && e.message ? e.message : this.t("failed");
          }
        }
        return error;
      },
      clone(value: unknown) {
        return JSON.parse(JSON.stringify(value));
      },

      // Marker
      sortedPunches(this: Self): Punch[] {
        return [...this.punches].sort((a: Punch, b: Punch) => a.at - b.at);
      },
      like(this: Self): PunchLike[] {
        return this.sortedPunches().map((p: Punch) => ({ kind: p.kind, at: p.at }));
      },
      state(this: Self) {
        return attendanceState(this.like());
      },
      worked(this: Self) {
        return attendanceMinutes(this.like(), this.now);
      },
      workedText(this: Self) {
        return this.duration(this.worked());
      },
      stateText(this: Self) {
        const s = this.state();
        return this.t(s === "in" ? "clockedIn" : s === "break" ? "onBreak" : "clockedOut");
      },
      firstIn(this: Self): Punch | undefined {
        return this.sortedPunches().find((p: Punch) => p.kind === "in");
      },
      lastIn(this: Self): Punch | undefined {
        return [...this.sortedPunches()].reverse().find((p: Punch) => p.kind === "in" || p.kind === "break-end");
      },
      workedLine(this: Self) {
        const last = this.lastIn();
        const line = this.t("workedToday");
        return this.state() !== "out" && last ? `${line} · ${this.t("since", { time: this.time(last.at) })}` : line;
      },
      shiftText(this: Self) {
        return this.shift ? this.t("shift", { start: this.shift.start, end: this.shift.end }) : "";
      },
      lateMinutes(this: Self) {
        const first = this.firstIn();
        return first && this.shift ? attendanceLateMinutes(first.at, this.shift.start, this.shift.graceMinutes ?? 0) : 0;
      },
      hasLateInfo(this: Self) {
        return this.firstIn() !== undefined && this.shift !== null;
      },
      lateText(this: Self) {
        const late = this.lateMinutes();
        return late ? this.t("late", { min: `${this.num(late, {})}${this.t("minutesShort")}` }) : this.t("onTime");
      },
      punchLabel(this: Self, kind: HrPunchKind) {
        return this.t(kind === "in" ? "punchIn" : kind === "out" ? "punchOut" : kind === "break-start" ? "punchBreakStart" : "punchBreakEnd");
      },
      async punch(this: Self, kind: HrPunchKind) {
        if (this.busy) return;
        this.busy = kind;
        this.error = null;
        const at = Date.now();
        const error = await this.ask("hr-punch", { kind, at });
        this.busy = null;
        if (error) {
          this.error = error;
          return;
        }
        this.punches = [...this.punches, { id: `new-${++counter}`, kind, at }];
        if (fixedNow === null) this.now = at;
        this.emit("hr-punches-change", this.clone(this.punches));
      },

      // Leave balances
      today(this: Self) {
        return this.asOf ?? todayKey();
      },
      leaveYear(this: Self) {
        return this.year ?? Number(this.today().slice(0, 4));
      },
      own(this: Self): HrLeaveRequest[] {
        return this.employee ? this.requests.filter((r: HrLeaveRequest) => r.employee === this.employee) : this.requests;
      },
      typeName(this: Self, id: string) {
        return this.types.find((x: HrLeaveType) => x.id === id)?.name ?? id;
      },
      balances(this: Self) {
        return this.types.map((type: HrLeaveType) => {
          const b = leaveBalance(type, this.own(), { year: this.leaveYear(), asOf: this.today(), carriedOver: this.carriedOver[type.id], calendar: this.calendar });
          const limited = type.limited !== false;
          return {
            id: type.id,
            name: type.name,
            limited,
            available: this.num(b.available),
            used: this.num(b.used),
            pending: this.num(b.pending),
            entitled: this.num(b.entitled),
            taken: this.t("daysTaken", { n: this.num(b.used) }),
            pct: b.entitled ? Math.min(100, Math.round(((b.used + b.pending) / b.entitled) * 100)) : 0,
            tone: b.remaining <= 0 ? "danger" : "default",
            accrues: (type.accrual ?? "upfront") === "monthly",
            carry: type.carryOverMax ? this.t("carry", { n: this.num(type.carryOverMax) }) : "",
          };
        });
      },

      // Request dialog
      openRequest(this: Self, typeId?: string) {
        this.req = { open: true, typeId: typeId ?? this.types[0]?.id ?? "", start: null, end: null, halfStart: false, halfEnd: false, reason: "", busy: false, error: null };
      },
      reqType(this: Self): HrLeaveType | undefined {
        return this.types.find((x: HrLeaveType) => x.id === this.req.typeId);
      },
      checked(this: Self) {
        const type = this.reqType();
        const r = this.req;
        if (!type || !r.start || !r.end) return null;
        return checkLeaveRequest(type, { start: r.start, end: r.end, halfStart: r.halfStart, halfEnd: r.halfEnd }, this.own(), {
          year: this.leaveYear(),
          asOf: this.today(),
          carriedOver: this.carriedOver[type.id],
          calendar: this.calendar,
        });
      },
      problem(this: Self) {
        return this.checked()?.problem ?? null;
      },
      shownProblem(this: Self) {
        const p = this.problem();
        return this.req.error ?? (p ? this.t(`problems.${p}`) : null);
      },
      daysOk(this: Self) {
        return this.checked() !== null && this.problem() === null;
      },
      daysText(this: Self) {
        const c = this.checked();
        return c ? this.t("workingDays", { n: this.num(c.days) }) : "";
      },
      hasLeft(this: Self) {
        return this.daysOk() && this.reqType()?.limited !== false;
      },
      leftText(this: Self) {
        const c = this.checked();
        return c ? this.t("afterRequest", { n: this.num(c.balance.available - c.days) }) : "";
      },
      showHalfEnd(this: Self) {
        return Boolean(this.req.start) && Boolean(this.req.end) && this.req.start !== this.req.end;
      },
      invalidRange(this: Self) {
        const p = this.problem();
        return p === "range" || p === "overlap";
      },
      async submitRequest(this: Self) {
        const r = this.req;
        if (r.busy) return;
        const type = this.reqType();
        const checked = this.checked();
        if (!type || !r.start || !r.end || !checked) {
          r.error = this.t("problems.missing");
          return;
        }
        if (checked.problem) {
          r.error = this.t(`problems.${checked.problem}`);
          return;
        }
        r.busy = true;
        r.error = null;
        const input = { typeId: r.typeId, start: r.start, end: r.end, halfStart: r.halfStart, halfEnd: r.halfEnd, reason: r.reason.trim(), days: checked.days };
        const error = await this.ask("hr-leave-request", { input });
        r.busy = false;
        if (error) {
          r.error = error;
          return;
        }
        this.requests = [...this.requests, { id: `new-${++counter}`, employee: this.employee ?? "", typeId: input.typeId, start: input.start, end: input.end, halfStart: input.halfStart, halfEnd: input.halfEnd, reason: input.reason, status: "pending" }];
        this.syncRows();
        this.emit("hr-requests-change", this.clone(this.requests));
        r.open = false;
      },

      // Request list
      daysOf(this: Self, r: HrLeaveRequest) {
        return leaveDays(r.start, r.end, this.calendar, { start: r.halfStart, end: r.halfEnd });
      },
      pendingCount(this: Self) {
        return this.requests.filter((r: HrLeaveRequest) => r.status === "pending").length;
      },
      async decide(this: Self, request: HrLeaveRequest, decision: "approved" | "rejected", note?: string) {
        this.listBusy = request.id;
        this.listError = null;
        const error = await this.ask("hr-leave-decide", { request: this.clone(request), decision, note });
        this.listBusy = null;
        if (error) {
          this.listError = error;
          return false;
        }
        this.requests = this.requests.map((r: HrLeaveRequest) => (r.id === request.id ? { ...r, status: decision, ...(note ? { note } : {}) } : r));
        this.syncRows();
        this.emit("hr-requests-change", this.clone(this.requests));
        return true;
      },
      async withdraw(this: Self, request: HrLeaveRequest) {
        this.listBusy = request.id;
        this.listError = null;
        const error = await this.ask("hr-leave-withdraw", { request: this.clone(request) });
        this.listBusy = null;
        if (error) {
          this.listError = error;
          return false;
        }
        this.requests = this.requests.map((r: HrLeaveRequest) => (r.id === request.id ? { ...r, status: "cancelled" } : r));
        this.syncRows();
        this.emit("hr-requests-change", this.clone(this.requests));
        return true;
      },
      openReject(this: Self, request: HrLeaveRequest) {
        this.rej = { open: true, request, note: "" };
      },
      rejectDescription(this: Self) {
        return this.t("rejectDescription", { who: this.rej.request?.employee ?? "" });
      },
      async submitReject(this: Self) {
        const target = this.rej.request;
        if (!target || this.listBusy) return;
        const ok = await this.decide(target, "rejected", this.rej.note.trim() || undefined);
        if (ok) this.rej.open = false;
      },
      /** Row action from the table's menu. An action that does not fit the row's status or the mode does nothing. */
      listAction(this: Self, detail: { action: string; row: Row }) {
        const request = this.requests.find((r: HrLeaveRequest) => r.id === String(detail.row.id));
        if (!request || request.status !== "pending") return;
        if (this.mode === "manager" && detail.action === "approve") void this.decide(request, "approved");
        else if (this.mode === "manager" && detail.action === "reject") this.openReject(request);
        else if (this.mode === "self" && detail.action === "withdraw") void this.withdraw(request);
      },

      // Payroll
      periodLabel(this: Self, period: string) {
        try {
          return new Intl.DateTimeFormat(`${this.locale()}-u-nu-latn`, { month: "long", year: "numeric", timeZone: "UTC" }).format(parseDay(`${period}-01`));
        } catch {
          return period;
        }
      },
      runById(this: Self, id: string | null): HrPayrollRun | undefined {
        return this.runs.find((r: HrPayrollRun) => r.id === id);
      },
      openRun(this: Self, id: string) {
        this.runDlg = { open: true, id, busy: false, error: null };
      },
      openRunStatus(this: Self) {
        return this.runById(this.runDlg.id)?.status ?? "draft";
      },
      runStatusText(this: Self) {
        return this.t(`runStatuses.${this.openRunStatus()}`);
      },
      runTitle(this: Self) {
        const run = this.runById(this.runDlg.id);
        return run ? this.t("runTitle", { period: this.periodLabel(run.period) }) : "";
      },
      runDescription(this: Self) {
        const run = this.runById(this.runDlg.id);
        return run ? this.t("runDescription", { count: this.num(run.lines.length) }) : "";
      },
      totals(this: Self) {
        const run = this.runById(this.runDlg.id);
        const t = payrollTotals(run?.lines ?? []);
        return { gross: this.fmt(t.gross), deductions: this.fmt(t.deductions), net: this.fmt(t.net) };
      },
      async step(this: Self, event: "hr-payroll-approve" | "hr-payroll-paid", id: string, from: string, to: HrPayrollRun["status"]) {
        const run = this.runById(id);
        if (!run || run.status !== from || this.runDlg.busy) return;
        this.runDlg.busy = true;
        this.runDlg.error = null;
        const error = await this.ask(event, { run: this.clone(run) });
        this.runDlg.busy = false;
        if (error) {
          this.runDlg.error = error;
          return;
        }
        this.runs = this.runs.map((r: HrPayrollRun) => (r.id === id ? { ...r, status: to } : r));
        this.syncRows();
        this.emit("hr-runs-change", this.clone(this.runs));
      },
      approveRun(this: Self, id?: string) {
        return this.step("hr-payroll-approve", id ?? this.runDlg.id ?? "", "draft", "approved");
      },
      payRun(this: Self, id?: string) {
        return this.step("hr-payroll-paid", id ?? this.runDlg.id ?? "", "approved", "paid");
      },
      runAction(this: Self, detail: { action: string; row: Row }) {
        const id = String(detail.row.id);
        if (detail.action === "view") {
          this.openRun(id);
          return;
        }
        // Menu actions work without the dialog, so their message shows under the table as well.
        if (detail.action === "approve") void this.approveRun(id);
        else if (detail.action === "paid") void this.payRun(id);
      },
      rowOpen(this: Self, detail: { row: Row }) {
        this.openRun(String(detail.row.id));
      },

      // Table rows (the Blade data tables take these through x-model)
      syncRows(this: Self) {
        this.reqRows = [...this.requests]
          .sort((a: HrLeaveRequest, b: HrLeaveRequest) => (a.start < b.start ? 1 : a.start > b.start ? -1 : 0))
          .map((r: HrLeaveRequest) => ({ id: r.id, employee: r.employee ?? "", type: r.typeId, start: r.start, end: r.end, days: this.daysOf(r), status: r.status }));
        this.runRows = [...this.runs]
          .sort((a: HrPayrollRun, b: HrPayrollRun) => (a.period < b.period ? 1 : a.period > b.period ? -1 : 0))
          .map((r: HrPayrollRun) => {
            const t = payrollTotals(r.lines);
            return { id: r.id, period: this.periodLabel(r.period), employees: t.count, gross: this.major(t.gross), deductions: this.major(t.deductions), net: this.major(t.net), payDate: r.payDate ?? "", status: r.status };
          });
        const open = this.runById(this.runDlg.id);
        this.lineRows = (open?.lines ?? []).map((l: HrPayrollLine) => ({
          id: l.id,
          employee: l.employee,
          days: l.workingDays ? (l.workedDays ?? l.workingDays) : "",
          basic: this.major(l.basic),
          allowances: this.major((l.allowances ?? 0) + (l.additions ?? 0)),
          deductions: this.major(l.deductions ?? 0),
          net: this.major(payrollNet(l)),
        }));
      },
    };
  });
};
