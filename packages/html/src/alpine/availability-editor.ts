// nqAvailabilityEditor: a provider's weekly hours, breaks and vacations. State lives here; <x-nq::availability-editor> renders it with x-for.
//
//   <div data-slot="availability-editor" x-data="nqAvailabilityEditor({ value: { weekly: [...], vacations: [...] }, weekStartsOn: 6, strings: {...} })">
//     <template x-for="d in order"> ... av.weekly[d].enabled, addRange(d, 'ranges'), copyToOthers(d) ... </template>
//   </div>
//
// Fires a bubbling `nq-availability-change` { value } on every edit and `nq-availability-save` { value, promise } on Save: a listener may set
// event.detail.promise to a Promise (or one resolving to { error }) to keep the editor open with a message. Times are 24 hour "HH:mm".

import {
  copyDay,
  dayKey,
  nextRange,
  validateAvailability,
  vacationDays,
  weeklyMinutes,
  workedMinutes,
  type Availability,
  type AvailabilityIssue,
  type AvailabilityRange,
} from "./availability-editor-logic";
import type { Magics, Register } from "./types";

export interface AvailabilityEditorStrings {
  total: string;
  totalHours: string;
  hours: string;
  hoursShort: string;
  minShort: string;
  closed: string;
  dayOn: string;
  startLabel: string;
  endLabel: string;
  remove: string;
  saved: string;
  failed: string;
  vacationWord: string;
  breakWord: string;
  hoursWord: string;
  daysOne: string;
  daysTwo: string;
  daysFew: string;
  daysMany: string;
  issue: Record<string, string>;
}

export interface AvailabilityEditorConfig {
  value?: Availability;
  weekStartsOn?: number;
  locale?: string;
  strings?: Partial<AvailabilityEditorStrings>;
}

interface Message {
  tone: "success" | "danger";
  text: string;
}

interface EditorState extends Magics {
  av: Availability;
  saved: Availability;
  range: { from: string | null; to: string | null };
  reason: string;
  busy: boolean;
  message: Message | null;
  order: number[];
  locale: string;
  s: AvailabilityEditorStrings;
  readonly issues: AvailabilityIssue[];
  readonly dirty: boolean;
  readonly hasIssues: boolean;
  readonly okMessage: boolean;
  readonly badMessage: boolean;
  readonly messageText: string;
  readonly canDiscard: boolean;
  readonly canSave: boolean;
  readonly canAddVacation: boolean;
  readonly noVacations: boolean;
  readonly totalText: string;
  changed(): void;
  fill(text: string, n: string | number): string;
}

const DEFAULTS: AvailabilityEditorStrings = {
  total: ":h h :m min a week",
  totalHours: ":h h a week",
  hours: ":h h :m min",
  hoursShort: ":h h",
  minShort: "min",
  closed: "Closed",
  dayOn: "Open on :d",
  startLabel: "Start :n",
  endLabel: "End :n",
  remove: "Remove",
  saved: "Availability saved.",
  failed: "It could not be saved. Try again.",
  vacationWord: "Vacation",
  breakWord: "break",
  hoursWord: "hours",
  daysOne: "1 day",
  daysTwo: ":n days",
  daysFew: ":n days",
  daysMany: ":n days",
  issue: {},
};

const copy = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
const parseKey = (k: string) => {
  const [y, m, d] = k.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
};

export const availabilityEditor: Register = (Alpine) => {
  Alpine.data("nqAvailabilityEditor", (config: AvailabilityEditorConfig = {}) => {
    const start: Availability = copy(config.value ?? { weekly: Array.from({ length: 7 }, () => ({ enabled: false, ranges: [], breaks: [] })), vacations: [] });
    const weekStartsOn = config.weekStartsOn ?? 6;
    let counter = 0;
    return {
      av: start,
      saved: copy(start),
      range: { from: null as string | null, to: null as string | null },
      reason: "",
      busy: false,
      message: null as Message | null,
      order: Array.from({ length: 7 }, (_, i) => (i + weekStartsOn) % 7),
      locale: config.locale ?? "en",
      s: { ...DEFAULTS, ...config.strings, issue: { ...config.strings?.issue } } as AvailabilityEditorStrings,
      prevEnabled: start.weekly.map((d) => d.enabled),

      init(this: EditorState & { prevEnabled: boolean[] }) {
        // Switching a day on with no hours gives it a default morning, like the React editor.
        this.$watch("av", () => {
          this.av.weekly.forEach((d, i) => {
            if (d.enabled && !this.prevEnabled[i] && d.ranges.length === 0) d.ranges.push(nextRange([], 480));
            this.prevEnabled[i] = d.enabled;
          });
          this.changed();
        });
      },

      get issues(): AvailabilityIssue[] {
        return validateAvailability((this as unknown as EditorState).av);
      },
      get dirty(): boolean {
        const me = this as unknown as EditorState;
        return JSON.stringify(me.av) !== JSON.stringify(me.saved);
      },
      get hasIssues(): boolean {
        return (this as unknown as EditorState).issues.length > 0;
      },
      get okMessage(): boolean {
        return (this as unknown as EditorState).message?.tone === "success";
      },
      get badMessage(): boolean {
        return (this as unknown as EditorState).message?.tone === "danger";
      },
      get messageText(): string {
        return (this as unknown as EditorState).message?.text ?? "";
      },
      get canDiscard(): boolean {
        const me = this as unknown as EditorState;
        return me.dirty && !me.busy;
      },
      get canSave(): boolean {
        const me = this as unknown as EditorState;
        return me.dirty && !me.busy && !me.hasIssues;
      },
      get canAddVacation(): boolean {
        const me = this as unknown as EditorState;
        return !!me.range.from && !!me.range.to;
      },
      get noVacations(): boolean {
        return (this as unknown as EditorState).av.vacations.length === 0;
      },
      get totalText(): string {
        const me = this as unknown as EditorState;
        const m = weeklyMinutes(me.av);
        return (m % 60 ? me.s.total : me.s.totalHours).replace(":h", String(Math.floor(m / 60))).replace(":m", String(m % 60));
      },

      fill(this: EditorState, text: string, n: string | number) {
        return text.replace(":n", String(n)).replace(":d", String(n));
      },
      dayName(this: EditorState, d: number) {
        return new Intl.DateTimeFormat(this.locale, { weekday: "long" }).format(new Date(2023, 0, 1 + d));
      },
      dayLabel(this: EditorState, d: number) {
        return this.s.dayOn.replace(":d", (this as unknown as { dayName(d: number): string }).dayName(d));
      },
      dayHours(this: EditorState, d: number) {
        const day = this.av.weekly[d]!;
        if (!day.enabled) return this.s.closed;
        const m = workedMinutes(day);
        return m % 60 ? this.s.hours.replace(":h", String(Math.floor(m / 60))).replace(":m", String(m % 60)) : this.s.hoursShort.replace(":h", String(Math.floor(m / 60)));
      },
      timeLabel(this: EditorState, d: number, kind: "start" | "end", i: number) {
        const word = kind === "start" ? this.s.startLabel : this.s.endLabel;
        return `${(this as unknown as { dayName(d: number): string }).dayName(d)} ${word.replace(":n", String(i + 1))}`;
      },
      removeLabel(this: EditorState, d: number, i: number) {
        return `${this.s.remove} ${(this as unknown as { dayName(d: number): string }).dayName(d)} ${i + 1}`;
      },
      vacationRemoveLabel(this: EditorState) {
        return `${this.s.remove} ${this.s.vacationWord}`;
      },
      issueAt(this: EditorState, d: number, list: "ranges" | "breaks", index: number): string {
        const found = this.issues.find((i) => i.day === d && i.list === list && i.index === index);
        return found ? (this.s.issue[found.code] ?? found.code) : "";
      },
      noHours(this: EditorState, d: number) {
        return this.issues.some((i) => i.code === "no-hours" && i.day === d);
      },
      noHoursText(this: EditorState) {
        return this.s.issue["no-hours"] ?? "";
      },
      hasBreaks(this: EditorState, d: number) {
        return this.av.weekly[d]!.breaks.length > 0;
      },
      issueText(this: EditorState, i: AvailabilityIssue) {
        const me = this as unknown as { dayName(d: number): string };
        const what = i.vacationId
          ? this.s.vacationWord
          : i.day !== undefined
            ? `${me.dayName(i.day)}: ${i.list === "breaks" ? this.s.breakWord : this.s.hoursWord}${i.index !== undefined ? ` ${i.index + 1}` : ""}`
            : "";
        return `${what} ${this.s.issue[i.code] ?? i.code}`;
      },
      vacationIssue(this: EditorState, id: string): string {
        const found = this.issues.find((i) => i.vacationId === id);
        return found ? (this.s.issue[found.code] ?? found.code) : "";
      },
      dateText(this: EditorState, key: string) {
        return new Intl.DateTimeFormat(this.locale, { dateStyle: "medium" }).format(parseKey(key));
      },
      daysText(this: EditorState, v: { from: string; to: string }) {
        const n = vacationDays(v);
        const word = n === 1 ? this.s.daysOne : n === 2 ? this.s.daysTwo : n <= 10 ? this.s.daysFew : this.s.daysMany;
        return word.replace(":n", String(n));
      },
      oneDay(v: { from: string; to: string }) {
        return v.from === v.to;
      },

      addRange(this: EditorState, d: number, list: "ranges" | "breaks") {
        const day = this.av.weekly[d]!;
        const entry: AvailabilityRange = list === "ranges" ? nextRange(day.ranges, 60) : { start: "13:00", end: "13:30" };
        day[list].push(entry);
      },
      removeRange(this: EditorState, d: number, list: "ranges" | "breaks", i: number) {
        this.av.weekly[d]![list].splice(i, 1);
      },
      copyToOthers(this: EditorState, d: number) {
        const targets = this.av.weekly.flatMap((x, i) => (i !== d && x.enabled ? [i] : []));
        this.av.weekly = copyDay(this.av.weekly, d, targets);
      },
      addVacation(this: EditorState) {
        if (!this.range.from || !this.range.to) return;
        const { from, to } = this.range;
        this.av.vacations.push({ id: `vac-new-${++counter}`, from: dayKey(parseKey(from)), to: dayKey(parseKey(to)), reason: this.reason.trim() || undefined });
        this.av.vacations.sort((a, b) => a.from.localeCompare(b.from));
        this.range = { from: null, to: null };
        this.reason = "";
      },
      removeVacation(this: EditorState, id: string) {
        this.av.vacations = this.av.vacations.filter((v) => v.id !== id);
      },
      discard(this: EditorState & { prevEnabled: boolean[] }) {
        this.av = copy(this.saved);
        this.prevEnabled = this.av.weekly.map((d) => d.enabled);
        this.message = null;
      },
      changed(this: EditorState) {
        this.message = null;
        this.$el.dispatchEvent(new CustomEvent("nq-availability-change", { bubbles: true, detail: { value: copy(this.av) } }));
      },
      async save(this: EditorState) {
        if (!this.canSave) return;
        this.busy = true;
        this.message = null;
        const detail: { value: Availability; promise?: Promise<unknown> } = { value: copy(this.av) };
        try {
          this.$el.dispatchEvent(new CustomEvent("nq-availability-save", { bubbles: true, detail }));
          const result = (await detail.promise) as { error?: string } | void;
          if (result && result.error) this.message = { tone: "danger", text: result.error };
          else {
            this.saved = copy(this.av);
            this.message = { tone: "success", text: this.s.saved };
          }
        } catch {
          this.message = { tone: "danger", text: this.s.failed };
        } finally {
          this.busy = false;
        }
      },
    };
  });
};
