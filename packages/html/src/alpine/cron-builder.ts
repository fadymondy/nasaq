// nqCronBuilder: a schedule anyone can fill in. The markup is the React CronBuilder's; the cron math is
// cron-builder-logic.ts (a copy of the React cron.ts), so nothing here needs a server round trip.
//
//   <div x-data="nqCronBuilder({ cron: '0 9 * * 1-5', zone: 'Asia/Riyadh', strings: {…} })" x-modelable="cron">
//     <button @click="setValue('0 9 * * *')">Daily</button>
//     <select-root x-model="frequency"> … <input x-model.number="every"> … <toggle-group x-model="weekdays"> …
//     <input x-model="expression">            the raw cron text; the field around it uses x-model="expressionInvalid"
//     <p x-text="valid ? summary : cfg.strings.invalid"></p>
//     <template x-for="r in runs"> <time x-text="r.text" x-bind:datetime="r.iso"> …
//   </div>
//
// cron is the cron string and is x-modelable (not "value": the nested tabs, select and toggle group scopes own that name, and accessors read it). Fires "value-change" ({ value, valid }) and "time-zone-change" ({ timeZone }).
// The simple fields are accessors over value: setting one rewrites the cron string, reading one parses it, so the two tabs
// cannot disagree. Property names are chosen not to clash with the nested tabs / select / field scopes they sit inside.
//
// nqCronScheduleList: the saved-schedules list. Fills in each row's reading and next run, runs the pause switches and
// fires "toggle", "run-now", "edit" and "delete" ({ id, enabled? }) on its root.

import { cronToSimple, DEFAULT_SIMPLE, describeCron, isValidTimeZone, nextRuns, parseCron, simpleToCron, type CronFrequency, type CronLocale, type CronSimple } from "./cron-builder-logic";
import type { Magics, Register } from "./types";

interface BuilderConfig {
  value?: string;
  zone?: string;
  /** Fixed "now" (ms) for the preview. Default: the clock when the value or zone changes. */
  now?: number | null;
  previewCount?: number;
  strings: {
    custom: string;
    invalid: string;
    nextNone: string;
    fieldNames: string[];
    errors: { empty: string; fields: string; syntax: string; range: string; step: string };
  };
}

interface RunRow {
  key: number;
  iso: string;
  text: string;
  relative: string;
}

interface BuilderState extends Magics {
  cfg: BuilderConfig;
  hostEl: HTMLElement | null;
  cron: string;
  zone: string;
  pane: string;
  rev: number;
  _memo: { key: string; rows: RunRow[] } | null;
  readonly lang: CronLocale;
  readonly locale: string;
  readonly simple: CronSimple | null;
  readonly s: CronSimple;
  patch(change: Partial<CronSimple>): void;
  setValue(next: string): void;
}

const num = (v: unknown, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number(v) || lo)));

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000_000],
  ["month", 2_592_000_000],
  ["week", 604_800_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

function relative(at: number, from: number, locale: string): string {
  const rtf = new Intl.RelativeTimeFormat(`${locale}-u-nu-latn`, { numeric: "auto" });
  const diff = at - from;
  for (const [unit, ms] of UNITS) if (Math.abs(diff) >= ms) return rtf.format(Math.round(diff / ms), unit);
  return rtf.format(Math.round(diff / 1000), "second");
}

export const cronBuilder: Register = (Alpine) => {
  Alpine.data("nqCronBuilder", (cfg: BuilderConfig) => {
    const start = cfg.value ?? "0 9 * * 1-5";
    const startZone = cfg.zone && isValidTimeZone(cfg.zone) ? cfg.zone : "UTC";
    return {
      cfg,
      hostEl: null as HTMLElement | null,
      cron: start,
      zone: startZone,
      pane: cronToSimple(start) ? "simple" : "cron",
      rev: 0,
      _memo: null as { key: string; rows: RunRow[] } | null,
      init(this: BuilderState) {
        this.hostEl = this.$el;
        this.$watch("cron", (v: string) => this.hostEl?.dispatchEvent(new CustomEvent("value-change", { detail: { value: v, valid: parseCron(v).ok }, bubbles: true })));
        this.$watch("zone", (z: string) => this.hostEl?.dispatchEvent(new CustomEvent("time-zone-change", { detail: { timeZone: z }, bubbles: true })));
      },
      get locale(): string {
        return (this as unknown as { $nq: { locale: string } }).$nq?.locale ?? "en";
      },
      get lang(): CronLocale {
        return this.locale.startsWith("ar") ? "ar" : "en";
      },
      get parsed() {
        return parseCron(this.cron);
      },
      get valid(): boolean {
        return parseCron(this.cron).ok;
      },
      get trimmed(): string {
        return this.cron.trim();
      },
      get summary(): string {
        return describeCron(this.cron, this.lang) ?? this.cfg.strings.custom;
      },
      get error(): string {
        const r = parseCron(this.cron);
        if (r.ok) return "";
        const e = r.error;
        const t = this.cfg.strings.errors;
        if (e.code === "empty") return t.empty;
        if (e.code === "fields") return t.fields;
        const field = e.field >= 0 ? (this.cfg.strings.fieldNames[e.field] ?? "") : "";
        return t[e.code].replace("{field}", field).replace("{token}", e.token ?? "");
      },
      get runs(): RunRow[] {
        const key = `${this.cron}|${this.zone}|${this.cfg.now ?? ""}|${this.lang}`;
        if (this._memo && this._memo.key === key) return this._memo.rows;
        const from = this.cfg.now ?? Date.now();
        const dates = parseCron(this.cron).ok ? nextRuns(this.cron, { from, count: this.cfg.previewCount ?? 5, timeZone: this.zone }) : [];
        const fmt = new Intl.DateTimeFormat(`${this.locale}-u-nu-latn`, { weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false, timeZone: this.zone });
        const rows = dates.map((d) => ({ key: d.getTime(), iso: d.toISOString(), text: fmt.format(d), relative: relative(d.getTime(), from, this.locale) }));
        this._memo = { key, rows };
        return rows;
      },
      get simple(): CronSimple | null {
        return cronToSimple(this.cron);
      },
      get isSimple(): boolean {
        return cronToSimple(this.cron) !== null;
      },
      get s(): CronSimple {
        return cronToSimple(this.cron) ?? DEFAULT_SIMPLE;
      },
      setValue(this: BuilderState, next: string) {
        this.cron = next;
      },
      startOver(this: BuilderState) {
        this.cron = simpleToCron(DEFAULT_SIMPLE);
      },
      patch(this: BuilderState, change: Partial<CronSimple>) {
        this.cron = simpleToCron({ ...(cronToSimple(this.cron) ?? DEFAULT_SIMPLE), ...change });
      },
      isPreset(this: BuilderState, v: string) {
        return this.cron.trim() === v;
      },

      // Accessors the nested controls bind to with x-model.
      get expression(): string {
        return this.cron;
      },
      set expression(v: string) {
        this.cron = String(v ?? "");
      },
      /** Read by the field around the expression input: it marks the control invalid. The write is ignored. */
      get expressionInvalid(): boolean {
        return !parseCron(this.cron).ok;
      },
      set expressionInvalid(_v: boolean) {},
      get frequency(): CronFrequency {
        return (this as unknown as BuilderState).s.frequency;
      },
      set frequency(v: CronFrequency) {
        const self = this as unknown as BuilderState;
        if (v && v !== self.s.frequency) self.patch({ frequency: v });
      },
      get every(): number {
        return (this as unknown as BuilderState).s.every;
      },
      set every(v: number | string) {
        const self = this as unknown as BuilderState;
        self.patch({ every: num(v, 1, self.s.frequency === "minutes" ? 59 : 23) });
      },
      get minute(): number {
        return (this as unknown as BuilderState).s.minute;
      },
      set minute(v: number | string) {
        (this as unknown as BuilderState).patch({ minute: num(v, 0, 59) });
      },
      get time(): string {
        return (this as unknown as BuilderState).s.time;
      },
      set time(v: string) {
        if (v) (this as unknown as BuilderState).patch({ time: String(v) });
      },
      get dayOfMonth(): number {
        return (this as unknown as BuilderState).s.dayOfMonth;
      },
      set dayOfMonth(v: number | string) {
        (this as unknown as BuilderState).patch({ dayOfMonth: num(v, 1, 31) });
      },
      /** Weekdays as strings ("0" = Sunday) for the toggle group. An empty selection is ignored, so one day always stays on. */
      get weekdays(): string[] {
        void (this as unknown as BuilderState).rev;
        return (this as unknown as BuilderState).s.days.map(String);
      },
      set weekdays(v: string[]) {
        const self = this as unknown as BuilderState;
        if (!v || v.length === 0) {
          self.rev++;
          return;
        }
        const days = v.map(Number);
        const cur = self.s.days;
        if (days.length === cur.length && days.every((d, i) => d === cur[i])) return;
        self.patch({ days });
      },
    };
  });

  // The saved-schedules list. cfg: { schedules: [{ id, name, cron, timeZone?, enabled }], now?, strings: { custom, invalid, off } }.
  Alpine.data("nqCronScheduleList", (cfg: ListConfig) => ({
    cfg,
    hostEl: null as HTMLElement | null,
    enabled: Object.fromEntries(cfg.schedules.map((s) => [s.id, s.enabled])) as Record<string, boolean>,
    _seen: Object.fromEntries(cfg.schedules.map((s) => [s.id, s.enabled])) as Record<string, boolean>,
    init(this: ListState) {
      this.hostEl = this.$el;
      this.$watch("enabled", (now: Record<string, boolean>) => {
        for (const [id, on] of Object.entries(now)) {
          if (this._seen[id] === on) continue;
          this._seen[id] = on;
          this.fire("toggle", { id, enabled: on });
        }
      });
    },
    get lang(): CronLocale {
      return ((this as unknown as { $nq: { locale: string } }).$nq?.locale ?? "en").startsWith("ar") ? "ar" : "en";
    },
    fire(this: ListState, name: string, detail: Record<string, unknown>) {
      this.hostEl?.dispatchEvent(new CustomEvent(name, { detail, bubbles: true }));
    },
    reading(this: ListState, cron: string): string {
      return describeCron(cron, this.lang) ?? (parseCron(cron).ok ? this.cfg.strings.custom : this.cfg.strings.invalid);
    },
    next(this: ListState, id: string, cron: string, zone?: string): string {
      if (!this.enabled[id]) return this.cfg.strings.off;
      const tz = zone && isValidTimeZone(zone) ? zone : "UTC";
      const at = nextRuns(cron, { from: this.cfg.now ?? Date.now(), count: 1, timeZone: tz })[0];
      if (!at) return this.cfg.strings.off;
      const locale = (this as unknown as { $nq: { locale: string } }).$nq?.locale ?? "en";
      return new Intl.DateTimeFormat(`${locale}-u-nu-latn`, { dateStyle: "medium", timeStyle: "short", timeZone: tz }).format(at);
    },
  }));
};

interface ListConfig {
  schedules: { id: string; name: string; cron: string; timeZone?: string | null; enabled: boolean }[];
  now?: number | null;
  strings: { custom: string; invalid: string; off: string };
}

interface ListState extends Magics {
  cfg: ListConfig;
  hostEl: HTMLElement | null;
  enabled: Record<string, boolean>;
  _seen: Record<string, boolean>;
  readonly lang: CronLocale;
  fire(name: string, detail: Record<string, unknown>): void;
}
