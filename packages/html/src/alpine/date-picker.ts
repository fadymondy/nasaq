// nqDatePicker, nqDateRangePicker, nqTimePicker: the state behind the date and time pickers. The markup is the React one:
// an input-looking trigger that opens a calendar in a popover (the Blade component nests <x-nq::popover> and <x-nq::calendar>),
// and hour / minute / AM-PM selects.
//
//   <div x-data="nqDatePicker({ value: '2026-09-15', locale: 'en', placeholder: 'Select a date' })" x-modelable="date" class="contents">
//     <div x-data="nqPopover()">  <button x-ref="trigger"><span x-text="label ?? placeholder"></span></button>
//       <template x-teleport="body"> … <div data-slot="calendar" x-data="nqCalendar()" x-model="date"> (x-effect closes the popup on pick)
//     <input type="hidden" :value="date ?? ''">
//
// date is an ISO date "2026-09-15" or null; the range picker has period = { from, to }; the time picker has time = "14:30" (24-hour).
// All three are x-modelable. The names differ from the calendar's own `value` on purpose: an x-model expression is read in
// the scope of the element that has it.

import type { Magics, Register } from "./types";

const parseKey = (key: string | null | undefined): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key ?? "");
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : null;
};

/** Western digits, like every Nasaq date: `ar-SA` would give Arabic-Indic digits. */
const withDigits = (locale: string) => {
  try {
    return new Intl.Locale(locale, { numberingSystem: "latn" }).toString();
  } catch {
    return "en";
  }
};

type Range = { from: string | null; to: string | null };

interface PickerBase extends Magics {
  locale: string;
  calendar: string | null;
  placeholder: string;
}

const formatOptions = (self: PickerBase): Intl.DateTimeFormatOptions => ({ dateStyle: "medium", ...(self.calendar ? { calendar: self.calendar } : {}) });

interface DateState extends PickerBase {
  date: string | null;
  readonly label: string | null;
}

interface RangeState extends PickerBase {
  period: Range;
  readonly label: string | null;
}

interface TimeState extends Magics {
  time: string | null;
  locale: string;
  cycle: 12 | 24;
  hourModel: string;
  minuteModel: string;
  periodModel: string;
  set(h: number | null, m: number | null, pm: boolean): void;
}

export const datePicker: Register = (Alpine) => {
  Alpine.data("nqDatePicker", ({ value = null, locale = "en", calendar = null, placeholder = "" }: { value?: string | null; locale?: string; calendar?: string | null; placeholder?: string } = {}) => ({
    date: (value || null) as string | null,
    locale,
    calendar: calendar as string | null,
    placeholder,
    /** The trigger text: the date in the locale's medium style, or null when nothing is picked. */
    get label(): string | null {
      const self = this as unknown as DateState;
      const d = parseKey(self.date);
      return d ? new Intl.DateTimeFormat(withDigits(self.locale), formatOptions(self)).format(d) : null;
    },
  }));

  Alpine.data("nqDateRangePicker", ({ value = null, locale = "en", calendar = null, placeholder = "" }: { value?: Range | null; locale?: string; calendar?: string | null; placeholder?: string } = {}) => ({
    period: { from: value?.from ?? null, to: value?.to ?? null } as Range,
    locale,
    calendar: calendar as string | null,
    placeholder,
    /** "Sep 8 – 12, 2026", or "Sep 8, 2026 –" while only the start is chosen. */
    get label(): string | null {
      const self = this as unknown as RangeState;
      const from = parseKey(self.period?.from);
      if (!from) return null;
      const fmt = new Intl.DateTimeFormat(withDigits(self.locale), formatOptions(self));
      const to = parseKey(self.period?.to);
      return to ? fmt.formatRange(from, to) : `${fmt.format(from)} –`;
    },
  }));

  Alpine.data("nqTimePicker", ({ value = null, locale = "en", hourCycle = null }: { value?: string | null; locale?: string; hourCycle?: 12 | 24 | null } = {}) => ({
    time: (value || null) as string | null,
    locale,
    cycle: (hourCycle ??
      (() => {
        const c = new Intl.DateTimeFormat(locale, { hour: "numeric" }).resolvedOptions().hourCycle;
        return c === "h23" || c === "h24" ? 24 : 12;
      })()) as 12 | 24,
    /** Writes "HH:mm"; a missing segment is kept as 00 so the value is always valid. */
    set(this: TimeState, h: number | null, m: number | null, pm: boolean) {
      let hour = h ?? 0;
      if (this.cycle === 12) hour = (hour % 12) + (pm ? 12 : 0);
      this.time = `${String(hour).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
    },
    get hourModel(): string {
      const self = this as unknown as TimeState;
      if (!self.time) return "";
      const h = Number(self.time.split(":")[0]);
      return String(self.cycle === 12 ? h % 12 || 12 : h);
    },
    set hourModel(v: string) {
      const self = this as unknown as TimeState;
      const [, m] = (self.time ?? "").split(":").map(Number);
      const pm = Number((self.time ?? "0").split(":")[0]) >= 12;
      self.set(Number(v), self.time ? (m ?? 0) : null, pm);
    },
    get minuteModel(): string {
      const self = this as unknown as TimeState;
      return self.time ? String(Number(self.time.split(":")[1])) : "";
    },
    set minuteModel(v: string) {
      const self = this as unknown as TimeState;
      const h = self.time ? Number(self.time.split(":")[0]) : null;
      self.set(h, Number(v), h !== null && h >= 12);
    },
    get periodModel(): string {
      const self = this as unknown as TimeState;
      return self.time && Number(self.time.split(":")[0]) >= 12 ? "pm" : "am";
    },
    set periodModel(v: string) {
      const self = this as unknown as TimeState;
      const [h, m] = self.time ? self.time.split(":").map(Number) : [null, null];
      self.set(h ?? null, m ?? null, v === "pm");
    },
  }));
};
