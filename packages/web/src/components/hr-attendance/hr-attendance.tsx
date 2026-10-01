"use client";

import { Check, CircleCheck, CircleX, Clock, Coffee, LogIn, LogOut, MapPin, Plus, Undo2, Wallet, X } from "lucide-react";
import { type ComponentProps, useEffect, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { DataTable, type DataTableColumn, DataTableFacetFilter, DataTableSearch, DataTableToolbar, useDataTable } from "../data-table";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Textarea } from "../field";
import { DateTime, formatNumber, Num } from "../numeric";
import { Progress } from "../progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import {
  attendanceState,
  checkLeaveRequest,
  type LeaveBalance,
  type LeaveCalendar,
  leaveBalance,
  leaveDays,
  type LeaveProblem,
  type LeaveRequestLike,
  type LeaveStatus,
  attendanceLateMinutes,
  type LeaveTypeLike,
  parseDay,
  payrollGross,
  payrollNet,
  type PayrollLineLike,
  payrollTotals,
  type PunchLike,
  todayKey,
  attendanceMinutes,
} from "./hr-math";
import { useCurrency } from "../../provider/nasaq-provider";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    attendance: "Attendance",
    today: "Today",
    clockedOut: "Clocked out",
    clockedIn: "Working",
    onBreak: "On break",
    since: (time: string) => `Since ${time}`,
    workedToday: "Worked today",
    shift: (start: string, end: string) => `Shift ${start} to ${end}`,
    clockIn: "Clock in",
    clockOut: "Clock out",
    startBreak: "Start break",
    endBreak: "End break",
    late: (min: string) => `Clocked in ${min} late`,
    onTime: "On time",
    noPunches: "No punches yet today.",
    punchIn: "Clocked in",
    punchOut: "Clocked out",
    punchBreakStart: "Break started",
    punchBreakEnd: "Break ended",
    punches: "Today's punches",
    failed: "That did not go through. Try again.",
    hoursShort: "h",
    minutesShort: "m",
    balances: "Leave balances",
    remaining: "days left",
    unlimited: "No limit",
    daysTaken: (n: string) => `${n} taken`,
    entitled: "Entitled",
    used: "Used",
    pendingDays: "Pending",
    available: "Available now",
    accrues: "Earned monthly",
    carry: (n: string) => `Up to ${n} carry over`,
    requestLeave: "Request leave",
    requestTitle: "Request leave",
    requestDescription: "Pick the type and dates. Weekends and public holidays are not counted.",
    leaveType: "Leave type",
    from: "From",
    to: "To",
    halfFirst: "Half day on the first day",
    halfLast: "Half day on the last day",
    reason: "Reason",
    reasonHint: "Optional. Your manager sees this.",
    workingDays: (n: string) => `${n} working days`,
    afterRequest: (n: string) => `${n} left after this request`,
    submit: "Send request",
    cancel: "Cancel",
    problems: {
      range: "The end date is before the start date.",
      none: "These dates have no working days.",
      overlap: "You already have leave on some of these days.",
      balance: "You do not have enough days available for this.",
      missing: "Pick both dates.",
    },
    leaveRequests: "Leave requests",
    employee: "Employee",
    type: "Type",
    dates: "Dates",
    days: "Days",
    status: "Status",
    search: "Search requests",
    approve: "Approve",
    reject: "Reject",
    withdraw: "Withdraw",
    statuses: { pending: "Pending", approved: "Approved", rejected: "Rejected", cancelled: "Withdrawn" },
    rejectTitle: "Reject this request?",
    rejectDescription: (who: string) => `${who} will see your note.`,
    note: "Note",
    noteHint: "Say why, so they can plan.",
    confirmReject: "Reject request",
    emptyRequests: "No leave requests",
    emptyRequestsDescription: "Requests will show here.",
    actionsFor: (name: string) => `Actions for ${name}`,
    payroll: "Payroll runs",
    period: "Period",
    employees: "Employees",
    gross: "Gross",
    deductions: "Deductions",
    net: "Net pay",
    payDate: "Pay date",
    runStatuses: { draft: "Draft", approved: "Approved", paid: "Paid" },
    approveRun: "Approve run",
    markPaid: "Mark as paid",
    viewRun: "View details",
    runTitle: (period: string) => `Payroll for ${period}`,
    runDescription: (count: string) => `${count} employees. Amounts are what each person is owed for the period.`,
    basic: "Basic",
    allowances: "Allowances",
    additions: "Additions",
    days2: "Days worked",
    total: "Total",
    emptyRuns: "No payroll runs yet",
    emptyRunsDescription: "Runs appear here once you start one.",
    close: "Close",
    runsLabel: "Payroll runs",
    linesLabel: "Payroll lines",
  },
  ar: {
    attendance: "الحضور",
    today: "اليوم",
    clockedOut: "تم تسجيل الانصراف",
    clockedIn: "على رأس العمل",
    onBreak: "في استراحة",
    since: (time: string) => `منذ ${time}`,
    workedToday: "ساعات العمل اليوم",
    shift: (start: string, end: string) => `الدوام من ${start} إلى ${end}`,
    clockIn: "تسجيل حضور",
    clockOut: "تسجيل انصراف",
    startBreak: "بدء استراحة",
    endBreak: "إنهاء الاستراحة",
    late: (min: string) => `سُجّل الحضور بتأخر ${min}`,
    onTime: "في الموعد",
    noPunches: "لا توجد بصمات اليوم بعد.",
    punchIn: "تسجيل حضور",
    punchOut: "تسجيل انصراف",
    punchBreakStart: "بدء استراحة",
    punchBreakEnd: "انتهاء استراحة",
    punches: "بصمات اليوم",
    failed: "لم تتم العملية. حاول مرة أخرى.",
    hoursShort: "س",
    minutesShort: "د",
    balances: "أرصدة الإجازات",
    remaining: "يومًا متبقيًا",
    unlimited: "بلا حد",
    daysTaken: (n: string) => `${n} مستخدمة`,
    entitled: "الاستحقاق",
    used: "المستخدم",
    pendingDays: "قيد الموافقة",
    available: "المتاح الآن",
    accrues: "يُكتسب شهريًا",
    carry: (n: string) => `يُرحّل حتى ${n}`,
    requestLeave: "طلب إجازة",
    requestTitle: "طلب إجازة",
    requestDescription: "اختر النوع والتواريخ. لا تُحتسب العطلات الأسبوعية والرسمية.",
    leaveType: "نوع الإجازة",
    from: "من",
    to: "إلى",
    halfFirst: "نصف يوم في اليوم الأول",
    halfLast: "نصف يوم في اليوم الأخير",
    reason: "السبب",
    reasonHint: "اختياري. يراه مديرك.",
    workingDays: (n: string) => `${n} أيام عمل`,
    afterRequest: (n: string) => `يتبقى ${n} بعد هذا الطلب`,
    submit: "إرسال الطلب",
    cancel: "إلغاء",
    problems: {
      range: "تاريخ النهاية قبل تاريخ البداية.",
      none: "لا توجد أيام عمل ضمن هذه التواريخ.",
      overlap: "لديك إجازة في بعض هذه الأيام.",
      balance: "رصيدك المتاح لا يكفي لهذا الطلب.",
      missing: "اختر التاريخين.",
    },
    leaveRequests: "طلبات الإجازة",
    employee: "الموظف",
    type: "النوع",
    dates: "التواريخ",
    days: "الأيام",
    status: "الحالة",
    search: "ابحث في الطلبات",
    approve: "موافقة",
    reject: "رفض",
    withdraw: "سحب الطلب",
    statuses: { pending: "قيد الموافقة", approved: "موافق عليها", rejected: "مرفوضة", cancelled: "مسحوبة" },
    rejectTitle: "رفض هذا الطلب؟",
    rejectDescription: (who: string) => `سيرى ${who} ملاحظتك.`,
    note: "ملاحظة",
    noteHint: "اذكر السبب ليتمكن من التخطيط.",
    confirmReject: "رفض الطلب",
    emptyRequests: "لا توجد طلبات إجازة",
    emptyRequestsDescription: "ستظهر الطلبات هنا.",
    actionsFor: (name: string) => `إجراءات ${name}`,
    payroll: "مسيرات الرواتب",
    period: "الفترة",
    employees: "الموظفون",
    gross: "الإجمالي",
    deductions: "الخصومات",
    net: "صافي الراتب",
    payDate: "تاريخ الصرف",
    runStatuses: { draft: "مسودة", approved: "معتمدة", paid: "مصروفة" },
    approveRun: "اعتماد المسيرة",
    markPaid: "تحديد كمصروفة",
    viewRun: "عرض التفاصيل",
    runTitle: (period: string) => `رواتب ${period}`,
    runDescription: (count: string) => `${count} موظفين. المبالغ هي المستحق لكل شخص عن الفترة.`,
    basic: "الأساسي",
    allowances: "البدلات",
    additions: "الإضافات",
    days2: "أيام العمل",
    total: "الإجمالي",
    emptyRuns: "لا توجد مسيرات رواتب بعد",
    emptyRunsDescription: "تظهر المسيرات هنا عند بدء أول واحدة.",
    close: "إغلاق",
    runsLabel: "مسيرات الرواتب",
    linesLabel: "بنود الرواتب",
  },
};

type Strings = typeof STRINGS.en;
export type HrAttendanceLabels = Partial<Omit<Strings, "problems" | "statuses" | "runStatuses">> & {
  problems?: Partial<Strings["problems"]>;
  statuses?: Partial<Strings["statuses"]>;
  runStatuses?: Partial<Strings["runStatuses"]>;
};

function useStrings(labels?: HrAttendanceLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  const base = STRINGS[ar ? "ar" : "en"];
  const t: Strings = {
    ...base,
    ...labels,
    problems: { ...base.problems, ...labels?.problems },
    statuses: { ...base.statuses, ...labels?.statuses },
    runStatuses: { ...base.runStatuses, ...labels?.runStatuses },
  } as Strings;
  return { t, ar, locale, n: (value: number) => formatNumber(value, locale, { maximumFractionDigits: 1 }) };
}

type Result = void | { error?: string };

const fail = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);

/** Whole minutes as "7h 05m" / "7 س 05 د". */
function useDuration(t: Strings, locale: string) {
  return (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${formatNumber(h, locale)}${t.hoursShort} ${formatNumber(m, locale, { minimumIntegerDigits: 2 })}${t.minutesShort}`;
  };
}

const money = (minor: number, currency: string) => minorToMajor(minor, currency);

/* ------------------------------------------------------------------ AttendanceMarker */

export type AttendancePunchKind = PunchLike["kind"];

export interface AttendancePunch {
  id: string;
  kind: AttendancePunchKind;
  at: Date | number;
  /** Where the person was, when known: "Riyadh office". */
  place?: string;
}

const toMs = (v: Date | number) => (v instanceof Date ? v.getTime() : v);

export interface AttendanceMarkerProps extends Omit<ComponentProps<typeof Card>, "children"> {
  /** Today's punches, in any order. */
  punches: readonly AttendancePunch[];
  /** The shift, used to say whether the first clock-in was late. `start` and `end` are "09:00". */
  shift?: { start: string; end: string; graceMinutes?: number };
  /** Where the person is now, shown under the clock: "Riyadh HQ". */
  place?: string;
  /** Records a punch. Resolve `{ error }` or reject to show the message. The component never stores punches. */
  onPunch: (kind: AttendancePunchKind) => Promise<Result>;
  /** Show Start break and End break. Default true. */
  breaks?: boolean;
  /** The current time in ms. Default: the real clock, ticking every 15 seconds. */
  now?: number;
  loading?: boolean;
  labels?: HrAttendanceLabels;
}

const PUNCH_ICON: Record<AttendancePunchKind, typeof LogIn> = { in: LogIn, out: LogOut, "break-start": Coffee, "break-end": Clock };

/**
 * A clock-in card: the state (working, on break, clocked out), hours worked today, the punch buttons that fit that
 * state and today's punch list. Lateness is judged from the first clock-in against the shift.
 */
export function AttendanceMarker({ punches, shift, place, onPunch, breaks = true, now: nowProp, loading = false, labels, className, ...props }: AttendanceMarkerProps) {
  const { t, locale } = useStrings(labels);
  const duration = useDuration(t, locale);
  const [tick, setTick] = useState(() => Date.now());
  const [busy, setBusy] = useState<AttendancePunchKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (nowProp !== undefined) return;
    const id = window.setInterval(() => setTick(Date.now()), 15_000);
    return () => window.clearInterval(id);
  }, [nowProp]);
  const now = nowProp ?? tick;
  const sorted = useMemo(() => [...punches].map((p) => ({ ...p, ms: toMs(p.at) })).sort((a, b) => a.ms - b.ms), [punches]);
  const like: PunchLike[] = sorted.map((p) => ({ kind: p.kind, at: p.ms }));
  const state = attendanceState(like);
  const worked = attendanceMinutes(like, now);
  const firstIn = sorted.find((p) => p.kind === "in");
  const late = firstIn && shift ? attendanceLateMinutes(firstIn.ms, shift.start, shift.graceMinutes ?? 0) : 0;
  const label: Record<AttendancePunchKind, string> = { in: t.punchIn, out: t.punchOut, "break-start": t.punchBreakStart, "break-end": t.punchBreakEnd };
  const tone: StatusTone = state === "in" ? "success" : state === "break" ? "warning" : "neutral";
  const stateLabel = state === "in" ? t.clockedIn : state === "break" ? t.onBreak : t.clockedOut;

  const punch = async (kind: AttendancePunchKind) => {
    if (busy) return;
    setBusy(kind);
    setError(null);
    try {
      const result = await onPunch(kind);
      if (result?.error) setError(result.error);
    } catch (e) {
      setError(fail(e, t.failed));
    } finally {
      setBusy(null);
    }
  };

  const lastIn = [...sorted].reverse().find((p) => p.kind === "in" || p.kind === "break-end");

  return (
    <Card data-slot="attendance-marker" data-state={state} aria-busy={loading || undefined} className={cn("gap-4 px-0", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2" className="flex items-center gap-2 text-muted-foreground">
          <Clock aria-hidden className="size-4" />
          {t.attendance}
        </CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Status tone={tone}>{stateLabel}</Status>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : (
          <p className="text-h1 font-semibold tracking-tight text-foreground" aria-live="off">
            <bdi className="tabular-nums" dir="ltr">
              {duration(worked)}
            </bdi>
          </p>
        )}
        <p className="text-body-sm text-muted-foreground">
          {t.workedToday}
          {state !== "out" && lastIn ? (
            <>
              {" · "}
              {t.since("")}
              <DateTime value={lastIn.ms} format={{ timeStyle: "short" }} />
            </>
          ) : null}
        </p>
        {shift ? (
          <p className="text-caption text-muted-foreground">
            <bdi dir="ltr">{t.shift(shift.start, shift.end)}</bdi>
          </p>
        ) : null}
        {place ? (
          <p className="flex items-center gap-1 text-caption text-muted-foreground">
            <MapPin aria-hidden className="size-3" />
            {place}
          </p>
        ) : null}
        {firstIn && shift ? (
          <p className={cn("text-caption", late ? "text-nq-warning-text" : "text-nq-success-text")}>{late ? t.late(`${formatNumber(late, locale)}${t.minutesShort}`) : t.onTime}</p>
        ) : null}
      </CardContent>
      <CardContent className="flex flex-wrap gap-2">
        {state === "out" ? (
          <Button variant="primary" loading={busy === "in"} disabled={loading || Boolean(busy)} onClick={() => void punch("in")}>
            <LogIn aria-hidden />
            {t.clockIn}
          </Button>
        ) : (
          <>
            {breaks ? (
              state === "in" ? (
                <Button loading={busy === "break-start"} disabled={Boolean(busy)} onClick={() => void punch("break-start")}>
                  <Coffee aria-hidden />
                  {t.startBreak}
                </Button>
              ) : (
                <Button variant="primary" loading={busy === "break-end"} disabled={Boolean(busy)} onClick={() => void punch("break-end")}>
                  <Undo2 aria-hidden className="rtl:-scale-x-100" />
                  {t.endBreak}
                </Button>
              )
            ) : null}
            <Button loading={busy === "out"} disabled={Boolean(busy)} onClick={() => void punch("out")}>
              <LogOut aria-hidden />
              {t.clockOut}
            </Button>
          </>
        )}
      </CardContent>
      {error ? (
        <CardContent>
          <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
            <CircleX aria-hidden className="size-4" />
            {error}
          </p>
        </CardContent>
      ) : null}
      <CardContent className="flex flex-col gap-2">
        <h3 className="text-caption font-medium text-muted-foreground">{t.punches}</h3>
        {sorted.length === 0 ? (
          <p className="text-body-sm text-muted-foreground">{t.noPunches}</p>
        ) : (
          <ol className="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
            {sorted.map((p) => {
              const Glyph = PUNCH_ICON[p.kind];
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2 text-body-sm">
                  <Glyph aria-hidden className="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
                  <span className="min-w-0 flex-1 truncate text-foreground">{label[p.kind]}</span>
                  {p.place ? <span className="hidden truncate text-caption text-muted-foreground sm:inline">{p.place}</span> : null}
                  <DateTime value={p.ms} format={{ timeStyle: "short" }} className="text-muted-foreground" />
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ leave types + balances */

export interface LeaveType extends LeaveTypeLike {
  name: string;
}

export interface LeaveBalancesProps extends Omit<ComponentProps<"section">, "children"> {
  types: readonly LeaveType[];
  /** The person's requests. Approved ones count as used, pending ones as held. */
  requests: readonly LeaveRequestLike[];
  /** The leave year. Default: the year of `asOf`. */
  year?: number;
  /** The day the balances are worked out for, "2026-09-30". Default today. */
  asOf?: string;
  /** Days carried in from last year, by type id. */
  carriedOver?: Readonly<Record<string, number>>;
  calendar?: LeaveCalendar;
  /** Shows a Request leave button on each card. */
  onRequest?: (typeId: string) => void;
  loading?: boolean;
  labels?: HrAttendanceLabels;
}

/** One card per leave type: days left, a bar of used and pending against the entitlement, and how the type accrues. */
export function LeaveBalances({ types, requests, year, asOf, carriedOver, calendar, onRequest, loading = false, labels, className, ...props }: LeaveBalancesProps) {
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const today = asOf ?? todayKey();
  const y = year ?? Number(today.slice(0, 4));
  return (
    <section data-slot="leave-balances" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 id={titleId} className="text-h3 text-foreground">
        {t.balances}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {types.map((type) => {
          const b: LeaveBalance = leaveBalance(type, requests, { year: y, asOf: today, carriedOver: carriedOver?.[type.id], calendar });
          const limited = type.limited !== false;
          return (
            <Card key={type.id} data-slot="leave-balance" data-type={type.id} className="gap-3 px-0">
              <CardHeader>
                <CardTitle as="h3" className="text-body font-medium">
                  {type.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : limited ? (
                  <p className="flex items-baseline gap-1.5 text-foreground">
                    <span className="text-h2 font-semibold tabular-nums">{n(b.available)}</span>
                    <span className="text-body-sm text-muted-foreground">{t.remaining}</span>
                  </p>
                ) : (
                  <p className="flex items-baseline gap-1.5 text-foreground">
                    <span className="text-h3 font-semibold">{t.unlimited}</span>
                    <span className="text-body-sm text-muted-foreground">{t.daysTaken(n(b.used))}</span>
                  </p>
                )}
                {limited ? (
                  <Progress
                    size="sm"
                    aria-label={`${type.name}: ${t.used}`}
                    value={b.entitled ? Math.min(100, Math.round(((b.used + b.pending) / b.entitled) * 100)) : 0}
                    tone={b.remaining <= 0 ? "danger" : "default"}
                    showValue={false}
                  />
                ) : null}
                {limited ? (
                  <dl className="grid grid-cols-3 gap-2 text-caption">
                    <div>
                      <dt className="text-muted-foreground">{t.entitled}</dt>
                      <dd className="tabular-nums text-foreground">{n(b.entitled)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.used}</dt>
                      <dd className="tabular-nums text-foreground">{n(b.used)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">{t.pendingDays}</dt>
                      <dd className="tabular-nums text-foreground">{n(b.pending)}</dd>
                    </div>
                  </dl>
                ) : null}
                <p className="flex flex-wrap gap-x-2 text-caption text-muted-foreground">
                  {(type.accrual ?? "upfront") === "monthly" ? <span>{t.accrues}</span> : null}
                  {type.carryOverMax ? <span>{t.carry(n(type.carryOverMax))}</span> : null}
                </p>
              </CardContent>
              {onRequest ? (
                <CardContent>
                  <Button size="sm" onClick={() => onRequest(type.id)}>
                    <Plus aria-hidden />
                    {t.requestLeave}
                  </Button>
                </CardContent>
              ) : null}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ LeaveRequestDialog */

export interface LeaveRequestInput {
  typeId: string;
  /** "YYYY-MM-DD". */
  start: string;
  end: string;
  halfStart: boolean;
  halfEnd: boolean;
  reason: string;
  /** Working days the request counts for. */
  days: number;
}

export interface LeaveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  types: readonly LeaveType[];
  /** The person's existing requests, for the balance and the overlap check. */
  requests: readonly LeaveRequestLike[];
  defaultTypeId?: string;
  year?: number;
  asOf?: string;
  carriedOver?: Readonly<Record<string, number>>;
  calendar?: LeaveCalendar;
  /** Sends the request. Resolve `{ error }` or reject to keep the dialog open with the message. */
  onSubmit: (input: LeaveRequestInput) => Promise<Result>;
  labels?: HrAttendanceLabels;
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dateOf = (key: string | null) => (key ? new Date(parseDay(key).getUTCFullYear(), parseDay(key).getUTCMonth(), parseDay(key).getUTCDate()) : null);

/** A leave request form. It shows the working days the request costs and what is left, and refuses overlaps and overdrafts before sending. */
export function LeaveRequestDialog({ open, onOpenChange, types, requests, defaultTypeId, year, asOf, carriedOver, calendar, onSubmit, labels }: LeaveRequestDialogProps) {
  const { t, n } = useStrings(labels);
  const today = asOf ?? todayKey();
  const [typeId, setTypeId] = useState(defaultTypeId ?? types[0]?.id ?? "");
  const [start, setStart] = useState<string | null>(null);
  const [end, setEnd] = useState<string | null>(null);
  const [halfStart, setHalfStart] = useState(false);
  const [halfEnd, setHalfEnd] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTypeId(defaultTypeId ?? types[0]?.id ?? "");
      setStart(null);
      setEnd(null);
      setHalfStart(false);
      setHalfEnd(false);
      setReason("");
      setError(null);
    }
  }, [open, defaultTypeId, types]);

  const type = types.find((x) => x.id === typeId);
  const checked = type && start && end ? checkLeaveRequest(type, { start, end, halfStart, halfEnd }, requests, { year: year ?? Number(today.slice(0, 4)), asOf: today, carriedOver: carriedOver?.[type.id], calendar }) : null;
  const problem: LeaveProblem | "missing" = !start || !end ? null : (checked?.problem ?? null);
  const left = checked && type?.limited !== false ? checked.balance.available - checked.days : null;

  const submit = async () => {
    if (busy) return;
    if (!type || !start || !end || !checked) return setError(t.problems.missing);
    if (checked.problem) return setError(t.problems[checked.problem]);
    setBusy(true);
    setError(null);
    try {
      const result = await onSubmit({ typeId, start, end, halfStart, halfEnd, reason: reason.trim(), days: checked.days });
      if (result?.error) setError(result.error);
      else onOpenChange(false);
    } catch (e) {
      setError(fail(e, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const shown = error ?? (problem ? t.problems[problem] : null);

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
            <DialogTitle>{t.requestTitle}</DialogTitle>
            <DialogDescription>{t.requestDescription}</DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t.leaveType}</FieldLabel>
            <Select items={types.map((x) => ({ value: x.id, label: x.name }))} value={typeId} disabled={busy} onValueChange={(v) => v && setTypeId(String(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={problem === "range" || problem === "overlap"}>
              <FieldLabel>{t.from}</FieldLabel>
              <DatePicker
                aria-label={t.from}
                value={dateOf(start)}
                disabled={busy}
                onValueChange={(d) => {
                  const k = d ? keyOf(d) : null;
                  setStart(k);
                  if (k && (!end || end < k)) setEnd(k);
                  setError(null);
                }}
              />
            </Field>
            <Field invalid={problem === "range" || problem === "overlap"}>
              <FieldLabel>{t.to}</FieldLabel>
              <DatePicker
                aria-label={t.to}
                value={dateOf(end)}
                disabled={busy}
                min={dateOf(start) ?? undefined}
                onValueChange={(d) => {
                  setEnd(d ? keyOf(d) : null);
                  setError(null);
                }}
              />
            </Field>
          </div>
          <div className="grid gap-2">
            <label className="flex items-center justify-between gap-3 text-body-sm text-foreground">
              {t.halfFirst}
              <Switch checked={halfStart} onCheckedChange={setHalfStart} disabled={busy} />
            </label>
            {start && end && start !== end ? (
              <label className="flex items-center justify-between gap-3 text-body-sm text-foreground">
                {t.halfLast}
                <Switch checked={halfEnd} onCheckedChange={setHalfEnd} disabled={busy} />
              </label>
            ) : null}
          </div>
          <Field>
            <FieldLabel>{t.reason}</FieldLabel>
            <Textarea value={reason} disabled={busy} onChange={(e) => setReason(e.target.value)} />
            <FieldDescription>{t.reasonHint}</FieldDescription>
          </Field>
          {checked && !problem ? (
            <p className="flex flex-wrap items-center gap-x-2 text-body-sm text-foreground" aria-live="polite">
              <CircleCheck aria-hidden className="size-4 text-nq-success-text" />
              {t.workingDays(n(checked.days))}
              {left !== null ? <span className="text-muted-foreground">{t.afterRequest(n(left))}</span> : null}
            </p>
          ) : null}
          {shown ? (
            <FieldError match className="flex items-center gap-2" role="alert">
              <CircleX aria-hidden className="size-4" />
              {shown}
            </FieldError>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
            <Button type="submit" variant="primary" loading={busy} disabled={!type}>
              {t.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ LeaveRequestList */

export interface LeaveRequestRow extends LeaveRequestLike {
  id: string;
  employee: string;
  reason?: string;
  /** The manager's note on a rejection. */
  note?: string;
}

export interface LeaveRequestListProps extends Omit<ComponentProps<"section">, "children"> {
  requests: readonly LeaveRequestRow[];
  types: readonly LeaveType[];
  calendar?: LeaveCalendar;
  /** "manager" shows the employee column with Approve and Reject; "self" shows Withdraw. Default "manager". */
  mode?: "manager" | "self";
  /** Approves or rejects. `note` is set on a rejection. Resolve `{ error }` or reject to show the message. */
  onDecide?: (request: LeaveRequestRow, decision: "approved" | "rejected", note?: string) => Promise<Result>;
  /** Withdraws a pending request (self mode). */
  onWithdraw?: (request: LeaveRequestRow) => Promise<Result>;
  onNew?: () => void;
  loading?: boolean;
  labels?: HrAttendanceLabels;
}

const STATUS_TONE: Record<LeaveStatus, StatusTone> = { pending: "warning", approved: "success", rejected: "danger", cancelled: "neutral" };

/** Leave requests in a DataTable. Managers approve or reject (a rejection asks for a note); people withdraw their own pending ones. */
export function LeaveRequestList({ requests, types, calendar, mode = "manager", onDecide, onWithdraw, onNew, loading = false, labels, className, ...props }: LeaveRequestListProps) {
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const [rejecting, setRejecting] = useState<LeaveRequestRow | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const typeName = (id: string) => types.find((x) => x.id === id)?.name ?? id;
  const daysOf = (r: LeaveRequestRow) => leaveDays(r.start, r.end, calendar, { start: r.halfStart, end: r.halfEnd });

  const run = async (id: string, job: () => Promise<Result>) => {
    setBusy(id);
    setError(null);
    try {
      const result = await job();
      if (result?.error) {
        setError(result.error);
        return false;
      }
      return true;
    } catch (e) {
      setError(fail(e, t.failed));
      return false;
    } finally {
      setBusy(null);
    }
  };

  const columns: DataTableColumn<LeaveRequestRow>[] = [
    ...(mode === "manager" ? [{ id: "employee", header: t.employee, label: t.employee, cell: (r: LeaveRequestRow) => <span className="text-foreground">{r.employee}</span>, sortValue: (r: LeaveRequestRow) => r.employee, searchValue: (r: LeaveRequestRow) => r.employee }] : []),
    { id: "type", header: t.type, label: t.type, cell: (r) => <Badge variant="outline">{typeName(r.typeId)}</Badge>, sortValue: (r) => typeName(r.typeId), filterValue: (r) => r.typeId },
    {
      id: "dates",
      header: t.dates,
      label: t.dates,
      cell: (r) => (
        <span className="inline-flex flex-wrap items-baseline gap-x-1">
          <DateTime value={`${r.start}T00:00:00`} format={{ dateStyle: "medium" }} />
          {r.end !== r.start ? (
            <>
              <span aria-hidden className="text-muted-foreground">
                –
              </span>
              <DateTime value={`${r.end}T00:00:00`} format={{ dateStyle: "medium" }} />
            </>
          ) : null}
        </span>
      ),
      sortValue: (r) => r.start,
    },
    { id: "days", header: t.days, label: t.days, align: "end", cell: (r) => <Num value={daysOf(r)} format={{ maximumFractionDigits: 1 }} />, sortValue: daysOf },
    { id: "status", header: t.status, label: t.status, cell: (r) => <Status tone={STATUS_TONE[r.status]}>{t.statuses[r.status]}</Status>, sortValue: (r) => r.status, filterValue: (r) => r.status },
    ...(onDecide && mode === "manager"
      ? [
          {
            id: "decide",
            header: <span className="sr-only">{t.status}</span>,
            label: t.status,
            hideable: false,
            align: "end" as const,
            cell: (r: LeaveRequestRow) =>
              r.status === "pending" ? (
                <span className="inline-flex gap-1">
                  <Button size="icon-sm" variant="ghost" aria-label={`${t.approve}: ${r.employee}`} loading={busy === r.id} onClick={() => void run(r.id, () => onDecide(r, "approved"))}>
                    <Check aria-hidden />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={`${t.reject}: ${r.employee}`} disabled={busy === r.id} onClick={() => (setNote(""), setRejecting(r))}>
                    <X aria-hidden />
                  </Button>
                </span>
              ) : null,
          },
        ]
      : []),
  ];
  const table = useDataTable({ data: requests as LeaveRequestRow[], columns, getRowId: (r) => r.id, pageSize: 10, defaultSort: { id: "dates", direction: "desc" } });

  return (
    <section data-slot="leave-request-list" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={titleId} className="text-h3 text-foreground">
          {t.leaveRequests}
        </h2>
        {onNew ? (
          <Button variant="primary" onClick={onNew}>
            <Plus aria-hidden />
            {t.requestLeave}
          </Button>
        ) : null}
      </div>
      <DataTableToolbar>
        <DataTableSearch table={table} placeholder={t.search} />
        <DataTableFacetFilter table={table} column="status" title={t.status} options={(["pending", "approved", "rejected", "cancelled"] as const).map((s) => ({ value: s, label: t.statuses[s] }))} />
      </DataTableToolbar>
      {error ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {error}
        </p>
      ) : null}
      <DataTable
        table={table}
        label={t.leaveRequests}
        rowLabel={(r) => `${r.employee} ${r.start}`}
        loading={loading}
        rowActions={(r) => [
          ...(mode === "manager" && onDecide && r.status === "pending"
            ? [
                { id: "approve", label: t.approve, icon: Check, onSelect: () => void run(r.id, () => onDecide(r, "approved")) },
                { id: "reject", label: t.reject, icon: X, danger: true, onSelect: () => (setNote(""), setRejecting(r)) },
              ]
            : []),
          ...(mode === "self" && onWithdraw && r.status === "pending" ? [{ id: "withdraw", label: t.withdraw, icon: Undo2, onSelect: () => void run(r.id, () => onWithdraw(r)) }] : []),
        ]}
        empty={<EmptyState title={t.emptyRequests} description={t.emptyRequestsDescription} className="border-0" />}
      />
      <Dialog open={rejecting !== null} onOpenChange={(next) => !next && !busy && setRejecting(null)}>
        <DialogContent>
          <form
            className="grid gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              const target = rejecting;
              if (!target || !onDecide) return;
              void run(target.id, () => onDecide(target, "rejected", note.trim() || undefined)).then((ok) => ok && setRejecting(null));
            }}
          >
            <DialogHeader>
              <DialogTitle>{t.rejectTitle}</DialogTitle>
              <DialogDescription>{t.rejectDescription(rejecting?.employee ?? "")}</DialogDescription>
            </DialogHeader>
            <Field>
              <FieldLabel>{t.note}</FieldLabel>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
              <FieldDescription>{t.noteHint}</FieldDescription>
            </Field>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRejecting(null)}>
                {t.cancel}
              </Button>
              <Button type="submit" variant="danger" loading={busy !== null}>
                {t.confirmReject}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <span className="sr-only" aria-live="polite">
        {n(requests.filter((r) => r.status === "pending").length)}
      </span>
    </section>
  );
}

/* ------------------------------------------------------------------ PayrollRuns */

export type PayrollRunStatus = "draft" | "approved" | "paid";

export interface PayrollLine extends PayrollLineLike {
  id: string;
  employee: string;
  workedDays?: number;
  workingDays?: number;
}

export interface PayrollRun {
  id: string;
  /** "2026-09". */
  period: string;
  status: PayrollRunStatus;
  lines: readonly PayrollLine[];
  /** Day money leaves, "2026-09-28". */
  payDate?: string;
}

export interface PayrollRunsProps extends Omit<ComponentProps<"section">, "children"> {
  runs: readonly PayrollRun[];
  /** ISO 4217 code. Every amount is an integer in its minor units. */
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Moves a draft run to approved. Resolve `{ error }` or reject to show the message. */
  onApprove?: (run: PayrollRun) => Promise<Result>;
  /** Moves an approved run to paid. */
  onMarkPaid?: (run: PayrollRun) => Promise<Result>;
  loading?: boolean;
  labels?: HrAttendanceLabels;
}

const RUN_TONE: Record<PayrollRunStatus, StatusTone> = { draft: "neutral", approved: "info", paid: "success" };

/** Payroll runs with gross, deductions and net computed from their lines, and a detail dialog per run with approve and paid steps. */
export function PayrollRuns({ runs, currency: currencyProp, onApprove, onMarkPaid, loading = false, labels, className, ...props }: PayrollRunsProps) {
  const currency = useCurrency(currencyProp);
  const { t, locale, n } = useStrings(labels);
  const titleId = useId();
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = runs.find((r) => r.id === openId) ?? null;
  const fmt = (minor: number, signDisplay?: "never") => <Num value={money(minor, currency)} format={{ style: "currency", currency, signDisplay }} />;
  const periodLabel = (period: string) => new Intl.DateTimeFormat(locale, { month: "long", year: "numeric", timeZone: "UTC", numberingSystem: "latn" }).format(parseDay(`${period}-01`));

  const columns: DataTableColumn<PayrollRun>[] = [
    { id: "period", header: t.period, label: t.period, cell: (r) => <span className="text-foreground">{periodLabel(r.period)}</span>, sortValue: (r) => r.period },
    { id: "employees", header: t.employees, label: t.employees, align: "end", cell: (r) => <Num value={r.lines.length} />, sortValue: (r) => r.lines.length },
    { id: "gross", header: t.gross, label: t.gross, align: "end", cell: (r) => fmt(payrollTotals(r.lines).gross), sortValue: (r) => payrollTotals(r.lines).gross },
    { id: "deductions", header: t.deductions, label: t.deductions, align: "end", cell: (r) => fmt(payrollTotals(r.lines).deductions), sortValue: (r) => payrollTotals(r.lines).deductions, defaultHidden: true },
    { id: "net", header: t.net, label: t.net, align: "end", cell: (r) => <span className="font-medium text-foreground">{fmt(payrollTotals(r.lines).net)}</span>, sortValue: (r) => payrollTotals(r.lines).net },
    { id: "payDate", header: t.payDate, label: t.payDate, cell: (r) => (r.payDate ? <DateTime value={`${r.payDate}T00:00:00`} /> : "–"), sortValue: (r) => r.payDate ?? null },
    { id: "status", header: t.status, label: t.status, cell: (r) => <Status tone={RUN_TONE[r.status]}>{t.runStatuses[r.status]}</Status>, sortValue: (r) => r.status, filterValue: (r) => r.status },
  ];
  const table = useDataTable({ data: runs as PayrollRun[], columns, getRowId: (r) => r.id, defaultSort: { id: "period", direction: "desc" } });

  const step = async (job: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    try {
      const result = await job();
      if (result?.error) setError(result.error);
    } catch (e) {
      setError(fail(e, t.failed));
    } finally {
      setBusy(false);
    }
  };

  const lineColumns: DataTableColumn<PayrollLine>[] = [
    { id: "employee", header: t.employee, label: t.employee, cell: (l) => <span className="text-foreground">{l.employee}</span>, sortValue: (l) => l.employee },
    { id: "days", header: t.days2, label: t.days2, align: "end", cell: (l) => (l.workingDays ? <Num value={l.workedDays ?? l.workingDays} /> : "–"), defaultHidden: true },
    { id: "basic", header: t.basic, label: t.basic, align: "end", cell: (l) => fmt(l.basic), sortValue: (l) => l.basic },
    { id: "allowances", header: t.allowances, label: t.allowances, align: "end", cell: (l) => fmt((l.allowances ?? 0) + (l.additions ?? 0)), sortValue: (l) => (l.allowances ?? 0) + (l.additions ?? 0) },
    { id: "deductions", header: t.deductions, label: t.deductions, align: "end", cell: (l) => fmt(l.deductions ?? 0), sortValue: (l) => l.deductions ?? 0 },
    { id: "net", header: t.net, label: t.net, align: "end", cell: (l) => <span className="font-medium text-foreground">{fmt(payrollNet(l))}</span>, sortValue: payrollNet },
  ];
  const lineTable = useDataTable({ data: (open?.lines ?? []) as PayrollLine[], columns: lineColumns, getRowId: (l) => l.id, defaultSort: { id: "employee", direction: "asc" } });
  const totals = open ? payrollTotals(open.lines) : null;

  return (
    <section data-slot="payroll-runs" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <h2 id={titleId} className="flex items-center gap-2 text-h3 text-foreground">
        <Wallet aria-hidden className="size-4 text-muted-foreground" />
        {t.payroll}
      </h2>
      <DataTable
        table={table}
        label={t.runsLabel}
        rowLabel={(r) => periodLabel(r.period)}
        loading={loading}
        onRowClick={(r) => (setError(null), setOpenId(r.id))}
        rowActions={(r) => [
          { id: "view", label: t.viewRun, onSelect: () => (setError(null), setOpenId(r.id)) },
          ...(onApprove && r.status === "draft" ? [{ id: "approve", label: t.approveRun, icon: Check, group: "step", onSelect: () => void step(() => onApprove(r)) }] : []),
          ...(onMarkPaid && r.status === "approved" ? [{ id: "paid", label: t.markPaid, icon: CircleCheck, group: "step", onSelect: () => void step(() => onMarkPaid(r)) }] : []),
        ]}
        empty={<EmptyState icon={Wallet} title={t.emptyRuns} description={t.emptyRunsDescription} className="border-0" />}
      />
      <Dialog open={open !== null} onOpenChange={(next) => !next && !busy && setOpenId(null)}>
        <DialogContent className="max-w-3xl">
          {open && totals ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  {t.runTitle(periodLabel(open.period))}
                  <Status tone={RUN_TONE[open.status]} className="text-body-sm font-normal">
                    {t.runStatuses[open.status]}
                  </Status>
                </DialogTitle>
                <DialogDescription>{t.runDescription(n(open.lines.length))}</DialogDescription>
              </DialogHeader>
              <DataTable table={lineTable} label={t.linesLabel} rowLabel={(l) => l.employee} />
              <dl className="grid grid-cols-3 gap-3 rounded-card bg-nq-surface p-3 text-body-sm">
                <div>
                  <dt className="text-muted-foreground">{t.gross}</dt>
                  <dd className="text-foreground">{fmt(totals.gross)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.deductions}</dt>
                  <dd className="text-foreground">{fmt(totals.deductions)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">{t.net}</dt>
                  <dd className="font-semibold text-foreground">{fmt(totals.net)}</dd>
                </div>
              </dl>
              {error ? (
                <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
                  <CircleX aria-hidden className="size-4" />
                  {error}
                </p>
              ) : null}
              <DialogFooter>
                <Button variant="ghost" disabled={busy} onClick={() => setOpenId(null)}>
                  {t.close}
                </Button>
                {onApprove && open.status === "draft" ? (
                  <Button variant="primary" loading={busy} onClick={() => void step(() => onApprove(open))}>
                    {t.approveRun}
                  </Button>
                ) : null}
                {onMarkPaid && open.status === "approved" ? (
                  <Button variant="primary" loading={busy} onClick={() => void step(() => onMarkPaid(open))}>
                    {t.markPaid}
                  </Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}
