// nqCurrentVisit: the visit in progress. The markup is the React CurrentVisit's (see the Blade component); the state lives here:
// the notes, the prescription rows, the follow-up date, the validation and the running timer. There is no backend: Finish validates, then
// dispatches a bubbling "finish" event and shows "saved" at once. The event detail carries `fail(message)`: call it to unlock the panel and show the message.
//
//   <div data-slot="current-visit" x-data="nqCurrentVisit({ startedAt: 1790672000000, serverNow: 1790672400000, today: '2026-09-29', locale: 'en', t: {…} })">…</div>
//
// Event: "finish" { notes, prescriptions: [{ id, drug, dose, frequency, days }], followUp: "YYYY-MM-DD" | null, fail }.
// State: notes, rx, followUp, attempted, done, error, locked. Config: notes, rx, startedAt and serverNow (epoch ms), frozen (do not tick),
// today (the server's date), followUpOptions, workingWeekdays, locale, t (needSomething, fixRx, required, invalid, failed, followUpOn with :n).

import { canFinish, followUpIso, formatElapsed, isBlankRx, validateRx, withoutBlankRx, type RxErrors, type VisitRx } from "./current-visit-logic";
import type { Magics, Register } from "./types";

export interface CurrentVisitConfig {
  notes?: string;
  rx?: Array<{ id: string; drug: string; dose: string; frequency: string; days: string | number }>;
  startedAt: number;
  serverNow: number;
  frozen?: boolean;
  today: string;
  followUpOptions?: number[];
  workingWeekdays?: number[];
  locale?: string;
  t: Record<string, string>;
}

interface VisitState extends Magics {
  notes: string;
  rx: VisitRx[];
  followUp: string | null;
  attempted: boolean;
  done: boolean;
  error: string | null;
  locked: boolean;
  cfg: CurrentVisitConfig;
  mountedAt: number;
  tick: number;
  timer: ReturnType<typeof setInterval> | undefined;
  counter: number;
  root: HTMLElement;
  verdict: { ok: boolean; reason?: string };
}

export const currentVisit: Register = (Alpine) => {
  Alpine.data("nqCurrentVisit", (config: CurrentVisitConfig) => ({
    notes: config.notes ?? "",
    rx: (config.rx ?? []).map((r) => ({ ...r })) as VisitRx[],
    followUp: null as string | null,
    attempted: false,
    done: false,
    error: null as string | null,
    locked: false,
    cfg: config,
    mountedAt: Date.now(),
    tick: Date.now(),
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    counter: 0,
    root: null as unknown as HTMLElement,
    init(this: VisitState) {
      this.root = this.$el;
      if (!this.cfg.frozen) this.timer = setInterval(() => (this.tick = Date.now()), 1000);
    },
    destroy(this: VisitState) {
      clearInterval(this.timer);
    },
    get elapsed(): string {
      const self = this as unknown as VisitState;
      const extra = self.cfg.frozen ? 0 : self.tick - self.mountedAt;
      return formatElapsed((self.cfg.serverNow - self.cfg.startedAt + extra) / 1000);
    },
    get verdict() {
      const self = this as unknown as VisitState;
      return canFinish(self.notes, self.rx);
    },
    get fixRx(): boolean {
      return this.attempted && (this as unknown as VisitState).verdict.reason === "invalid-prescription";
    },
    get needSomething(): boolean {
      return this.attempted && (this as unknown as VisitState).verdict.reason === "empty";
    },
    get followUpText(): string {
      const self = this as unknown as VisitState;
      if (!self.followUp) return "";
      const [y, m, d] = self.followUp.split("-").map(Number) as [number, number, number];
      const label = new Intl.DateTimeFormat(`${self.cfg.locale ?? "en"}-u-nu-latn`, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
      return (self.cfg.t.followUpOn ?? ":n").replace(":n", label);
    },
    errs(this: VisitState, r: VisitRx): RxErrors {
      return this.attempted && !isBlankRx(r) ? validateRx(r) : {};
    },
    errText(this: VisitState, e?: "required" | "invalid") {
      return e === "invalid" ? this.cfg.t.invalid : e === "required" ? this.cfg.t.required : "";
    },
    addRx(this: VisitState) {
      this.rx.push({ id: `rx-new-${++this.counter}`, drug: "", dose: "", frequency: "", days: "5" });
    },
    removeRx(this: VisitState, id: string) {
      this.rx = this.rx.filter((r) => r.id !== id);
    },
    pickDays(this: VisitState, n: number) {
      this.followUp = followUpIso(this.cfg.today, n, this.cfg.workingWeekdays);
    },
    chosen(this: VisitState, n: number): boolean {
      return this.followUp !== null && this.followUp === followUpIso(this.cfg.today, n, this.cfg.workingWeekdays);
    },
    finish(this: VisitState) {
      this.attempted = true;
      this.error = null;
      if (!this.verdict.ok) return;
      const detail = {
        notes: this.notes.trim(),
        prescriptions: withoutBlankRx(this.rx).map((r) => ({ id: r.id, drug: r.drug.trim(), dose: r.dose.trim(), frequency: r.frequency.trim(), days: Number(String(r.days).replace(/[^\d.]/g, "")) })),
        followUp: this.followUp,
        fail: (message?: string) => {
          this.done = false;
          this.locked = false;
          this.error = message || this.cfg.t.failed || null;
        },
      };
      this.done = true;
      this.locked = true;
      this.root.dispatchEvent(new CustomEvent("finish", { bubbles: true, detail }));
    },
  }));
};
