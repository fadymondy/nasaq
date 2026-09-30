"use client";

import { CalendarClock, CircleX, Pause, Play, Plus, Repeat, Trash2, TrendingDown, TrendingUp } from "lucide-react";
import { type ComponentProps, useId, useMemo, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { ContextMenuActions } from "../context-menu";
import { describeCron, isValidCron, nextRuns } from "../cron-builder";
import { CurrencyInput } from "../currency-input";
import { minorToMajor } from "../currency-input/currency-input-logic";
import { DatePicker } from "../date-picker";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "../field";
import { DateTime, formatNumber, Num } from "../numeric";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { StatCard, StatGrid } from "../stat-card";
import { EmptyState, Skeleton } from "../states";
import { Status, type StatusTone } from "../status";
import { Switch } from "../switch";
import { type CycleUnit, checkRate, divRound, marginBps, cycleMonthlyEquivalent, nextOccurrences, type RateProblem, rateAt, rateSegments, shiftDay, sortRates } from "./rates-logic";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
  en: {
    rates: "Rates",
    billRate: "Bill rate",
    costRate: "Cost rate",
    perHour: "per hour",
    current: "Current",
    from: "From",
    until: "Until",
    ongoing: "Ongoing",
    changeFrom: (pct: string) => `${pct} from the rate before`,
    addRate: "Add a rate",
    newRateTitle: "Add a rate",
    newRateDescription: "The new rate applies from its start date. Work before that date keeps the old rate.",
    amount: "Amount",
    effectiveFrom: "Effective from",
    save: "Save rate",
    cancel: "Cancel",
    removeRate: "Remove rate",
    removeTitle: "Remove this rate?",
    removeDescription: "Work in that period is priced at the rate before it.",
    noRates: "No rates yet",
    noRatesHint: "Add the first rate to start pricing time.",
    futureRate: (d: string) => `Next change ${d}`,
    margin: "Margin",
    marginNow: (pct: string) => `${pct} margin today`,
    problems: { amount: "Enter an amount above zero.", date: "Pick a start date.", duplicate: "A rate already starts on that day." },
    failed: "That did not go through. Try again.",
    subscriptions: "Recurring subscriptions",
    newSubscription: "New subscription",
    editSubscription: "Edit subscription",
    name: "Name",
    project: "Project",
    noProject: "Whole organisation",
    price: "Price",
    quantity: "Quantity",
    repeats: "Repeats",
    every: "Every",
    units: { week: "week", month: "month", year: "year" },
    unitsPlural: { week: "weeks", month: "months", year: "years" },
    customSchedule: "Custom schedule",
    cron: "Cron expression",
    cronHint: "Five fields: minute hour day month weekday.",
    cronBad: "That is not a valid cron expression.",
    firstCharge: "First charge",
    nextCharges: "Next charges",
    perMonth: "per month",
    nextCharge: "Next charge",
    cycleText: (n: number, unit: string) => (n === 1 ? `Every ${unit}` : `Every ${n} ${unit}`),
    statuses: { active: "Active", paused: "Paused", cancelled: "Cancelled" },
    pause: "Pause",
    resume: "Resume",
    cancelSub: "Cancel subscription",
    edit: "Edit",
    cancelTitle: "Cancel this subscription?",
    cancelDescription: (name: string) => `${name} stops renewing. Charges already made stay.`,
    keep: "Keep it",
    noSubs: "No subscriptions",
    noSubsHint: "Add one to see what renews and when.",
    listLabel: "Subscriptions",
    overview: "Billing overview",
    mrr: "Monthly recurring",
    activeCount: "Active subscriptions",
    dueSoon: "Due in the next 30 days",
    byProject: "By project",
    upcoming: "Upcoming charges",
    noUpcoming: "Nothing due in the next 30 days.",
    orgLevel: "Whole organisation",
    quantityShort: (n: string) => `× ${n}`,
    actions: "Actions",
  },
  ar: {
    rates: "الأسعار",
    billRate: "سعر الفوترة",
    costRate: "سعر التكلفة",
    perHour: "في الساعة",
    current: "الحالي",
    from: "من",
    until: "حتى",
    ongoing: "مستمر",
    changeFrom: (pct: string) => `${pct} عن السعر السابق`,
    addRate: "إضافة سعر",
    newRateTitle: "إضافة سعر",
    newRateDescription: "يسري السعر الجديد من تاريخ بدايته. العمل قبل هذا التاريخ يبقى بالسعر القديم.",
    amount: "المبلغ",
    effectiveFrom: "يسري من",
    save: "حفظ السعر",
    cancel: "إلغاء",
    removeRate: "إزالة السعر",
    removeTitle: "إزالة هذا السعر؟",
    removeDescription: "يُسعَّر العمل في تلك الفترة بالسعر الذي قبله.",
    noRates: "لا توجد أسعار بعد",
    noRatesHint: "أضف أول سعر لبدء تسعير الوقت.",
    futureRate: (d: string) => `التغيير القادم ${d}`,
    margin: "الهامش",
    marginNow: (pct: string) => `هامش ${pct} اليوم`,
    problems: { amount: "أدخل مبلغًا أكبر من صفر.", date: "اختر تاريخ البداية.", duplicate: "يوجد سعر يبدأ في هذا اليوم بالفعل." },
    failed: "لم تتم العملية. حاول مرة أخرى.",
    subscriptions: "الاشتراكات المتكررة",
    newSubscription: "اشتراك جديد",
    editSubscription: "تعديل الاشتراك",
    name: "الاسم",
    project: "المشروع",
    noProject: "المؤسسة كلها",
    price: "السعر",
    quantity: "الكمية",
    repeats: "التكرار",
    every: "كل",
    units: { week: "أسبوع", month: "شهر", year: "سنة" },
    unitsPlural: { week: "أسابيع", month: "أشهر", year: "سنوات" },
    customSchedule: "جدول مخصص",
    cron: "تعبير cron",
    cronHint: "خمسة حقول: دقيقة ساعة يوم شهر يوم الأسبوع.",
    cronBad: "هذا ليس تعبير cron صحيحًا.",
    firstCharge: "أول دفعة",
    nextCharges: "الدفعات القادمة",
    perMonth: "في الشهر",
    nextCharge: "الدفعة القادمة",
    cycleText: (n: number, unit: string) => (n === 1 ? `كل ${unit}` : `كل ${n} ${unit}`),
    statuses: { active: "نشط", paused: "متوقف مؤقتًا", cancelled: "ملغى" },
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    cancelSub: "إلغاء الاشتراك",
    edit: "تعديل",
    cancelTitle: "إلغاء هذا الاشتراك؟",
    cancelDescription: (name: string) => `سيتوقف ${name} عن التجديد. الدفعات التي تمت تبقى.`,
    keep: "إبقاؤه",
    noSubs: "لا توجد اشتراكات",
    noSubsHint: "أضف اشتراكًا لترى ما يتجدد ومتى.",
    listLabel: "الاشتراكات",
    overview: "نظرة عامة على الفوترة",
    mrr: "الإيراد الشهري المتكرر",
    activeCount: "الاشتراكات النشطة",
    dueSoon: "مستحق خلال 30 يومًا",
    byProject: "حسب المشروع",
    upcoming: "الدفعات القادمة",
    noUpcoming: "لا شيء مستحق خلال 30 يومًا.",
    orgLevel: "المؤسسة كلها",
    quantityShort: (n: string) => `× ${n}`,
    actions: "الإجراءات",
  },
};

type Strings = typeof STRINGS.en;
export type RatesSubscriptionsLabels = Partial<Omit<Strings, "problems" | "units" | "unitsPlural" | "statuses">> & {
  problems?: Partial<Strings["problems"]>;
  units?: Partial<Strings["units"]>;
  unitsPlural?: Partial<Strings["unitsPlural"]>;
  statuses?: Partial<Strings["statuses"]>;
};

function useStrings(labels?: RatesSubscriptionsLabels) {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const base = STRINGS[locale.startsWith("ar") ? "ar" : "en"];
  const t = {
    ...base,
    ...labels,
    problems: { ...base.problems, ...labels?.problems },
    units: { ...base.units, ...labels?.units },
    unitsPlural: { ...base.unitsPlural, ...labels?.unitsPlural },
    statuses: { ...base.statuses, ...labels?.statuses },
  } as Strings;
  return { t, locale, cron: locale.startsWith("ar") ? ("ar" as const) : ("en" as const), n: (v: number) => formatNumber(v, locale) };
}

type Result = void | { error?: string };
const fail = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback);
const Money = ({ minor, currency, className }: { minor: number; currency: string; className?: string }) => <Num className={className} value={minorToMajor(minor, currency)} format={{ style: "currency", currency }} />;
const dayOf = (key: string) => new Date(`${key}T12:00:00`);
const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const todayKey = () => keyOf(new Date());
const Day = ({ day }: { day: string }) => <DateTime value={dayOf(day)} format={{ dateStyle: "medium" }} />;

/* ------------------------------------------------------------------ RateSchedule */

export interface Rate {
  id: string;
  /** Per hour, minor units. */
  amount: number;
  /** First day it applies. It holds until the next rate starts. */
  from: string;
}

export interface RateScheduleProps extends Omit<ComponentProps<typeof Card>, "children" | "title"> {
  /** Which schedule this is, shown as the heading. Default "Bill rate". */
  title?: string;
  rates: readonly Rate[];
  currency: string;
  /** Day key treated as today. Default the real today. */
  today?: string;
  /** A second schedule, such as cost rates: the margin over it today is shown. */
  marginAgainst?: readonly Rate[];
  /** Adds a rate. Resolve `{ error }` to keep the dialog open. Omit it to make the schedule read only. */
  onAdd?: (input: { amount: number; from: string }) => Promise<Result>;
  onRemove?: (rate: Rate) => Promise<Result>;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
}

/**
 * A rate that changes over time: the current rate up front, a history that shows when each rate started and ended and how much
 * it changed, and an Add rate dialog. A new rate applies from its start date and never reprices earlier work. Rows have
 * remove in their context menu (context-click, long-press or the Menu key).
 */
export function RateSchedule({ title, rates, currency, today = todayKey(), marginAgainst, onAdd, onRemove, loading = false, labels, className, ...props }: RateScheduleProps) {
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<Rate | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const segments = useMemo(() => rateSegments(rates).reverse(), [rates]);
  const current = rateAt(rates, today);
  const upcoming = sortRates(rates).find((r) => r.from > today);
  const costNow = marginAgainst ? rateAt(marginAgainst, today) : undefined;
  const margin = current && costNow ? marginBps(current.amount, costNow.amount) : null;

  const run = async (job: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await job();
      if (r?.error) {
        setError(r.error);
        return false;
      }
      return true;
    } catch (e) {
      setError(fail(e, t.failed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-slot="rate-schedule" aria-labelledby={titleId} className={cn("gap-4 px-0", className)} {...props}>
      <CardHeader>
        <CardTitle as="h2" id={titleId}>
          {title ?? t.billRate}
        </CardTitle>
        {onAdd ? (
          <Button size="sm" variant="secondary" onClick={() => (setError(null), setAdding(true))}>
            <Plus aria-hidden />
            {t.addRate}
          </Button>
        ) : null}
      </CardHeader>
      {loading ? (
        <CardContent aria-busy className="flex flex-col gap-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      ) : segments.length === 0 ? (
        <CardContent>
          <EmptyState icon={CalendarClock} title={t.noRates} description={t.noRatesHint} className="border-0" />
        </CardContent>
      ) : (
        <>
          <CardContent className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {current ? (
              <p className="flex items-baseline gap-1.5">
                <span className="text-h2 font-semibold text-foreground">
                  <Money minor={current.amount} currency={currency} />
                </span>
                <span className="text-body-sm text-muted-foreground">{t.perHour}</span>
              </p>
            ) : null}
            {margin !== null ? <Badge variant="neutral">{t.marginNow(`${n(Math.round(margin / 100))}%`)}</Badge> : null}
            {upcoming ? (
              <span className="text-caption text-muted-foreground">
                {t.futureRate("")}
                <Day day={upcoming.from} />
              </span>
            ) : null}
          </CardContent>
          <CardContent>
            <ol className="flex flex-col divide-y divide-border rounded-card border border-border" aria-label={title ?? t.billRate}>
              {segments.map((s) => {
                const isCurrent = current?.id === s.rate.id;
                const row = (
                  <li key={s.rate.id} data-current={isCurrent ? "" : undefined} className="flex items-center justify-between gap-3 px-3 py-2.5 data-[current]:bg-nq-surface">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex flex-wrap items-center gap-2 text-body-sm text-foreground">
                        <Money minor={s.rate.amount} currency={currency} className="font-medium" />
                        {isCurrent ? <Status tone="success">{t.current}</Status> : null}
                      </span>
                      <span className="text-caption text-muted-foreground">
                        <Day day={s.from} /> – {s.to ? <Day day={s.to} /> : t.ongoing}
                      </span>
                    </div>
                    {s.changeBps !== null ? (
                      <span className={cn("inline-flex items-center gap-1 text-caption", s.changeBps >= 0 ? "text-nq-success-text" : "text-nq-danger-text")} title={t.changeFrom(`${s.changeBps >= 0 ? "+" : "−"}${n(Math.abs(s.changeBps) / 100)}%`)}>
                        {s.changeBps >= 0 ? <TrendingUp aria-hidden className="size-3.5" /> : <TrendingDown aria-hidden className="size-3.5" />}
                        <bdi dir="ltr">
                          {s.changeBps >= 0 ? "+" : "−"}
                          {n(Math.abs(s.changeBps) / 100)}%
                        </bdi>
                        <span className="sr-only">{t.changeFrom("")}</span>
                      </span>
                    ) : null}
                  </li>
                );
                return onRemove ? <ContextMenuActions key={s.rate.id} render={row} actions={[{ id: "remove", label: t.removeRate, icon: Trash2, danger: true, onSelect: () => (setError(null), setRemoving(s.rate)) }]} /> : row;
              })}
            </ol>
          </CardContent>
        </>
      )}
      {adding ? (
        <RateEditor
          existing={rates}
          currency={currency}
          busy={busy}
          error={error}
          t={t}
          onCancel={() => setAdding(false)}
          onSubmit={async (input) => {
            if (!onAdd) return;
            if (await run(() => onAdd(input))) setAdding(false);
          }}
        />
      ) : null}
      <Dialog open={removing !== null} onOpenChange={(o) => !o && !busy && setRemoving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.removeTitle}</DialogTitle>
            <DialogDescription>{t.removeDescription}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRemoving(null)}>
              {t.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => removing && onRemove && void run(() => onRemove(removing)).then((ok) => ok && setRemoving(null))}>
              {t.removeRate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function RateEditor({ existing, currency, busy, error, t, onCancel, onSubmit }: { existing: readonly Rate[]; currency: string; busy: boolean; error: string | null; t: Strings; onCancel: () => void; onSubmit: (input: { amount: number; from: string }) => void | Promise<void> }) {
  const [amount, setAmount] = useState<number | null>(null);
  const [from, setFrom] = useState<string | null>(todayKey());
  const [touched, setTouched] = useState(false);
  const problem: RateProblem = checkRate({ amount: amount ?? 0, from: from ?? "" }, existing);
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (problem || amount === null || !from) return;
            void onSubmit({ amount, from });
          }}
        >
          <DialogHeader>
            <DialogTitle>{t.newRateTitle}</DialogTitle>
            <DialogDescription>{t.newRateDescription}</DialogDescription>
          </DialogHeader>
          <Field invalid={touched && problem === "amount"}>
            <FieldLabel>{t.amount}</FieldLabel>
            <CurrencyInput currency={currency} value={amount} disabled={busy} onValueChange={setAmount} aria-label={t.amount} />
            {touched && problem === "amount" ? <FieldError match>{t.problems.amount}</FieldError> : null}
          </Field>
          <Field invalid={touched && (problem === "date" || problem === "duplicate")}>
            <FieldLabel>{t.effectiveFrom}</FieldLabel>
            <DatePicker aria-label={t.effectiveFrom} value={from ? dayOf(from) : null} disabled={busy} onValueChange={(d) => setFrom(d ? keyOf(d) : null)} />
            {touched && (problem === "date" || problem === "duplicate") ? <FieldError match>{t.problems[problem]}</FieldError> : null}
          </Field>
          {error ? (
            <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="size-4" />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
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

/* ------------------------------------------------------------------ subscriptions */

export type SubscriptionStatus = "active" | "paused" | "cancelled";

export type SubscriptionSchedule = { kind: "cycle"; every: number; unit: CycleUnit } | { kind: "cron"; expr: string; timeZone?: string };

export interface Subscription {
  id: string;
  name: string;
  /** Empty for an organisation-wide subscription. */
  projectId?: string;
  projectName?: string;
  /** Price per unit per charge, minor units. */
  amount: number;
  quantity?: number;
  schedule: SubscriptionSchedule;
  /** The day the cycle started, which sets the charge day for cycle schedules. */
  anchor: string;
  status: SubscriptionStatus;
}

export interface SubscriptionInput {
  name: string;
  projectId?: string;
  amount: number;
  quantity: number;
  schedule: SubscriptionSchedule;
  anchor: string;
}

/** The next `count` charge days for a subscription on or after `from` (a day key). Cron schedules are read in their own time zone. */
export function subscriptionCharges(s: Pick<Subscription, "schedule" | "anchor">, from: string, count = 3): string[] {
  if (s.schedule.kind === "cycle") return nextOccurrences(s.schedule, s.anchor, from, count);
  const tz = s.schedule.timeZone ?? "UTC";
  return nextRuns(s.schedule.expr, { from: new Date(`${shiftDay(from, -1)}T23:59:59Z`), count, timeZone: tz }).map((d) => keyOf(d));
}

/** What a subscription costs per month, whole minor units: quantity times price, a cycle turned into a month, a cron by counting the year's runs. */
export function subscriptionMonthly(s: Pick<Subscription, "schedule" | "amount" | "quantity">, from: string): number {
  const each = s.amount * (s.quantity ?? 1);
  if (s.schedule.kind === "cycle") return cycleMonthlyEquivalent(each, s.schedule);
  const end = shiftDay(from, 365);
  const runs = subscriptionCharges({ schedule: s.schedule, anchor: from }, from, 400).filter((d) => d <= end).length;
  return divRound(each * runs, 12);
}

export interface RecurringSubscriptionsProps extends Omit<ComponentProps<"section">, "children"> {
  subscriptions: readonly Subscription[];
  currency: string;
  /** Projects a subscription can belong to. Omit to hide the project field. */
  projects?: readonly { id: string; name: string }[];
  today?: string;
  /** Creates (no `id`) or updates a subscription. Resolve `{ error }` to keep the dialog open. */
  onSave?: (input: SubscriptionInput, id?: string) => Promise<Result>;
  onStatusChange?: (subscription: Subscription, status: SubscriptionStatus) => Promise<Result>;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
}

const SUB_TONE: Record<SubscriptionStatus, StatusTone> = { active: "success", paused: "warning", cancelled: "neutral" };

/**
 * Recurring subscriptions, per project or for the whole organisation: price and quantity, a weekly, monthly or yearly cycle or a
 * custom cron schedule, the next charge and the monthly equivalent. Pause, resume, edit and cancel are in each row's context menu
 * (context-click, long-press or the Menu key) and behind its "..." button.
 */
export function RecurringSubscriptions({ subscriptions, currency, projects, today = todayKey(), onSave, onStatusChange, loading = false, labels, className, ...props }: RecurringSubscriptionsProps) {
  const { t, n, locale } = useStrings(labels);
  const titleId = useId();
  const [editing, setEditing] = useState<Subscription | "new" | null>(null);
  const [cancelling, setCancelling] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (job: () => Promise<Result>) => {
    setBusy(true);
    setError(null);
    try {
      const r = await job();
      if (r?.error) {
        setError(r.error);
        return false;
      }
      return true;
    } catch (e) {
      setError(fail(e, t.failed));
      return false;
    } finally {
      setBusy(false);
    }
  };

  const scheduleText = (s: Subscription) => (s.schedule.kind === "cycle" ? t.cycleText(s.schedule.every, (s.schedule.every === 1 ? t.units : t.unitsPlural)[s.schedule.unit]) : (describeCron(s.schedule.expr, locale.startsWith("ar") ? "ar" : "en") ?? s.schedule.expr));

  const actions = (s: Subscription) => [
    ...(onSave ? [{ id: "edit", label: t.edit, onSelect: () => (setError(null), setEditing(s)) }] : []),
    ...(onStatusChange && s.status === "active" ? [{ id: "pause", label: t.pause, icon: Pause, group: "state", onSelect: () => void run(() => onStatusChange(s, "paused")) }] : []),
    ...(onStatusChange && s.status === "paused" ? [{ id: "resume", label: t.resume, icon: Play, group: "state", onSelect: () => void run(() => onStatusChange(s, "active")) }] : []),
    ...(onStatusChange && s.status !== "cancelled" ? [{ id: "cancel", label: t.cancelSub, icon: Trash2, danger: true, group: "danger", onSelect: () => (setError(null), setCancelling(s)) }] : []),
  ];

  return (
    <section data-slot="recurring-subscriptions" aria-labelledby={titleId} className={cn("flex flex-col gap-3", className)} {...props}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id={titleId} className="text-h3 text-foreground">
          {t.subscriptions}
        </h2>
        {onSave ? (
          <Button size="sm" onClick={() => (setError(null), setEditing("new"))}>
            <Plus aria-hidden />
            {t.newSubscription}
          </Button>
        ) : null}
      </div>
      {error && !editing && !cancelling ? (
        <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden className="size-4" />
          {error}
        </p>
      ) : null}
      {loading ? (
        <div aria-busy className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState icon={Repeat} title={t.noSubs} description={t.noSubsHint} />
      ) : (
        <ul aria-label={t.listLabel} className="flex flex-col divide-y divide-border rounded-card border border-border">
          {subscriptions.map((s) => {
            const [next] = s.status === "active" ? subscriptionCharges(s, today, 1) : [];
            const li = (
              <li key={s.id} data-status={s.status} className={cn("flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-3 py-3", s.status === "cancelled" && "opacity-60")}>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-body-sm font-medium text-foreground">
                    {s.name}
                    {s.quantity && s.quantity > 1 ? <span className="text-caption font-normal text-muted-foreground">{t.quantityShort(n(s.quantity))}</span> : null}
                    <Status tone={SUB_TONE[s.status]}>{t.statuses[s.status]}</Status>
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {s.projectName ?? t.orgLevel} · {scheduleText(s)}
                    {next ? (
                      <>
                        {" · "}
                        {t.nextCharge} <Day day={next} />
                      </>
                    ) : null}
                  </span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-body-sm font-medium text-foreground">
                    <Money minor={s.amount * (s.quantity ?? 1)} currency={currency} />
                  </span>
                  <span className="text-caption text-muted-foreground">
                    <Money minor={subscriptionMonthly(s, today)} currency={currency} /> {t.perMonth}
                  </span>
                </div>
              </li>
            );
            const list = actions(s);
            return list.length ? <ContextMenuActions key={s.id} render={li} actions={list} /> : li;
          })}
        </ul>
      )}
      {editing && onSave ? (
        <SubscriptionEditor
          key={editing === "new" ? "new" : editing.id}
          sub={editing === "new" ? null : editing}
          currency={currency}
          projects={projects}
          today={today}
          busy={busy}
          error={error}
          t={t}
          onCancel={() => setEditing(null)}
          onSubmit={async (input) => {
            if (await run(() => onSave(input, editing === "new" ? undefined : editing.id))) setEditing(null);
          }}
        />
      ) : null}
      <Dialog open={cancelling !== null} onOpenChange={(o) => !o && !busy && setCancelling(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.cancelTitle}</DialogTitle>
            <DialogDescription>{t.cancelDescription(cancelling?.name ?? "")}</DialogDescription>
          </DialogHeader>
          {error ? (
            <p role="alert" className="text-body-sm text-nq-danger-text">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setCancelling(null)}>
              {t.keep}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => cancelling && onStatusChange && void run(() => onStatusChange(cancelling, "cancelled")).then((ok) => ok && setCancelling(null))}>
              {t.cancelSub}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

function SubscriptionEditor({ sub, currency, projects, today, busy, error, t, onCancel, onSubmit }: { sub: Subscription | null; currency: string; projects?: readonly { id: string; name: string }[]; today: string; busy: boolean; error: string | null; t: Strings; onCancel: () => void; onSubmit: (input: SubscriptionInput) => void | Promise<void> }) {
  const { n, cron: cronLocale } = useStrings();
  const [name, setName] = useState(sub?.name ?? "");
  const [projectId, setProjectId] = useState(sub?.projectId ?? "");
  const [amount, setAmount] = useState<number | null>(sub?.amount ?? null);
  const [quantity, setQuantity] = useState(String(sub?.quantity ?? 1));
  const [custom, setCustom] = useState(sub?.schedule.kind === "cron");
  const [every, setEvery] = useState(String(sub?.schedule.kind === "cycle" ? sub.schedule.every : 1));
  const [unit, setUnit] = useState<CycleUnit>(sub?.schedule.kind === "cycle" ? sub.schedule.unit : "month");
  const [expr, setExpr] = useState(sub?.schedule.kind === "cron" ? sub.schedule.expr : "0 9 1 * *");
  const [anchor, setAnchor] = useState<string | null>(sub?.anchor ?? today);
  const [touched, setTouched] = useState(false);

  const everyN = Number(every);
  const qty = Number(quantity);
  const nameBad = !name.trim();
  const amountBad = !amount || amount <= 0;
  const qtyBad = !Number.isInteger(qty) || qty < 1;
  const scheduleBad = custom ? !isValidCron(expr) : !Number.isInteger(everyN) || everyN < 1;
  const bad = nameBad || amountBad || qtyBad || scheduleBad || !anchor;

  const schedule: SubscriptionSchedule = custom ? { kind: "cron", expr: expr.trim() } : { kind: "cycle", every: everyN, unit };
  const preview = !scheduleBad && anchor ? subscriptionCharges({ schedule, anchor }, anchor > today ? anchor : today, 3) : [];
  const cronText = custom && !scheduleBad ? describeCron(expr, cronLocale) : null;

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent>
        <form
          noValidate
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (bad || amount === null || !anchor) return;
            void onSubmit({ name: name.trim(), projectId: projectId || undefined, amount, quantity: qty, schedule, anchor });
          }}
        >
          <DialogHeader>
            <DialogTitle>{sub ? t.editSubscription : t.newSubscription}</DialogTitle>
          </DialogHeader>
          <Field invalid={touched && nameBad}>
            <FieldLabel>{t.name}</FieldLabel>
            <Input value={name} disabled={busy} onChange={(e) => setName(e.target.value)} />
          </Field>
          {projects ? (
            <Field>
              <FieldLabel>{t.project}</FieldLabel>
              <Select items={[{ value: "", label: t.noProject }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} value={projectId} disabled={busy} onValueChange={(v) => setProjectId(String(v ?? ""))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t.noProject}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field invalid={touched && amountBad}>
              <FieldLabel>{t.price}</FieldLabel>
              <CurrencyInput currency={currency} value={amount} disabled={busy} onValueChange={setAmount} aria-label={t.price} />
            </Field>
            <Field invalid={touched && qtyBad}>
              <FieldLabel>{t.quantity}</FieldLabel>
              <Input ltr inputMode="numeric" value={quantity} disabled={busy} onChange={(e) => setQuantity(e.target.value)} />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-body-sm">
            <Switch checked={custom} onCheckedChange={setCustom} disabled={busy} />
            {t.customSchedule}
          </label>
          {custom ? (
            <Field invalid={touched && scheduleBad}>
              <FieldLabel>{t.cron}</FieldLabel>
              <Input ltr className="font-mono" value={expr} disabled={busy} onChange={(e) => setExpr(e.target.value)} />
              {touched && scheduleBad ? <FieldError match>{t.cronBad}</FieldError> : <FieldDescription>{cronText ?? t.cronHint}</FieldDescription>}
            </Field>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field invalid={touched && scheduleBad}>
                <FieldLabel>{t.every}</FieldLabel>
                <Input ltr inputMode="numeric" value={every} disabled={busy} onChange={(e) => setEvery(e.target.value)} />
              </Field>
              <Field>
                <FieldLabel>{t.repeats}</FieldLabel>
                <Select items={(["week", "month", "year"] as const).map((u) => ({ value: u, label: (everyN === 1 ? t.units : t.unitsPlural)[u] }))} value={unit} disabled={busy} onValueChange={(v) => v && setUnit(v as CycleUnit)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(["week", "month", "year"] as const).map((u) => (
                      <SelectItem key={u} value={u}>
                        {(everyN === 1 ? t.units : t.unitsPlural)[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
          <Field>
            <FieldLabel>{t.firstCharge}</FieldLabel>
            <DatePicker aria-label={t.firstCharge} value={anchor ? dayOf(anchor) : null} disabled={busy} onValueChange={(d) => setAnchor(d ? keyOf(d) : null)} />
          </Field>
          {preview.length ? (
            <p className="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
              <span>{t.nextCharges}</span>
              {preview.map((d) => (
                <Badge key={d} variant="outline">
                  <Day day={d} />
                </Badge>
              ))}
            </p>
          ) : null}
          <span className="sr-only">{n(preview.length)}</span>
          {error ? (
            <p role="alert" className="flex items-center gap-2 text-body-sm text-nq-danger-text">
              <CircleX aria-hidden className="size-4" />
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
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

/* ------------------------------------------------------------------ BillingOverview */

export interface BillingOverviewProps extends Omit<ComponentProps<"section">, "children"> {
  subscriptions: readonly Subscription[];
  currency: string;
  today?: string;
  loading?: boolean;
  labels?: RatesSubscriptionsLabels;
}

/** The organisation's billing at a glance: monthly recurring total, active count, what is due in 30 days, a split by project and the upcoming charges. */
export function BillingOverview({ subscriptions, currency, today = todayKey(), loading = false, labels, className, ...props }: BillingOverviewProps) {
  const { t, n } = useStrings(labels);
  const titleId = useId();
  const active = subscriptions.filter((s) => s.status === "active");
  const horizon = shiftDay(today, 30);

  const { mrr, projects, upcoming, due } = useMemo(() => {
    let mrr = 0;
    const byProject = new Map<string, { name: string; monthly: number }>();
    const upcoming: { id: string; name: string; day: string; amount: number }[] = [];
    for (const s of active) {
      const monthly = subscriptionMonthly(s, today);
      mrr += monthly;
      const key = s.projectId ?? "";
      const row = byProject.get(key) ?? { name: s.projectName ?? t.orgLevel, monthly: 0 };
      row.monthly += monthly;
      byProject.set(key, row);
      for (const day of subscriptionCharges(s, today, 12)) if (day <= horizon) upcoming.push({ id: `${s.id}-${day}`, name: s.name, day, amount: s.amount * (s.quantity ?? 1) });
    }
    upcoming.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
    return { mrr, projects: [...byProject.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.monthly - a.monthly), upcoming, due: upcoming.reduce((s, u) => s + u.amount, 0) };
  }, [active, today, horizon, t.orgLevel]);

  return (
    <section data-slot="billing-overview" aria-labelledby={titleId} className={cn("flex flex-col gap-4", className)} {...props}>
      <h2 id={titleId} className="text-h3 text-foreground">
        {t.overview}
      </h2>
      <StatGrid>
        <StatCard loading={loading} label={t.mrr} value={<Money minor={mrr} currency={currency} />} />
        <StatCard loading={loading} label={t.activeCount} value={n(active.length)} />
        <StatCard loading={loading} label={t.dueSoon} value={<Money minor={due} currency={currency} />} />
      </StatGrid>
      {loading ? (
        <Skeleton aria-busy className="h-32 w-full" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle as="h3">{t.byProject}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-2">
                {projects.map((p) => (
                  <li key={p.id} className="flex flex-col gap-1">
                    <span className="flex items-center justify-between gap-3 text-body-sm">
                      <span className="truncate text-foreground">{p.name}</span>
                      <Money minor={p.monthly} currency={currency} className="tabular-nums text-muted-foreground" />
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-nq-surface" aria-hidden>
                      <span className="block h-full rounded-full bg-primary" style={{ width: `${mrr ? Math.max(2, Math.round((p.monthly / mrr) * 100)) : 0}%` }} />
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card className="gap-3 px-0">
            <CardHeader>
              <CardTitle as="h3">{t.upcoming}</CardTitle>
            </CardHeader>
            <CardContent>
              {upcoming.length === 0 ? (
                <p className="text-body-sm text-muted-foreground">{t.noUpcoming}</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {upcoming.map((u) => (
                    <li key={u.id} className="flex items-center justify-between gap-3 py-2 text-body-sm">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-foreground">{u.name}</span>
                        <span className="text-caption text-muted-foreground">
                          <Day day={u.day} />
                        </span>
                      </span>
                      <Money minor={u.amount} currency={currency} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </section>
  );
}
