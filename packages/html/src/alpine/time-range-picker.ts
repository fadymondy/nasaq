// nqTimeRangePicker: the window a dashboard or report covers. The markup is the React TimeRangePicker's (see the Blade component):
// relative presets and a Week toggle, a "Custom" popover with a range calendar (Cancel / Apply), an optional "Compare with" select,
// a week navigator and a summary of the resolved dates. The state and the time zone maths live here.
//
//   <div data-slot="time-range-picker" x-data="nqTimeRangePicker({ value: { kind: 'relative', preset: '24h' }, timeZone: 'Asia/Riyadh' })" x-modelable="value">…</div>
//
// `value` is x-modelable plain data: { kind: 'relative', preset: '24h' } | { kind: 'week', start: '2026-09-27' } | { kind: 'custom', from, to }.
// `compare` ("none" | "previous" | "year") is plain state; bind the select to it. The custom popover edits `draft` ({ from, to } ISO days),
// which the calendar's x-model="draft" writes. Fires bubbling "change" ({ value, from, to }) and "comparison-change" ({ mode, from, to }).
// Options: value, presets, allowWeek, allowCustom, allowFuture, timeZone, weekStartsOn, comparison, now, locale, labels (partial overrides).

import {
  TIME_RANGE_PRESETS,
  addDays,
  comparisonRange,
  currentWeek,
  dayInZone,
  isFutureWeek,
  orderDays,
  parsePreset,
  resolveTimeRange,
  sameTimeRange,
  shiftWeek,
  zoneOffsetLabel,
  type RelativePreset,
  type ResolvedTimeRange,
  type TimeComparison,
  type TimeRangeContext,
  type TimeRangeValue,
  type TimeRangeWeekday,
} from "./time-range-picker-logic";
import type { Magics, Register } from "./types";

type Unit = "m" | "h" | "d";

const STRINGS = {
  en: {
    custom: "Custom",
    versus: "Compared with",
    pickDays: "Pick the first and last day",
    shortPreset: (n: number, unit: Unit) => `${n}${unit}`,
    longPreset: (n: number, unit: Unit) => {
      const word = { m: ["minute", "minutes"], h: ["hour", "hours"], d: ["day", "days"] }[unit];
      return n === 1 ? `Last ${word[0]}` : `Last ${n} ${word[1]}`;
    },
  },
  ar: {
    custom: "مخصص",
    versus: "مقارنة مع",
    pickDays: "اختر أول يوم وآخر يوم",
    shortPreset: (n: number, unit: Unit) => `${n} ${{ m: "د", h: "س", d: "ي" }[unit]}`,
    longPreset: (n: number, unit: Unit) => {
      const forms = { m: ["دقيقة", "دقيقتين", "دقائق", "دقيقة"], h: ["ساعة", "ساعتين", "ساعات", "ساعة"], d: ["يوم", "يومين", "أيام", "يومًا"] }[unit];
      if (n === 1) return `آخر ${forms[0]}`;
      if (n === 2) return `آخر ${forms[1]}`;
      const cat = new Intl.PluralRules("ar").select(n);
      return `آخر ${n} ${cat === "few" ? forms[2] : forms[3]}`;
    },
  },
};

type Strings = typeof STRINGS.en;

export interface TimeRangeOptions {
  value?: TimeRangeValue | null;
  presets?: RelativePreset[];
  allowWeek?: boolean;
  allowCustom?: boolean;
  allowFuture?: boolean;
  timeZone?: string | null;
  weekStartsOn?: TimeRangeWeekday | null;
  comparison?: TimeComparison;
  /** ISO instant; overrides "now" for tests and docs. */
  now?: string | null;
  locale?: string;
  labels?: Partial<Strings>;
}

interface Draft {
  from: string | null;
  to: string | null;
}

interface RangeState extends Magics {
  value: TimeRangeValue;
  compare: TimeComparison;
  presets: RelativePreset[];
  allowFuture: boolean;
  tz: string;
  weekStart: TimeRangeWeekday;
  nowIso: string | null;
  locale: string;
  t: Strings;
  draft: Draft;
  last: string;
  ctx(): TimeRangeContext;
  commit(next: TimeRangeValue): void;
  digits(): string;
  fmtRange(a: Date, b: Date, time: boolean): string;
  dayDate(day: string): Date;
  summaryOf(r: ResolvedTimeRange): string;
  readonly range: ResolvedTimeRange;
  readonly dayBased: boolean;
}

const browserZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

function localeWeekStart(locale: string): TimeRangeWeekday {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const first = l.getWeekInfo?.().firstDay ?? l.weekInfo?.firstDay;
    if (first) return (first % 7) as TimeRangeWeekday;
  } catch {
    /* fall through */
  }
  return 1;
}

export const timeRangePicker: Register = (Alpine) => {
  Alpine.data("nqTimeRangePicker", (opts: TimeRangeOptions = {}) => {
    const locale = opts.locale ?? "en";
    const strings: Strings = { ...(locale.startsWith("ar") ? STRINGS.ar : STRINGS.en), ...(opts.labels ?? {}) };
    return {
      value: (opts.value ?? { kind: "relative", preset: "24h" }) as TimeRangeValue,
      compare: (opts.comparison ?? "none") as TimeComparison,
      presets: [...(opts.presets ?? TIME_RANGE_PRESETS)] as RelativePreset[],
      allowFuture: Boolean(opts.allowFuture),
      tz: opts.timeZone || browserZone(),
      weekStart: (opts.weekStartsOn ?? localeWeekStart(locale)) as TimeRangeWeekday,
      nowIso: opts.now ?? null,
      locale,
      t: strings,
      draft: { from: null, to: null } as Draft,
      last: "",

      init(this: RangeState) {
        this.last = JSON.stringify(this.value);
        this.$watch("value", () => {
          const next = JSON.stringify(this.value);
          if (next === this.last) return;
          this.last = next;
          const r = resolveTimeRange(this.value, this.ctx());
          this.$dispatch("change", { value: this.value, from: r.from, to: r.to });
        });
        this.$watch("compare", (mode: TimeComparison) => {
          const r = comparisonRange(this.value, mode, this.ctx());
          this.$dispatch("comparison-change", { mode, from: r?.from ?? null, to: r?.to ?? null });
        });
      },

      ctx(this: RangeState): TimeRangeContext {
        return { now: this.nowIso ? new Date(this.nowIso) : new Date(), timeZone: this.tz, weekStartsOn: this.weekStart };
      },
      /** Western digits, like every Nasaq date. */
      digits(this: RangeState) {
        try {
          return new Intl.Locale(this.locale, { numberingSystem: "latn" }).toString();
        } catch {
          return "en";
        }
      },
      dayDate(day: string) {
        const [y, m, d] = day.split("-").map(Number);
        return new Date(y!, m! - 1, d!);
      },
      fmtRange(this: RangeState, a: Date, b: Date, time: boolean) {
        const opts: Intl.DateTimeFormatOptions = time ? { timeZone: this.tz, dateStyle: "medium", timeStyle: "short" } : { timeZone: this.tz, dateStyle: "medium" };
        return new Intl.DateTimeFormat(this.digits(), opts).formatRange(a, b);
      },
      /** A range of calendar days, read as local dates (no zone shift). */
      dayRange(this: RangeState, from: Date, to: Date) {
        return new Intl.DateTimeFormat(this.digits(), { dateStyle: "medium" }).formatRange(from, to);
      },
      summaryOf(this: RangeState, r: ResolvedTimeRange) {
        return this.dayBased ? this.fmtRange(r.from, new Date(r.to.getTime() - 1), false) : this.fmtRange(r.from, r.to, true);
      },

      get range(): ResolvedTimeRange {
        const self = this as unknown as RangeState;
        return resolveTimeRange(self.value, self.ctx());
      },
      get dayBased(): boolean {
        return (this as unknown as RangeState).value.kind !== "relative";
      },
      get pressed(): string {
        const v = (this as unknown as RangeState).value;
        return v.kind === "relative" ? v.preset : v.kind === "week" ? "week" : "";
      },
      get isWeek(): boolean {
        return (this as unknown as RangeState).value.kind === "week";
      },
      get isCustom(): boolean {
        return (this as unknown as RangeState).value.kind === "custom";
      },
      get summary(): string {
        const self = this as unknown as RangeState;
        return self.summaryOf(self.range);
      },
      get offset(): string {
        const self = this as unknown as RangeState;
        return zoneOffsetLabel(self.ctx().now!, self.tz);
      },
      get comparedText(): string {
        const self = this as unknown as RangeState;
        const c = comparisonRange(self.value, self.compare, self.ctx());
        return c ? self.summaryOf(c) : "";
      },
      get weekLabel(): string {
        const self = this as unknown as RangeState;
        const v = self.value;
        return v.kind === "week" ? new Intl.DateTimeFormat(self.digits(), { dateStyle: "medium" }).formatRange(self.dayDate(v.start), self.dayDate(addDays(v.start, 6))) : "";
      },
      get canNextWeek(): boolean {
        const self = this as unknown as RangeState;
        return self.value.kind === "week" && (self.allowFuture || !isFutureWeek(shiftWeek(self.value, 1), self.ctx()));
      },
      get isThisWeek(): boolean {
        const self = this as unknown as RangeState;
        return self.value.kind === "week" && self.value.start === (currentWeek(self.ctx()) as { start: string }).start;
      },
      get customLabel(): string {
        const self = this as unknown as RangeState;
        const v = self.value;
        if (v.kind !== "custom") return self.t.custom;
        const o = orderDays(v.from, v.to);
        return new Intl.DateTimeFormat(self.digits(), { dateStyle: "medium" }).formatRange(self.dayDate(o.from), self.dayDate(o.to));
      },
      get draftReady(): boolean {
        const d = (this as unknown as RangeState).draft;
        return Boolean(d?.from && d?.to);
      },
      get draftLabel(): string {
        const self = this as unknown as RangeState;
        const d = self.draft;
        return d?.from && d?.to ? new Intl.DateTimeFormat(self.digits(), { dateStyle: "medium" }).formatRange(self.dayDate(d.from), self.dayDate(d.to)) : self.t.pickDays;
      },
      /** The grouped toggle model: the pressed preset as a one-item list. */
      presetShort(this: RangeState, p: RelativePreset) {
        const parsed = parsePreset(p)!;
        return this.t.shortPreset(parsed.amount, parsed.unit);
      },
      presetLong(this: RangeState, p: RelativePreset) {
        const parsed = parsePreset(p)!;
        return this.t.longPreset(parsed.amount, parsed.unit);
      },

      commit(this: RangeState, next: TimeRangeValue) {
        if (sameTimeRange(next, this.value)) return;
        this.value = next;
      },
      /** Press a preset or "week". Pressing the pressed one keeps it (a range is always chosen). */
      choose(this: RangeState, key: string) {
        if (key === "week") this.commit(currentWeek(this.ctx()));
        else this.commit({ kind: "relative", preset: key as RelativePreset });
      },
      shift(this: RangeState, n: number) {
        this.commit(shiftWeek(this.value, n));
      },
      thisWeek(this: RangeState) {
        this.commit(currentWeek(this.ctx()));
      },
      /** Run when the custom popover opens: start the draft from the current custom range, or empty. */
      seedDraft(this: RangeState) {
        const v = this.value;
        this.draft = v.kind === "custom" ? orderDays(v.from, v.to) : { from: null, to: null };
      },
      /** Commits the draft; true when it did, so the popover can close. */
      apply(this: RangeState): boolean {
        const { from, to } = this.draft ?? {};
        if (!from || !to) return false;
        this.commit({ kind: "custom", ...orderDays(from, to) });
        return true;
      },
      today(this: RangeState) {
        return dayInZone(this.ctx().now!, this.tz);
      },
    };
  });
};
