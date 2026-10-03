// nqCalendar: a month grid for picking a day or a range. The markup is the React Calendar's (the Blade component renders
// the first paint on the server; the grid here replaces it). Native Date and Intl only.
//
//   <div data-slot="calendar" x-data="nqCalendar({ mode: 'single', today: '2026-09-15' })" x-modelable="value" x-bind="root">
//     <template x-for="m in monthViews" :key="m.key"> … <template x-for="c in day cells"> <button :data-date="c.key" x-on:click="pick(c.key)"> … </template>
//   </div>
//
// value is x-modelable (x-model / wire:model): an ISO date "2026-09-15" (or null) in single mode, { from, to } of ISO dates in
// range mode. Fires `month-change` with the first of the shown month ("2026-10-01"). Elements marked data-ssr are removed
// when Alpine takes over. Arrow keys are physical: in RTL, ArrowLeft is the next day.
// Self-contained: the date math below is calendar-math.ts of @fadymondy/nasaq.

import type { Magics, Register } from "./types";

type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
type Value = string | null | { from: string | null; to: string | null };

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

function addMonths(d: Date, n: number) {
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1);
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return new Date(target.getFullYear(), target.getMonth(), Math.min(d.getDate(), last));
}

const isSameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const isSameMonth = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
const compareDays = (a: Date, b: Date) => startOfDay(a).getTime() - startOfDay(b).getTime();

function clampDay(d: Date, min?: Date | null, max?: Date | null) {
  if (min && compareDays(d, min) < 0) return startOfDay(min);
  if (max && compareDays(d, max) > 0) return startOfDay(max);
  return startOfDay(d);
}

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** "2026-09-15" to a local Date, or null. */
function parseKey(key: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
}

const SATURDAY_REGIONS = new Set(["AE", "AF", "BH", "DJ", "DZ", "EG", "IQ", "IR", "JO", "KW", "LY", "OM", "QA", "SD", "SY"]);
const SUNDAY_REGIONS = new Set(["SA", "US", "CA", "IL", "JP", "IN", "BR", "MX", "PH", "KR", "TW", "YE"]);

function weekStartOf(locale: string): WeekDay {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const info = typeof loc.getWeekInfo === "function" ? loc.getWeekInfo() : loc.weekInfo;
    if (info) return (info.firstDay % 7) as WeekDay;
    const { language, region } = loc.maximize();
    if (region && SATURDAY_REGIONS.has(region)) return 6;
    if (region && SUNDAY_REGIONS.has(region)) return 0;
    if (!region && language === "ar") return 6;
    return region ? 1 : 0;
  } catch {
    return 0;
  }
}

const startOfWeek = (d: Date, weekStartsOn: WeekDay) => addDays(d, -((d.getDay() - weekStartsOn + 7) % 7));
const endOfWeek = (d: Date, weekStartsOn: WeekDay) => addDays(startOfWeek(d, weekStartsOn), 6);

function monthMatrix(month: Date, weekStartsOn: WeekDay, fixedWeeks = false) {
  const first = startOfMonth(month);
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0);
  let cursor = startOfWeek(first, weekStartsOn);
  const rows: Date[][] = [];
  const total = fixedWeeks ? 6 : Math.ceil((((first.getDay() - weekStartsOn + 7) % 7) + last.getDate()) / 7);
  for (let r = 0; r < total; r++) {
    const row: Date[] = [];
    for (let c = 0; c < 7; c++) {
      row.push(cursor);
      cursor = addDays(cursor, 1);
    }
    rows.push(row);
  }
  return rows;
}

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

interface CalendarInit {
  mode?: "single" | "range";
  value?: Value;
  /** First of the month to show (any day in it). Default: the selection, else today. */
  month?: string | null;
  numberOfMonths?: 1 | 2;
  min?: string | null;
  max?: string | null;
  /** ISO dates that cannot be picked. */
  disabled?: string[];
  /** Weekdays that cannot be picked, 0 = Sunday. */
  disabledWeekdays?: number[];
  showOutsideDays?: boolean;
  fixedWeeks?: boolean;
  weekStartsOn?: WeekDay | null;
  locale?: string | null;
  dir?: "ltr" | "rtl" | null;
  /** Intl calendar for the labels, e.g. "islamic-umalqura". */
  calendar?: string | null;
  /** Overrides "today" (ISO date). */
  today?: string | null;
  previousMonthLabel?: string | null;
  nextMonthLabel?: string | null;
}

interface Cell {
  key: string;
  day: string;
  label: string;
  blank: boolean;
  selected: boolean;
  band: boolean;
  isStart: boolean;
  isEnd: boolean;
  today: boolean;
  outside: boolean;
  disabled: boolean;
  tab: boolean;
  tdClass: string;
}

const EMPTY_CELL: Cell = { key: "", day: "", label: "", blank: true, selected: false, band: false, isStart: false, isEnd: false, today: false, outside: false, disabled: false, tab: false, tdClass: "p-0 text-center" };

interface CalendarScope extends Magics {
  mode: "single" | "range";
  value: Value;
  monthKey: string;
  focusKey: string;
  hoverKey: string | null;
  cfg: Required<Omit<CalendarInit, "value" | "month">>;
  $nq: { t(en: string, ar: string): string; locale: string };
  readonly locale: string;
  readonly rtl: boolean;
  readonly lastDay: Date;
  readonly showOutside: boolean;
  readonly firstDay: WeekDay;
  readonly todayDate: Date;
  readonly minDate: Date | null;
  readonly maxDate: Date | null;
  readonly shownMonth: Date;
  readonly tabDate: Date;
  fmt(d: Date, options: Intl.DateTimeFormatOptions): string;
  isDisabled(d: Date): boolean;
  inView(d: Date): boolean;
  setMonth(d: Date): void;
  moveFocus(d: Date, root: HTMLElement): void;
  focusDay(d: Date, root: HTMLElement): Promise<void>;
  range(): { from: string | null; to: string | null } | null;
}

export const calendar: Register = (Alpine) => {
  Alpine.data("nqCalendar", (init: CalendarInit = {}) => {
    const mode = init.mode === "range" ? "range" : "single";
    const value: Value = init.value !== undefined && init.value !== null ? init.value : mode === "range" ? { from: null, to: null } : null;
    const cfg = {
      mode,
      numberOfMonths: init.numberOfMonths ?? 1,
      min: init.min ?? null,
      max: init.max ?? null,
      disabled: init.disabled ?? [],
      disabledWeekdays: init.disabledWeekdays ?? [],
      showOutsideDays: init.showOutsideDays ?? true,
      fixedWeeks: init.fixedWeeks ?? false,
      weekStartsOn: init.weekStartsOn ?? null,
      locale: init.locale ?? null,
      dir: init.dir ?? null,
      calendar: init.calendar ?? null,
      today: init.today ?? null,
      previousMonthLabel: init.previousMonthLabel ?? null,
      nextMonthLabel: init.nextMonthLabel ?? null,
    };
    const today = startOfDay(parseKey(cfg.today) ?? new Date());
    const first = mode === "range" ? parseKey((value as { from: string | null }).from) : parseKey(value as string | null);
    const min = parseKey(cfg.min);
    const max = parseKey(cfg.max);
    const anchor = first ?? today;
    const monthStart = startOfMonth(parseKey(init.month) ?? clampDay(anchor, min, max));

    return {
      mode,
      value,
      cfg,
      monthKey: dayKey(monthStart),
      focusKey: dayKey(clampDay(anchor, min, max)),
      hoverKey: null as string | null,

      init(this: CalendarScope) {
        this.$el.querySelectorAll("[data-ssr]").forEach((el) => el.remove());
        // A day set from outside (a bound model, "go to the next free day") brings its month into view.
        this.$watch("value", (v: Value) => {
          if (this.mode === "range" || typeof v !== "string") return;
          const d = parseKey(v);
          if (d && !this.inView(d)) void this.$nextTick(() => this.setMonth(d));
        });
      },
      get locale() {
        return this.cfg.locale ?? this.$nq.locale ?? "en";
      },
      get rtl() {
        return this.cfg.dir ? this.cfg.dir === "rtl" : RTL_LANGS.has(this.locale.split("-")[0] ?? "en");
      },
      get firstDay() {
        return this.cfg.weekStartsOn ?? weekStartOf(this.locale);
      },
      get todayDate() {
        return startOfDay(parseKey(this.cfg.today) ?? new Date());
      },
      get minDate() {
        return parseKey(this.cfg.min);
      },
      get maxDate() {
        return parseKey(this.cfg.max);
      },
      get shownMonth() {
        return parseKey(this.monthKey) as Date;
      },
      get showOutside() {
        return this.cfg.showOutsideDays && this.cfg.numberOfMonths === 1;
      },
      get lastDay() {
        const last = addMonths(this.shownMonth, this.cfg.numberOfMonths - 1);
        return new Date(last.getFullYear(), last.getMonth() + 1, 0);
      },
      get tabDate() {
        const f = parseKey(this.focusKey) as Date;
        return this.inView(f) ? f : clampDay(this.shownMonth, this.minDate, this.maxDate);
      },
      get prevLabel() {
        return this.cfg.previousMonthLabel ?? this.$nq.t("Previous month", "الشهر السابق");
      },
      get nextLabel() {
        return this.cfg.nextMonthLabel ?? this.$nq.t("Next month", "الشهر التالي");
      },
      get prevBlocked() {
        const min = this.minDate;
        return min ? compareDays(addMonths(this.shownMonth, -1), new Date(min.getFullYear(), min.getMonth(), 1)) < 0 : false;
      },
      get nextBlocked() {
        const max = this.maxDate;
        return max ? compareDays(addMonths(this.shownMonth, this.cfg.numberOfMonths), max) > 0 : false;
      },

      fmt(this: CalendarScope, d: Date, options: Intl.DateTimeFormatOptions) {
        const locale = new Intl.Locale(this.locale, { numberingSystem: "latn" }).toString();
        return new Intl.DateTimeFormat(locale, { ...options, ...(this.cfg.calendar ? { calendar: this.cfg.calendar } : {}) }).format(d);
      },
      isDisabled(this: CalendarScope, d: Date) {
        const min = this.minDate;
        const max = this.maxDate;
        if ((min && compareDays(d, min) < 0) || (max && compareDays(d, max) > 0)) return true;
        if (this.cfg.disabledWeekdays.includes(d.getDay())) return true;
        const key = dayKey(d);
        return this.cfg.disabled.includes(key);
      },
      inView(this: CalendarScope, d: Date) {
        return compareDays(d, this.shownMonth) >= 0 && compareDays(d, this.lastDay) <= 0;
      },
      range(this: CalendarScope) {
        return this.mode === "range" ? ((this.value as { from: string | null; to: string | null } | null) ?? { from: null, to: null }) : null;
      },

      setMonth(this: CalendarScope, next: Date) {
        const m = startOfMonth(next);
        if (isSameMonth(m, this.shownMonth)) return;
        this.monthKey = dayKey(m);
        this.$dispatch("month-change", this.monthKey);
      },
      step(this: CalendarScope, delta: number) {
        this.setMonth(addMonths(this.shownMonth, delta));
      },
      async focusDay(this: CalendarScope, d: Date, root: HTMLElement) {
        // The grid redraws after a month change, so wait until the day button exists.
        for (let attempt = 0; attempt < 30; attempt++) {
          const button = root.querySelector<HTMLElement>(`[data-date="${dayKey(d)}"]`);
          if (button) {
            button.focus();
            return;
          }
          await new Promise((resolve) => setTimeout(resolve, 16));
        }
      },
      pick(this: CalendarScope, key: string) {
        const d = parseKey(key) as Date;
        if (this.isDisabled(d)) return;
        this.focusKey = key;
        if (!this.inView(d)) this.setMonth(d);
        const r = this.range();
        if (r) {
          const from = parseKey(r.from);
          if (!from || r.to) this.value = { from: key, to: null };
          else this.value = compareDays(d, from) < 0 ? { from: key, to: r.from } : { from: r.from, to: key };
        } else {
          this.value = this.value === key ? null : key;
        }
      },
      moveFocus(this: CalendarScope, target: Date, root: HTMLElement) {
        const next = clampDay(target, this.minDate, this.maxDate);
        this.focusKey = dayKey(next);
        if (compareDays(next, this.shownMonth) < 0) this.setMonth(next);
        else if (!this.inView(next)) this.setMonth(addMonths(startOfMonth(next), -(this.cfg.numberOfMonths - 1)));
        void this.focusDay(next, root);
      },
      onKeydown(this: CalendarScope, event: KeyboardEvent) {
        if (event.defaultPrevented || !(event.target as HTMLElement).closest("[data-date]")) return;
        const step = this.rtl ? -1 : 1;
        const from = this.tabDate;
        const moves: Record<string, Date> = {
          ArrowRight: addDays(from, step),
          ArrowLeft: addDays(from, -step),
          ArrowDown: addDays(from, 7),
          ArrowUp: addDays(from, -7),
          Home: startOfWeek(from, this.firstDay),
          End: endOfWeek(from, this.firstDay),
          PageDown: addMonths(from, event.shiftKey ? 12 : 1),
          PageUp: addMonths(from, event.shiftKey ? -12 : -1),
        };
        const target = moves[event.key];
        if (!target) return;
        event.preventDefault();
        this.moveFocus(target, (event.target as HTMLElement).closest<HTMLElement>('[data-slot="calendar"]') as HTMLElement);
      },
      hoverIfOpen(this: CalendarScope, key: string) {
        const r = this.range();
        if (r?.from && !r.to) this.hoverKey = key;
      },

      /** The cell at row r, column c of a month view; an empty cell for rows a short month does not have. */
      cell(_m: { weeks: Cell[][] }, r: number, c: number): Cell {
        return _m.weeks[r]?.[c] ?? EMPTY_CELL;
      },
      /** The months on screen, each with its title, weekday heads and week rows of cells. */
      get monthViews() {
        const r = this.range();
        const from = r ? parseKey(r.from) : null;
        const to = r ? parseKey(r.to) : null;
        const hover = parseKey(this.hoverKey);
        const single = r ? null : parseKey(this.value as string | null);
        let lo: Date | null = null;
        let hi: Date | null = null;
        if (from) {
          const end = !to ? hover : to;
          const forward = end ? compareDays(from, end) <= 0 : true;
          lo = end && !forward ? end : from;
          hi = end && forward ? end : from;
        }
        const tab = this.tabDate;
        const heads = Array.from({ length: 7 }, (_, i) => {
          const wd = (this.firstDay + i) % 7;
          const d = new Date(2023, 0, 1 + wd);
          return { wd, narrow: this.fmt(d, { weekday: "narrow" }), long: this.fmt(d, { weekday: "long" }) };
        });
        return Array.from({ length: this.cfg.numberOfMonths }, (_, index) => {
          const m = addMonths(this.shownMonth, index);
          const title = this.fmt(new Date(m.getFullYear(), m.getMonth(), 15), { month: "long", year: "numeric" });
          const weeks = monthMatrix(m, this.firstDay, this.cfg.fixedWeeks).map((week) =>
            week.map((d): Cell => {
              const outside = !isSameMonth(d, m);
              const selected = r ? Boolean((from && isSameDay(from, d)) || (to && isSameDay(to, d))) : Boolean(single && isSameDay(single, d));
              const inRange = Boolean(lo && hi && compareDays(d, lo) >= 0 && compareDays(d, hi) <= 0);
              const isStart = Boolean(lo && isSameDay(d, lo));
              const isEnd = Boolean(hi && isSameDay(d, hi));
              const band = inRange && !(isStart && isEnd);
              return {
                key: dayKey(d),
                day: this.fmt(d, { day: "numeric" }),
                label: this.fmt(d, { dateStyle: "full" }),
                blank: outside && !this.showOutside,
                selected,
                band,
                isStart,
                isEnd,
                today: isSameDay(d, this.todayDate),
                outside,
                disabled: this.isDisabled(d),
                tab: isSameDay(d, tab),
                tdClass: ["p-0 text-center", band && "bg-nq-selected", band && isStart && "rounded-s-control", band && isEnd && "rounded-e-control"].filter(Boolean).join(" "),
              };
            }),
          );
          return { key: dayKey(m), title, first: index === 0, last: index === this.cfg.numberOfMonths - 1, heads, weeks };
        });
      },

      root: {
        ":data-mode"(this: CalendarScope) {
          return this.mode;
        },
        ":dir"(this: CalendarScope) {
          return this.rtl ? "rtl" : "ltr";
        },
        ":lang"(this: CalendarScope) {
          return this.locale;
        },
        "x-on:keydown"(this: CalendarScope & { onKeydown(e: KeyboardEvent): void }, e: KeyboardEvent) {
          this.onKeydown(e);
        },
        "x-on:mouseleave"(this: CalendarScope) {
          this.hoverKey = null;
        },
      },
    } as Record<string, unknown> & ThisType<CalendarScope>;
  });
};
