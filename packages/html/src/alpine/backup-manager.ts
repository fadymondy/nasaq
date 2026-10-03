// nqBackupManager: the state behind the Blade backup-manager. The history, summary and weekday names are rendered by the server;
// this holds the schedule + retention form, the live "what would be deleted" preview, and the actions.
//
//   <div data-slot="backup-manager" x-data="nqBackupManager({ schedule, retention, backups, now, strings })">
//     <x-nq::switch x-model="enabled"> <x-nq::select x-model="frequency"> <x-nq::select x-model="dayText">
//     <input x-model="time"> <input x-model="keepLast"> <input x-model="maxAge">  (the fields use x-model="timeBad" / "keepBad" / "ageBad")
//     <button x-on:click="runNow()"> <button x-on:click="askRestore(id, name)"> <button x-on:click="act('nq-backup-delete', id)"> <button x-on:click="save()">
//   </div>
//
// Nothing here talks to a server. Each action dispatches a bubbling, cancelable event from the root:
//   "nq-backup-run" {}   "nq-backup-restore" { id }   "nq-backup-save" { schedule, retention }   "nq-backup-download" { id }   "nq-backup-delete" { id }
// all with detail { resolve(result?), reject(message), waitUntil(promise) }. Nobody claimed it (no waitUntil / resolve / reject call, no preventDefault):
// it counts as done. Otherwise the control stays busy until the outcome; resolve({ error }) / reject(message) / a rejected promise shows the message.
//
// The wrapper's names (restoreOpen, restoreAck, timeBad...) differ from the inner components' names (`open`, `checked`, `invalid`, `value`) on purpose:
// x-model expressions are read in the scope of the element that carries them.
import { parseTime, pruneCandidates, validateRetention, type BackupRetention, type RetentionBackup } from "./backup-manager-logic";
import type { Magics, Register } from "./types";

type Frequency = "hourly" | "daily" | "weekly" | "monthly";

interface Config {
  schedule: { enabled: boolean; frequency: Frequency; time: string; dayOfWeek: number };
  retention: { keepLast: number; maxAgeDays: number };
  backups: Array<{ id: string; at: number; status: RetentionBackup["status"]; locked: boolean }>;
  now: number | null;
  strings: { prune0: string; prune1: string; prune2: string; pruneN: string; timeInvalid: string; saved: string; genericError: string; restoreTitle: string };
}

export interface BackupOutcome {
  error?: string;
}

interface State extends Magics {
  config: Config;
  root: HTMLElement;
  alive: boolean;
  enabled: boolean;
  frequency: Frequency;
  dayText: string;
  time: string;
  keepLast: string;
  maxAge: string;
  timeBad: boolean;
  keepBad: boolean;
  ageBad: boolean;
  error: string;
  notice: string;
  starting: boolean;
  saving: boolean;
  restoring: boolean;
  restoreOpen: boolean;
  restoreAck: boolean;
  restoreId: string;
  restoreName: string;
  retentionError: "keepLast" | "maxAgeDays" | null;
  timeError: string;
  retentionBad: boolean;
  dirty: boolean;
  canSave: boolean;
  pruneText: string;
  sync(): void;
  act(name: string, id?: string): Promise<boolean>;
}

/** Dispatches the event from `root` and waits for whoever claimed it. Resolves to an error message, or null on success. */
async function run(root: HTMLElement, name: string, detail: Record<string, unknown>, failed: string): Promise<string | null> {
  let claimed = false;
  let settle!: (outcome: BackupOutcome | void) => void;
  const outcome = new Promise<BackupOutcome | void>((resolve) => (settle = resolve));
  const full: Record<string, unknown> = {
    ...detail,
    resolve(result?: BackupOutcome) {
      claimed = true;
      settle(result);
    },
    reject(message?: string) {
      claimed = true;
      settle({ error: message || failed });
    },
    waitUntil(promise: Promise<unknown>) {
      claimed = true;
      Promise.resolve(promise).then(
        (result) => settle(result && typeof result === "object" ? (result as BackupOutcome) : undefined),
        (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" && e ? e : failed }),
      );
    },
  };
  const event = new CustomEvent(name, { detail: full, bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  if (!claimed && !event.defaultPrevented) return null;
  const result = await outcome;
  return result && typeof result === "object" && result.error ? result.error : null;
}

const norm = (s: { enabled: boolean; frequency: string; time: string; dayOfWeek: number }) =>
  JSON.stringify({ enabled: s.enabled, frequency: s.frequency, time: s.time, dayOfWeek: s.frequency === "weekly" ? s.dayOfWeek : undefined });

export const backupManager: Register = (Alpine) => {
  Alpine.data("nqBackupManager", (config: Config) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    enabled: config.schedule.enabled,
    frequency: config.schedule.frequency,
    dayText: String(config.schedule.dayOfWeek),
    time: config.schedule.time,
    keepLast: String(config.retention.keepLast),
    maxAge: String(config.retention.maxAgeDays),
    timeBad: false,
    keepBad: false,
    ageBad: false,
    error: "",
    notice: "",
    starting: false,
    saving: false,
    restoring: false,
    restoreOpen: false,
    restoreAck: false,
    restoreId: "",
    restoreName: "",
    retentionBad: false,
    timeError: "",
    dirty: false,
    canSave: false,
    pruneText: "",
    init(this: State) {
      this.root = this.$el;
      for (const key of ["enabled", "frequency", "dayText", "time", "keepLast", "maxAge"]) this.$watch(key, () => this.sync());
      this.$watch<boolean>("restoreOpen", (value) => {
        if (value) return;
        if (this.restoring) this.restoreOpen = true;
      });
      this.sync();
    },
    destroy(this: State) {
      this.alive = false;
    },
    /** Recomputes everything derived from the form: the invalid flags, the prune preview and whether Save is allowed. */
    sync(this: State) {
      const keep = Number(this.keepLast);
      const age = Number(this.maxAge);
      const draft: BackupRetention = { keepLast: keep, maxAgeDays: age };
      const problem = validateRetention(draft);
      this.retentionError = problem;
      this.retentionBad = problem !== null;
      this.keepBad = problem === "keepLast";
      this.ageBad = problem === "maxAgeDays";
      this.timeBad = !parseTime(this.time);
      this.timeError = this.timeBad ? this.config.strings.timeInvalid : "";
      const s = this.config.strings;
      if (problem) this.pruneText = "";
      else {
        const records = this.config.backups.map((b) => ({ id: b.id, createdAt: b.at, status: b.status, locked: b.locked }));
        const n = pruneCandidates(records, draft, this.config.now ?? Date.now()).length;
        this.pruneText = n === 0 ? s.prune0 : n === 1 ? s.prune1 : n === 2 ? s.prune2.replace("{n}", String(n)) : s.pruneN.replace("{n}", String(n));
      }
      const now = { enabled: this.enabled, frequency: this.frequency, time: this.time, dayOfWeek: Number(this.dayText) };
      const was = this.config.schedule;
      this.dirty = norm(now) !== norm(was) || keep !== this.config.retention.keepLast || age !== (this.config.retention.maxAgeDays ?? 0);
      this.canSave = this.dirty && !this.retentionBad && !this.timeBad;
    },
    /** Dispatches a one-id action (download, delete). Resolves to whether it succeeded; failures show in the error alert. */
    async act(this: State, name: string, id?: string) {
      this.error = "";
      this.notice = "";
      const message = await run(this.root, name, id === undefined ? {} : { id }, this.config.strings.genericError);
      if (!this.alive) return false;
      if (message) this.error = message;
      return !message;
    },
    async runNow(this: State) {
      if (this.starting) return;
      this.starting = true;
      await this.act("nq-backup-run");
      if (this.alive) this.starting = false;
    },
    async save(this: State) {
      if (!this.canSave || this.saving) return;
      this.saving = true;
      const detail = {
        schedule: { enabled: this.enabled, frequency: this.frequency, time: this.time, dayOfWeek: this.frequency === "weekly" ? Number(this.dayText) : undefined },
        retention: { keepLast: Number(this.keepLast), maxAgeDays: Number(this.maxAge) },
      };
      this.error = "";
      this.notice = "";
      const message = await run(this.root, "nq-backup-save", detail, this.config.strings.genericError);
      if (!this.alive) return;
      this.saving = false;
      if (message) this.error = message;
      else {
        this.notice = this.config.strings.saved;
        // The saved values are the new baseline until the server renders again.
        this.config.schedule = { enabled: this.enabled, frequency: this.frequency, time: this.time, dayOfWeek: Number(this.dayText) };
        this.config.retention = { keepLast: Number(this.keepLast), maxAgeDays: Number(this.maxAge) };
        this.sync();
      }
    },
    get restoreTitle(): string {
      const self = this as unknown as State;
      return self.config.strings.restoreTitle.replace("{name}", self.restoreName);
    },
    askRestore(this: State, id: string, name: string) {
      this.restoreId = id;
      this.restoreName = name;
      this.restoreAck = false;
      this.restoreOpen = true;
    },
    closeRestore(this: State) {
      if (!this.restoring) this.restoreOpen = false;
    },
    async restore(this: State) {
      if (!this.restoreAck || this.restoring || !this.restoreId) return;
      this.restoring = true;
      await this.act("nq-backup-restore", this.restoreId);
      if (!this.alive) return;
      this.restoring = false;
      this.restoreOpen = false;
    },
  }));
};
