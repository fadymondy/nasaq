// nqScheduler: a day, week or month schedule, and nqSlotPicker: a booking picker. The markup is the React Scheduler's;
// the layout math is scheduler-logic.ts (a copy of the React scheduler-math.ts).
//
//   <div x-data="nqScheduler({ events: [{ id, title, start: '2026-09-29T10:00', end: '2026-09-29T11:30', tone }], view: 'week', … })">
//     <button @click="step(-1)">…  <h2 x-text="title">  <toggle-group x-model="viewValue">…
//     <template x-for="d in days"> … <button data-slot="scheduler-slot" …> <button data-slot="scheduler-event" …>
//     <template x-for="row in monthRows"> … data-slot="scheduler-day" … data-slot="scheduler-chip"
//   </div>
//
// Read only: clicking an empty slot or an event reports it. Fires "slot-select" ({ start, end }), "event-click" ({ id, title }),
// "view-change" ({ view }) and "date-change" ({ date }); dates are local ISO strings ("2026-09-29T10:00:00"). Event times without
// a zone are local, like new Date(2026, 8, 29, 10). The grid is arrow-key navigable (a roving tabindex; left and right flip in RTL).
//
// nqSlotPicker: a Calendar (days with no free slot are disabled, set by the server) beside a radio group of the chosen day's times.
// chosen is x-modelable (the selected slot's start, local ISO or null). Fires "slot-change" ({ start }).

import {
  addDays,
  dayKey,
  eventBox,
  eventsForDay,
  getWeekStartsOn,
  isSameDay,
  isSameMonth,
  layoutDayEvents,
  monthMatrix,
  normalizeHours,
  parseDay,
  splitChips,
  startOfDay,
  startOfWeek,
  stepDate,
  timeSlots,
  type SchedulerEvent,
  type SchedulerTone,
  type SchedulerView,
  type WeekDay,
  type WorkingHours,
} from "./scheduler-logic";
import type { Magics, Register } from "./types";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const pad = (n: number) => String(n).padStart(2, "0");
const localIso = (d: Date) => `${dayKey(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
/** "2026-09-29T10:00" (local, no zone) or any string/number new Date reads, to a Date. */
const toDate = (v: string | number | Date): Date => {
  if (v instanceof Date) return v;
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(v));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(m[4] ?? 0), Number(m[5] ?? 0), Number(m[6] ?? 0)) : new Date(v);
};
const digits = (locale: string) => `${locale}-u-nu-latn`;

interface Strings {
  today: string;
  previous: Record<SchedulerView, string>;
  next: Record<SchedulerView, string>;
  more: string;
  eventsOn: string;
  slotsOn: string;
  noSlots: string;
}

interface SchedulerConfig {
  events: { id: string; title: string; start: string; end: string; tone?: SchedulerTone }[];
  view?: SchedulerView;
  date?: string | null;
  today?: string | null;
  workingHours?: WorkingHours;
  slotMinutes?: number;
  weekStartsOn?: number | null;
  hour12?: boolean | null;
  maxChips?: number;
  locale?: string | null;
  dir?: "ltr" | "rtl" | null;
  /** Tone name to its class string (kept in the Blade file so Tailwind sees the classes). */
  tones: Record<string, string>;
  strings: Strings;
}

interface SchedulerState extends Magics {
  cfg: SchedulerConfig;
  hostEl: HTMLElement | null;
  view: SchedulerView;
  cursor: Date;
  focusCol: number;
  focusRow: number;
  rev: number;
  moreKey: string | null;
  readonly locale: string;
  readonly rtl: boolean;
  readonly todayDate: Date;
  readonly dayList: Date[];
  readonly slotMins: number[];
  readonly rangeStart: number;
  readonly rangeEnd: number;
  fmt(d: Date, o: Intl.DateTimeFormatOptions): string;
  num(n: number): string;
  move(col: number, row: number): void;
  timeOptions(minutes: boolean): Intl.DateTimeFormatOptions;
  fire(name: string, detail: Record<string, unknown>): void;
  setView(v: SchedulerView): void;
  setCursor(d: Date): void;
}

export const scheduler: Register = (Alpine) => {
  Alpine.data("nqScheduler", (cfg: SchedulerConfig) => {
    const events: SchedulerEvent[] = cfg.events.map((e) => ({ id: String(e.id), title: e.title, start: toDate(e.start), end: toDate(e.end), tone: e.tone }));
    const todayStart = startOfDay(cfg.today ? toDate(cfg.today) : new Date());
    return {
      cfg,
      hostEl: null as HTMLElement | null,
      view: (cfg.view ?? "week") as SchedulerView,
      cursor: startOfDay(cfg.date ? toDate(cfg.date) : todayStart),
      focusCol: 0,
      focusRow: 0,
      rev: 0,
      moreKey: null as string | null,
      init(this: SchedulerState) {
        this.hostEl = this.$el;
        this.$watch("view", (v: SchedulerView) => this.fire("view-change", { view: v }));
        this.$watch("cursor", (d: Date) => this.fire("date-change", { date: dayKey(d) }));
      },

      // ---- locale and direction
      get locale(): string {
        return this.cfg.locale ?? (this as unknown as { $nq: { locale: string } }).$nq?.locale ?? "en";
      },
      get rtl(): boolean {
        return this.cfg.dir ? this.cfg.dir === "rtl" : RTL_LANGS.has(this.locale.split("-")[0] ?? "en");
      },
      get weekStart(): WeekDay {
        return (this.cfg.weekStartsOn ?? getWeekStartsOn(this.locale)) as WeekDay;
      },
      get todayDate(): Date {
        return todayStart;
      },
      fmt(this: SchedulerState, d: Date, o: Intl.DateTimeFormatOptions): string {
        return new Intl.DateTimeFormat(digits(this.locale), o).format(d);
      },
      range(this: SchedulerState, a: Date, b: Date, o: Intl.DateTimeFormatOptions): string {
        return new Intl.DateTimeFormat(digits(this.locale), o).formatRange(a, b);
      },
      timeOptions(this: SchedulerState, minutes: boolean): Intl.DateTimeFormatOptions {
        return { hour: "numeric", ...(minutes ? { minute: "2-digit" as const } : {}), ...(this.cfg.hour12 == null ? {} : { hour12: this.cfg.hour12 }) };
      },
      num(this: SchedulerState, n: number): string {
        return new Intl.NumberFormat(digits(this.locale)).format(n);
      },
      fire(this: SchedulerState, name: string, detail: Record<string, unknown>) {
        this.hostEl?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
      },

      // ---- toolbar
      get title(): string {
        const self = this as unknown as SchedulerState & { dayList: Date[]; range(a: Date, b: Date, o: Intl.DateTimeFormatOptions): string };
        if (self.view === "day") return self.fmt(self.cursor, { dateStyle: "full" });
        if (self.view === "week") return self.range(self.dayList[0] as Date, self.dayList[6] as Date, { dateStyle: "medium" });
        return self.fmt(self.cursor, { month: "long", year: "numeric" });
      },
      get previousLabel(): string {
        return this.cfg.strings.previous[this.view];
      },
      get nextLabel(): string {
        return this.cfg.strings.next[this.view];
      },
      setView(this: SchedulerState, v: SchedulerView) {
        this.view = v;
      },
      setCursor(this: SchedulerState, d: Date) {
        this.cursor = d;
      },
      step(this: SchedulerState, direction: 1 | -1) {
        this.cursor = stepDate(this.view, this.cursor, direction);
      },
      goToday(this: SchedulerState) {
        const t = this.todayDate;
        this.cursor = this.view === "month" ? new Date(t.getFullYear(), t.getMonth(), 1) : t;
      },
      /** The view toggle group's value: always one view. Clicking the pressed one (an empty set) is ignored. */
      get viewValue(): string[] {
        void (this as unknown as SchedulerState).rev;
        return [(this as unknown as SchedulerState).view];
      },
      set viewValue(v: string[]) {
        const self = this as unknown as SchedulerState;
        if (v && v[0]) self.setView(v[0] as SchedulerView);
        else self.rev++;
      },

      // ---- day and week grid
      get dayList(): Date[] {
        if (this.view === "month") return [];
        const first = this.view === "day" ? startOfDay(this.cursor) : startOfWeek(this.cursor, this.weekStart);
        return Array.from({ length: this.view === "day" ? 1 : 7 }, (_, i) => addDays(first, i));
      },
      get hours(): WorkingHours {
        return normalizeHours(this.cfg.workingHours ?? { start: 8, end: 18 });
      },
      get slotMins(): number[] {
        return timeSlots(this.hours, this.cfg.slotMinutes ?? 30);
      },
      get stepMinutes(): number {
        return Math.max(Math.floor(this.cfg.slotMinutes ?? 30), 5);
      },
      get rangeStart(): number {
        return this.hours.start * 60;
      },
      get rangeEnd(): number {
        return this.hours.end * 60;
      },
      get columnsStyle(): string {
        return `grid-template-columns: 3.5rem repeat(${this.dayList.length}, minmax(0, 1fr))`;
      },
      /** The hour labels down the left edge. */
      get hourRows() {
        const self = this as unknown as SchedulerState & { rangeStart: number; slotMins: number[] };
        const first = self.dayList[0] ?? self.cursor;
        return self.slotMins.map((m) => ({ m, show: m % 60 === 0, first: m === self.rangeStart, label: self.fmt(new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, m), self.timeOptions(false)) }));
      },
      /** One entry per visible day: its header, its slot buttons and its positioned events. */
      get days() {
        const self = this as unknown as SchedulerState & { dayList: Date[]; slotMins: number[]; stepMinutes: number; rangeStart: number; rangeEnd: number };
        const total = self.rangeEnd - self.rangeStart;
        const at = (day: Date, minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
        const eventRange = (e: SchedulerEvent) => new Intl.DateTimeFormat(digits(self.locale), self.timeOptions(true)).formatRange(e.start, e.end);
        return self.dayList.map((day, col) => ({
          key: dayKey(day),
          col,
          weekday: self.fmt(day, { weekday: "short" }),
          num: self.num(day.getDate()),
          today: isSameDay(day, self.todayDate),
          slots: self.slotMins.map((m, row) => ({
            row,
            key: `${col}-${row}`,
            dashed: m % 60 !== 0,
            label: self.fmt(at(day, m), { weekday: "long", month: "long", day: "numeric", ...self.timeOptions(true) }),
            start: localIso(at(day, m)),
            end: localIso(at(day, m + self.stepMinutes)),
          })),
          events: layoutDayEvents(events, day, self.rangeStart, self.rangeEnd).map((p) => {
            const box = eventBox(p, total);
            return {
              id: p.event.id,
              title: p.event.title,
              tone: p.event.tone ?? "neutral",
              toneClass: self.cfg.tones[p.event.tone ?? "neutral"] ?? "",
              label: `${p.event.title}, ${eventRange(p.event)}`,
              range: eventRange(p.event),
              tall: p.height >= 45,
              style: `top:${box.top}%;height:${box.height}%;inset-inline-start:calc(${box.insetInlineStart}% + 1px);width:calc(${box.width}% - 2px)`,
            };
          }),
        }));
      },
      isFocusCell(this: SchedulerState, col: number, row: number): boolean {
        return this.focusCol === col && this.focusRow === row;
      },
      onSlotFocus(this: SchedulerState, col: number, row: number) {
        this.focusCol = col;
        this.focusRow = row;
      },
      pickSlot(this: SchedulerState, slot: { start: string; end: string }) {
        this.fire("slot-select", { start: slot.start, end: slot.end });
      },
      pickEvent(this: SchedulerState, ev: { id: string; title: string }) {
        this.fire("event-click", { id: ev.id, title: ev.title });
      },
      move(this: SchedulerState, col: number, row: number) {
        const cols = (this as unknown as { dayList: Date[] }).dayList.length;
        const rows = (this as unknown as { slotMins: number[] }).slotMins.length;
        const c = Math.min(Math.max(col, 0), cols - 1);
        const r = Math.min(Math.max(row, 0), rows - 1);
        this.focusCol = c;
        this.focusRow = r;
        this.hostEl?.querySelector<HTMLElement>(`[data-slot="scheduler-slot"][data-col="${c}"][data-row="${r}"]`)?.focus();
      },
      onGridKey(this: SchedulerState, event: KeyboardEvent) {
        const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
        if (!cell) return;
        const col = Number(cell.dataset.col);
        const row = Number(cell.dataset.row);
        const last = (this as unknown as { slotMins: number[] }).slotMins.length - 1;
        // Arrow keys are physical: in RTL the columns run right to left.
        const side = this.rtl ? -1 : 1;
        const target: Record<string, [number, number]> = {
          ArrowDown: [col, row + 1],
          ArrowUp: [col, row - 1],
          ArrowRight: [col + side, row],
          ArrowLeft: [col - side, row],
          Home: [col, 0],
          End: [col, last],
        };
        const next = target[event.key];
        if (!next) return;
        event.preventDefault();
        this.move(next[0], next[1]);
      },

      // ---- month grid
      get weekdayNames(): string[] {
        const self = this as unknown as SchedulerState & { weekStart: WeekDay };
        return Array.from({ length: 7 }, (_, i) => self.fmt(addDays(new Date(2026, 8, 6), (self.weekStart + i) % 7), { weekday: "short" }));
      },
      get monthRows() {
        const self = this as unknown as SchedulerState & { weekStart: WeekDay };
        if (self.view !== "month") return [];
        return monthMatrix(self.cursor, self.weekStart).map((row) =>
          row.map((day) => {
            const list = eventsForDay(events, day);
            const { visible, hidden } = splitChips(list, self.cfg.maxChips ?? 3);
            const chip = (e: SchedulerEvent) => {
              const range = new Intl.DateTimeFormat(digits(self.locale), self.timeOptions(true)).formatRange(e.start, e.end);
              return {
                id: e.id,
                title: e.title,
                tone: e.tone ?? "neutral",
                toneClass: self.cfg.tones[e.tone ?? "neutral"] ?? "",
                label: `${e.title}, ${range}`,
                time: self.fmt(e.start, self.timeOptions(true)),
              };
            };
            const label = self.fmt(day, { dateStyle: "full" });
            return {
              key: dayKey(day),
              num: self.num(day.getDate()),
              label,
              outside: !isSameMonth(day, self.cursor),
              today: isSameDay(day, self.todayDate),
              start: localIso(day),
              end: localIso(addDays(day, 1)),
              chips: visible.map(chip),
              all: list.map(chip),
              hidden,
              more: self.cfg.strings.more.replace("{n}", self.num(hidden)),
              eventsOn: self.cfg.strings.eventsOn.replace("{date}", label),
            };
          }),
        );
      },
      toggleMore(this: SchedulerState, key: string) {
        this.moreKey = this.moreKey === key ? null : key;
      },
    };
  });

  // The booking picker. cfg: { slots: [{ start, disabled? }], value?, day?, today?, locale?, hour12?, strings: { noSlots, slotsOn } }.
  Alpine.data("nqSlotPicker", (cfg: PickerConfig) => {
    const slots = cfg.slots.map((s) => ({ iso: s.start, at: toDate(s.start), disabled: Boolean(s.disabled) }));
    const open = slots.filter((s) => !s.disabled);
    const first = open.map((s) => startOfDay(s.at)).sort((a, b) => a.getTime() - b.getTime())[0];
    const today = startOfDay(cfg.today ? toDate(cfg.today) : new Date());
    const startDay = (cfg.value ? startOfDay(toDate(cfg.value)) : null) ?? (cfg.day ? parseDay(cfg.day) : null) ?? first ?? today;
    return {
      cfg,
      hostEl: null as HTMLElement | null,
      chosen: cfg.value ?? null,
      pickDay: dayKey(startDay) as string | null,
      init(this: PickerState) {
        this.hostEl = this.$el;
        this.$watch("chosen", (v: string | null) => this.hostEl?.dispatchEvent(new CustomEvent("slot-change", { detail: { start: v }, bubbles: true })));
      },
      get locale(): string {
        return this.cfg.locale ?? (this as unknown as { $nq: { locale: string } }).$nq?.locale ?? "en";
      },
      get day(): Date {
        return parseDay(this.pickDay) ?? startDay;
      },
      get dayLabel(): string {
        return new Intl.DateTimeFormat(digits(this.locale), { dateStyle: "full" }).format(this.day);
      },
      get slotsLabel(): string {
        return this.cfg.strings.slotsOn.replace("{date}", this.dayLabel);
      },
      get daySlots() {
        const self = this as unknown as PickerState & { day: Date };
        const fmt = new Intl.DateTimeFormat(digits(self.locale), { hour: "numeric", minute: "2-digit", ...(self.cfg.hour12 == null ? {} : { hour12: self.cfg.hour12 }) });
        const list = slots.filter((s) => isSameDay(s.at, self.day)).sort((a, b) => a.at.getTime() - b.at.getTime());
        const chosenAt = self.chosen ? toDate(self.chosen).getTime() : null;
        const stop = list.find((s) => !s.disabled && s.at.getTime() === chosenAt) ?? list.find((s) => !s.disabled);
        return list.map((s) => ({ iso: s.iso, label: fmt.format(s.at), disabled: s.disabled, checked: s.at.getTime() === chosenAt, tab: s === stop }));
      },
      get noSlots(): boolean {
        return (this as unknown as { daySlots: unknown[] }).daySlots.length === 0;
      },
      choose(this: PickerState, slot: { iso: string; disabled: boolean }) {
        if (!slot.disabled) this.chosen = slot.iso;
      },
      onKey(this: PickerState, event: KeyboardEvent) {
        const list = (this as unknown as { daySlots: { iso: string; disabled: boolean }[] }).daySlots.filter((s) => !s.disabled);
        if (!list.length) return;
        const at = list.findIndex((s) => s.iso === this.chosen);
        const rtl = RTL_LANGS.has(this.locale.split("-")[0] ?? "en");
        const forward = event.key === "ArrowDown" || event.key === (rtl ? "ArrowLeft" : "ArrowRight");
        const backward = event.key === "ArrowUp" || event.key === (rtl ? "ArrowRight" : "ArrowLeft");
        let next = -1;
        if (forward) next = (at + 1) % list.length;
        else if (backward) next = (at <= 0 ? list.length : at) - 1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = list.length - 1;
        if (next < 0) return;
        event.preventDefault();
        const slot = list[next] as { iso: string };
        this.chosen = slot.iso;
        this.$nextTick(() => this.hostEl?.querySelector<HTMLElement>('[data-slot="slot-picker-slot"][aria-checked="true"]')?.focus());
      },
    };
  });
};

interface PickerConfig {
  slots: { start: string; disabled?: boolean }[];
  value?: string | null;
  day?: string | null;
  today?: string | null;
  locale?: string | null;
  hour12?: boolean | null;
  strings: { noSlots: string; slotsOn: string };
}

interface PickerState extends Magics {
  cfg: PickerConfig;
  hostEl: HTMLElement | null;
  chosen: string | null;
  pickDay: string | null;
  readonly locale: string;
}
