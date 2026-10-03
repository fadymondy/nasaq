// nqRateSchedule, nqRecurringSubscriptions and nqBillingOverview: effective-dated rates and recurring subscriptions.
//
//   <section data-slot="rate-schedule" x-data="nqRateSchedule({ rates, currency, locale, today, canAdd, canRemove, t })"> … </section>
//   <section data-slot="recurring-subscriptions" x-data="nqRecurringSubscriptions({ subscriptions, projects, currency, … })"> … </section>
//   <section data-slot="billing-overview" x-data="nqBillingOverview({ subscriptions, currency, … })"> … </section>
//
// Every change fires a bubbling, cancelable event on the root:
//   "nq-rate-add"      { amount, from, resolve(), reject(message), waitUntil(promise) }
//   "nq-rate-remove"   { rate, … }
//   "nq-subscription-save"    { input, id?, … }
//   "nq-subscription-status"  { subscription, status, … }
// Nobody claimed it (no waitUntil / resolve / reject call): the change is applied locally. When a handler claims it the dialog stays busy until
// it settles; a rejection keeps the dialog open and shows its message. Re-render the section with saved data afterwards.

import { describeCron, isValidCron } from "./cron-builder-logic";
import {
  checkRate,
  dayOf,
  keyOf,
  marginBps,
  rateAt,
  rateSegments,
  shiftDay,
  sortRates,
  subscriptionCharges,
  subscriptionMonthly,
  type CycleUnit,
  type Rate,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionSchedule,
} from "./rates-logic";
import { RATES_STRINGS } from "./rates-strings";
import type { Register } from "./types";

const NONE = "__none__";
let counter = 0;

type Strings = (typeof RATES_STRINGS)["en"];

function words(locale: string, overrides?: Record<string, unknown>): Strings {
  const base = RATES_STRINGS[locale.startsWith("ar") ? "ar" : "en"] as Strings;
  const o = (overrides ?? {}) as Record<string, unknown>;
  return {
    ...base,
    ...o,
    problems: { ...base.problems, ...(o.problems as object) },
    units: { ...base.units, ...(o.units as object) },
    unitsPlural: { ...base.unitsPlural, ...(o.unitsPlural as object) },
    statuses: { ...base.statuses, ...(o.statuses as object) },
  } as Strings;
}

function money(minor: number, currency: string, locale: string): string {
  const f = new Intl.NumberFormat(locale, { style: "currency", currency });
  const digits = f.resolvedOptions().maximumFractionDigits ?? 2;
  return f.format(minor / 10 ** digits);
}
const dayText = (key: string, locale: string): string => new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(dayOf(key));
const numText = (v: number, locale: string): string => new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);

/** Dispatch a cancelable change event; resolves when whoever claimed it settles (at once when nobody did). */
async function emit(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<void> {
  let claimed: Promise<unknown> | null = null;
  const claim = (p: Promise<unknown>) => (claimed = claimed ?? p);
  root.dispatchEvent(
    new CustomEvent(name, {
      bubbles: true,
      cancelable: true,
      detail: {
        ...detail,
        waitUntil: (p: Promise<unknown>) => void claim(Promise.resolve(p)),
        resolve: () => void claim(Promise.resolve()),
        reject: (message?: string) => void claim(Promise.reject(new Error(message ?? ""))),
      },
    }),
  );
  if (claimed) await claimed;
}

export const ratesSubscriptions: Register = (Alpine) => {
  Alpine.data(
    "nqRateSchedule",
    (config: { rates: Rate[]; marginAgainst?: Rate[]; currency: string; locale?: string; today?: string; canAdd?: boolean; canRemove?: boolean; labels?: Record<string, unknown> }) => ({
      rates: [...config.rates],
      marginAgainst: config.marginAgainst ?? null,
      currency: config.currency,
      locale: config.locale ?? "en",
      today: config.today ?? keyOf(new Date()),
      canAdd: Boolean(config.canAdd),
      canRemove: Boolean(config.canRemove),
      t: words(config.locale ?? "en", config.labels),
      adding: false,
      removing: false,
      target: null as Rate | null,
      amount: null as number | null,
      from: (config.today ?? keyOf(new Date())) as string | null,
      touched: false,
      busy: false,
      failed: "",
      money(minor: number) {
        return money(minor, this.currency, this.locale);
      },
      day(key: string) {
        return dayText(key, this.locale);
      },
      get segments() {
        return rateSegments(this.rates).reverse();
      },
      get current(): Rate | undefined {
        return rateAt(this.rates, this.today);
      },
      get upcoming(): Rate | undefined {
        return sortRates(this.rates as Rate[]).find((r) => r.from > this.today);
      },
      get margin(): number | null {
        const cost = this.marginAgainst ? rateAt(this.marginAgainst, this.today) : undefined;
        return this.current && cost ? marginBps(this.current.amount, cost.amount) : null;
      },
      get marginText() {
        return this.margin === null ? "" : this.t.marginNow(`${numText(Math.round(this.margin / 100), this.locale)}%`);
      },
      get problem() {
        return checkRate({ amount: this.amount ?? 0, from: this.from ?? "" }, this.rates);
      },
      get amountBad() {
        return this.touched && this.problem === "amount";
      },
      get dateBad() {
        return this.touched && (this.problem === "date" || this.problem === "duplicate");
      },
      get shownProblem() {
        if (!this.touched || !this.problem) return "";
        return this.t.problems[this.problem as "amount" | "date" | "duplicate"];
      },
      sign(bps: number) {
        return bps >= 0 ? "+" : "−";
      },
      change(bps: number) {
        return `${this.sign(bps)}${numText(Math.abs(bps) / 100, this.locale)}%`;
      },
      openAdd() {
        this.amount = null;
        this.from = this.today;
        this.touched = false;
        this.failed = "";
        this.adding = true;
      },
      openRemove(rate: Rate) {
        if (!this.canRemove) return;
        this.target = rate;
        this.failed = "";
        this.removing = true;
      },
      async submit() {
        this.touched = true;
        if (this.problem || this.busy || this.amount === null || !this.from) return;
        const rate: Rate = { id: `rate-${(counter++).toString(36)}`, amount: this.amount, from: this.from };
        this.busy = true;
        this.failed = "";
        try {
          await emit(this.$root as HTMLElement, "nq-rate-add", { amount: rate.amount, from: rate.from });
          this.rates = [...this.rates, rate];
          this.adding = false;
        } catch (e) {
          this.failed = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      async confirmRemove() {
        const rate = this.target;
        if (!rate || this.busy) return;
        this.busy = true;
        this.failed = "";
        try {
          await emit(this.$root as HTMLElement, "nq-rate-remove", { rate });
          this.rates = this.rates.filter((r: Rate) => r.id !== rate.id);
          this.removing = false;
        } catch (e) {
          this.failed = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
    }),
  );

  Alpine.data(
    "nqRecurringSubscriptions",
    (config: {
      subscriptions: Subscription[];
      projects?: { id: string; name: string }[] | null;
      currency: string;
      locale?: string;
      today?: string;
      canSave?: boolean;
      canChangeStatus?: boolean;
      labels?: Record<string, unknown>;
    }) => ({
      subs: config.subscriptions.map((s) => ({ ...s })),
      projects: config.projects ?? null,
      currency: config.currency,
      locale: config.locale ?? "en",
      today: config.today ?? keyOf(new Date()),
      canSave: Boolean(config.canSave),
      canChangeStatus: Boolean(config.canChangeStatus),
      t: words(config.locale ?? "en", config.labels),
      NONE,
      dialogOpen: false,
      cancelOpen: false,
      editingId: "" as string,
      cancelTarget: null as Subscription | null,
      name: "",
      projectId: NONE,
      amount: null as number | null,
      quantity: "1",
      custom: false,
      every: "1",
      unit: "month",
      expr: "0 9 1 * *",
      anchor: null as string | null,
      touched: false,
      busy: false,
      failed: "",
      listError: "",
      money(minor: number) {
        return money(minor, this.currency, this.locale);
      },
      day(key: string) {
        return dayText(key, this.locale);
      },
      num(v: number) {
        return numText(v, this.locale);
      },
      scheduleText(s: Subscription) {
        const sc = s.schedule;
        if (sc.kind === "cycle") return this.t.cycleText(sc.every, (sc.every === 1 ? this.t.units : this.t.unitsPlural)[sc.unit]);
        return describeCron(sc.expr, this.locale.startsWith("ar") ? "ar" : "en") ?? sc.expr;
      },
      nextOf(s: Subscription): string {
        return s.status === "active" ? (subscriptionCharges(s, this.today, 1)[0] ?? "") : "";
      },
      monthly(s: Subscription) {
        return subscriptionMonthly(s, this.today);
      },
      total(s: Subscription) {
        return s.amount * (s.quantity ?? 1);
      },
      tone(s: Subscription) {
        return s.status === "active" ? "success" : s.status === "paused" ? "warning" : "neutral";
      },
      get everyN() {
        return Number(this.every);
      },
      get qty() {
        return Number(this.quantity);
      },
      get nameBad() {
        return !this.name.trim();
      },
      get amountBad() {
        return !this.amount || this.amount <= 0;
      },
      get qtyBad() {
        return !Number.isInteger(this.qty) || this.qty < 1;
      },
      get scheduleBad() {
        return this.custom ? !isValidCron(this.expr) : !Number.isInteger(this.everyN) || this.everyN < 1;
      },
      get bad() {
        return this.nameBad || this.amountBad || this.qtyBad || this.scheduleBad || !this.anchor;
      },
      get schedule(): SubscriptionSchedule {
        return this.custom ? { kind: "cron", expr: this.expr.trim() } : { kind: "cycle", every: this.everyN, unit: (this.unit || "month") as CycleUnit };
      },
      get preview(): string[] {
        if (this.scheduleBad || !this.anchor) return [];
        return subscriptionCharges({ schedule: this.schedule, anchor: this.anchor }, this.anchor > this.today ? this.anchor : this.today, 3);
      },
      get cronText() {
        return this.custom && !this.scheduleBad ? (describeCron(this.expr, this.locale.startsWith("ar") ? "ar" : "en") ?? this.t.cronHint) : this.t.cronHint;
      },
      unitLabel(u: string) {
        return (this.everyN === 1 ? this.t.units : this.t.unitsPlural)[u as CycleUnit];
      },
      openEditor(s?: Subscription) {
        this.touched = false;
        this.failed = "";
        this.editingId = s?.id ?? "";
        this.name = s?.name ?? "";
        this.projectId = s?.projectId ?? NONE;
        this.amount = s?.amount ?? null;
        this.quantity = String(s?.quantity ?? 1);
        this.custom = s?.schedule.kind === "cron";
        this.every = String(s?.schedule.kind === "cycle" ? s.schedule.every : 1);
        this.unit = s?.schedule.kind === "cycle" ? s.schedule.unit : "month";
        this.expr = s?.schedule.kind === "cron" ? s.schedule.expr : "0 9 1 * *";
        this.anchor = s?.anchor ?? this.today;
        this.dialogOpen = true;
      },
      openCancel(s: Subscription) {
        this.cancelTarget = s;
        this.failed = "";
        this.cancelOpen = true;
      },
      async submit() {
        this.touched = true;
        if (this.bad || this.busy || this.amount === null || !this.anchor) return;
        const input: SubscriptionInput = {
          name: this.name.trim(),
          projectId: this.projectId === NONE ? undefined : this.projectId,
          amount: this.amount,
          quantity: this.qty,
          schedule: this.schedule,
          anchor: this.anchor,
        };
        const id = this.editingId || undefined;
        this.busy = true;
        this.failed = "";
        try {
          await emit(this.$root as HTMLElement, "nq-subscription-save", { input, id });
          const projectName = this.projects?.find((p: { id: string; name: string }) => p.id === input.projectId)?.name;
          if (id) this.subs = this.subs.map((s: Subscription) => (s.id === id ? { ...s, ...input, projectName } : s));
          else this.subs = [...this.subs, { ...input, id: `sub-${(counter++).toString(36)}`, projectName, status: "active" }];
          this.dialogOpen = false;
        } catch (e) {
          this.failed = (e as Error).message || this.t.failed;
        } finally {
          this.busy = false;
        }
      },
      async setStatus(s: Subscription, status: string, fromDialog = false) {
        if (this.busy) return;
        this.busy = true;
        this.failed = "";
        this.listError = "";
        try {
          await emit(this.$root as HTMLElement, "nq-subscription-status", { subscription: s, status });
          this.subs = this.subs.map((x: Subscription) => (x.id === s.id ? { ...x, status } : x));
          if (fromDialog) this.cancelOpen = false;
        } catch (e) {
          const message = (e as Error).message || this.t.failed;
          if (fromDialog) this.failed = message;
          else this.listError = message;
        } finally {
          this.busy = false;
        }
      },
      confirmCancel() {
        if (this.cancelTarget) return this.setStatus(this.cancelTarget, "cancelled", true);
      },
    }),
  );

  Alpine.data(
    "nqBillingOverview",
    (config: { subscriptions: Subscription[]; currency: string; locale?: string; today?: string; labels?: Record<string, unknown> }) => ({
      subs: config.subscriptions,
      currency: config.currency,
      locale: config.locale ?? "en",
      today: config.today ?? keyOf(new Date()),
      t: words(config.locale ?? "en", config.labels),
      money(minor: number) {
        return money(minor, this.currency, this.locale);
      },
      day(key: string) {
        return dayText(key, this.locale);
      },
      num(v: number) {
        return numText(v, this.locale);
      },
      get summary() {
        const horizon = shiftDay(this.today, 30);
        const active = this.subs.filter((s: Subscription) => s.status === "active");
        let mrr = 0;
        const byProject = new Map<string, { name: string; monthly: number }>();
        const upcoming: { id: string; name: string; day: string; amount: number }[] = [];
        for (const s of active as Subscription[]) {
          const monthly = subscriptionMonthly(s, this.today);
          mrr += monthly;
          const key = s.projectId ?? "";
          const row = byProject.get(key) ?? { name: s.projectName ?? this.t.orgLevel, monthly: 0 };
          row.monthly += monthly;
          byProject.set(key, row);
          for (const day of subscriptionCharges(s, this.today, 12)) if (day <= horizon) upcoming.push({ id: `${s.id}-${day}`, name: s.name, day, amount: s.amount * (s.quantity ?? 1) });
        }
        upcoming.sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
        return {
          active: active.length,
          mrr,
          projects: [...byProject.entries()].map(([id, v]) => ({ id, ...v })).sort((a, b) => b.monthly - a.monthly),
          upcoming,
          due: upcoming.reduce((s, u) => s + u.amount, 0),
        };
      },
      share(monthly: number) {
        const mrr = this.summary.mrr;
        return mrr ? Math.max(2, Math.round((monthly / mrr) * 100)) : 0;
      },
    }),
  );
};

