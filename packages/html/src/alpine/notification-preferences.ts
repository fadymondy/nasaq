// nqNotificationPreferences: the notification settings screen (kind by channel matrix, quiet hours, volume, digest, destinations).
// The markup is server-rendered (<x-nq::notification-preferences>); the state lives here. Every change is applied on screen at once,
// then sent on the root as a `save` event; a failed save puts the last saved state back. Saves run one after another.
//
//   <div x-data="nqNotificationPreferences({ … })" x-on:save="$event.detail.wait(savePrefs($event.detail.prefs))"> … </div>
//
//   save                 { prefs, wait }          resolve, or { error } to roll back. Nobody listening rolls back too.
//   request-push         { wait }                 resolve "granted" | "denied" | …; fired before push is turned on when `needsAsk`
//   add-destination      { kind, target, wait }   resolve, or { error }
//   remove-destination   { id, target, wait }     resolve, or { error }
//   test-destination     { id, target, kind, wait }  resolve { ok, message? }

import type { Magics, Register } from "./types";

type Channel = string;
type Kind = { id: string; locked: Channel[] };
type Prefs = {
  matrix: Record<string, Record<string, boolean | undefined>>;
  quietHours: { enabled: boolean; from: string; to: string };
  dailyCap: number | null;
  batching: string;
  digest: { enabled: boolean; frequency: string; time: string; day: number };
};
type Dest = { id: string; kind: string; target: string };
type Notice = { tone: "danger" | "warning" | "info"; text: string };
type Outcome = unknown;
type Config = {
  locale: string;
  now: string | null;
  kinds: Kind[];
  channels: Channel[];
  value: Prefs;
  needsAsk: boolean;
  labels: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  destinations: Dest[];
};

/** Fire `name` on the root and wait for the promise the host passes to `wait`. Throws when nobody does. */
async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

const failedWith = (r: Outcome): string | null => (r && typeof r === "object" && (r as { error?: string }).error ? (r as { error: string }).error : null);
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
const quietMinutes = (q: { from: string; to: string }) => {
  const d = minutesOf(q.to) - minutesOf(q.from);
  return d === 0 ? 0 : d > 0 ? d : d + 1440;
};
const capBad = (raw: string) => {
  const s = raw.trim();
  return s === "" ? false : !(/^\d+$/.test(s) && Number(s) >= 1 && Number(s) <= 1000);
};
function destinationProblem(kind: string, target: string): "empty" | "email" | "url" | "https" | null {
  const s = target.trim();
  if (!s) return "empty";
  if (kind === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s) ? null : "email";
  try {
    const u = new URL(s);
    if (u.protocol !== "https:") return "https";
    return u.hostname.includes(".") || u.hostname === "localhost" ? null : "url";
  } catch {
    return "url";
  }
}
function nextDigest(d: Prefs["digest"], now: Date): Date | null {
  if (!d.enabled) return null;
  const [h, m] = d.time.split(":").map(Number);
  const at = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h || 0, m || 0, 0, 0);
  if (d.frequency === "weekly") {
    let add = (d.day - at.getDay() + 7) % 7;
    if (add === 0 && at.getTime() <= now.getTime()) add = 7;
    at.setDate(at.getDate() + add);
  } else if (at.getTime() <= now.getTime()) {
    at.setDate(at.getDate() + 1);
  }
  return at;
}

const isLocked = (k: Kind, c: Channel) => k.locked.includes(c);
const cellOn = (p: Prefs, k: Kind, c: Channel) => isLocked(k, c) || !!p.matrix[k.id]?.[c];
function colState(p: Prefs, kinds: Kind[], c: Channel): "all" | "none" | "some" {
  const free = kinds.filter((k) => !isLocked(k, c));
  const on = free.filter((k) => !!p.matrix[k.id]?.[c]).length;
  return free.length === 0 || on === 0 ? "none" : on === free.length ? "all" : "some";
}

interface State extends Magics {
  config: Config;
  draft: Prefs;
  saved: Prefs;
  chain: Promise<void>;
  generation: number;
  pending: number;
  alive: boolean;
  root: HTMLElement | null;
  cells: Record<string, boolean>;
  colOn: Record<string, boolean>;
  colSome: Record<string, boolean>;
  quietOn: boolean;
  quietFrom: string;
  quietTo: string;
  capOn: boolean;
  capText: string;
  capTouched: boolean;
  capInvalid: boolean;
  batching: string;
  digestOn: boolean;
  frequency: string;
  day: string;
  digestTime: string;
  state: "idle" | "saving" | "saved";
  status: string;
  notice: Notice | null;
  asking: boolean;
  quietSummary: string;
  nextText: string;
  nextIso: string;
  labels: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  newKind: string;
  newTarget: string;
  attempted: boolean;
  serverError: string | null;
  adding: boolean;
  testing: string | null;
  results: Record<string, { ok: boolean; text: string }>;
  removed: Record<string, boolean>;
  destError: string | null;
  targetBad: boolean;
  targetError: string;
  visibleCount: number;
  sync(): void;
  texts(): void;
  propose(): Prefs;
  reconcile(): Promise<void>;
  colChanged(): void;
  commit(next: Prefs): void;
  saveCap(): void;
  deriveTarget(): void;
  addDestination(): Promise<void>;
  test(id: string): Promise<void>;
  remove(id: string): Promise<void>;
  find(id: string): Dest | undefined;
}

export const notificationPreferences: Register = (Alpine) => {
  Alpine.data("nqNotificationPreferences", (config: Config) => {
    const start = clone(config.value);
    return {
      config,
      draft: clone(start),
      saved: clone(start),
      chain: Promise.resolve(),
      generation: 0,
      pending: 0,
      alive: true,
      root: null as HTMLElement | null,
      cells: {} as Record<string, boolean>,
      colOn: {} as Record<string, boolean>,
      colSome: {} as Record<string, boolean>,
      quietOn: start.quietHours.enabled,
      quietFrom: start.quietHours.from,
      quietTo: start.quietHours.to,
      capOn: start.dailyCap !== null,
      capText: start.dailyCap === null ? "" : String(start.dailyCap),
      capTouched: false,
      capInvalid: false,
      batching: start.batching,
      digestOn: start.digest.enabled,
      frequency: start.digest.frequency,
      day: String(start.digest.day),
      digestTime: start.digest.time,
      state: "idle" as "idle" | "saving" | "saved",
      status: "",
      notice: null as Notice | null,
      asking: false,
      quietSummary: "",
      nextText: "",
      nextIso: "",
      labels: config.labels,
      newKind: "email",
      newTarget: "",
      attempted: false,
      serverError: null as string | null,
      adding: false,
      testing: null as string | null,
      results: {} as Record<string, { ok: boolean; text: string }>,
      removed: {} as Record<string, boolean>,
      destError: null as string | null,
      targetBad: false,
      targetError: "",
      visibleCount: config.destinations.length,

      init(this: State) {
        this.root = this.$el;
        this.sync();
        this.$watch("cells", () => void this.reconcile());
        this.$watch("colOn", () => this.colChanged());
        for (const key of ["quietOn", "quietFrom", "quietTo", "capOn", "batching", "digestOn", "frequency", "day", "digestTime"]) this.$watch(key, () => void this.reconcile());
        this.$watch("capText", () => {
          this.capInvalid = this.capTouched && (capBad(this.capText) || (this.capOn && this.capText.trim() === ""));
        });
        this.$watch("newKind", () => {
          this.serverError = null;
          this.deriveTarget();
        });
        this.$watch("newTarget", () => {
          this.serverError = null;
          this.deriveTarget();
        });
      },
      destroy(this: State) {
        this.alive = false;
      },

      /** Put every control back in line with the draft. */
      sync(this: State) {
        const d = this.draft;
        const cells: Record<string, boolean> = {};
        this.config.kinds.forEach((k, i) => {
          for (const c of this.config.channels) cells[`${i}|${c}`] = cellOn(d, k, c);
        });
        this.cells = cells;
        for (const c of this.config.channels) {
          const s = colState(d, this.config.kinds, c);
          this.colOn[c] = s === "all";
          this.colSome[c] = s === "some";
        }
        this.quietOn = d.quietHours.enabled;
        this.quietFrom = d.quietHours.from;
        this.quietTo = d.quietHours.to;
        this.capOn = d.dailyCap !== null;
        this.capText = d.dailyCap === null ? "" : String(d.dailyCap);
        this.batching = d.batching;
        this.digestOn = d.digest.enabled;
        this.frequency = d.digest.frequency;
        this.day = String(d.digest.day);
        this.digestTime = d.digest.time;
        this.capInvalid = false;
        this.texts();
      },
      texts(this: State) {
        const L = this.config.labels;
        const d = this.draft;
        const minutes = quietMinutes(d.quietHours);
        if (minutes === 0) this.quietSummary = L.quietNone;
        else {
          const hours = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(Math.round((minutes / 60) * 10) / 10);
          this.quietSummary = `${String(L.quietLength).replace("{x}", hours)}${d.quietHours.from > d.quietHours.to ? `. ${L.quietOvernight}` : ""}. ${L.quietUrgent}`;
        }
        const next = nextDigest(d.digest, this.config.now ? new Date(this.config.now) : new Date());
        this.nextIso = next ? next.toISOString() : "";
        this.nextText = next ? new Intl.DateTimeFormat(this.config.locale, { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(next) : "";
        this.status = this.state === "saving" ? L.saving : this.state === "saved" ? L.saved : "";
      },

      /** The prefs the controls describe right now. */
      propose(this: State): Prefs {
        const next = clone(this.draft);
        this.config.kinds.forEach((k, i) => {
          for (const c of this.config.channels) {
            if (isLocked(k, c)) continue;
            const on = !!this.cells[`${i}|${c}`];
            if (on !== !!next.matrix[k.id]?.[c]) next.matrix = { ...next.matrix, [k.id]: { ...next.matrix[k.id], [c]: on } };
          }
        });
        next.quietHours = { enabled: !!this.quietOn, from: this.quietFrom, to: this.quietTo };
        if (this.capOn !== (next.dailyCap !== null)) next.dailyCap = this.capOn ? 20 : null;
        next.batching = this.batching;
        next.digest = { enabled: !!this.digestOn, frequency: this.frequency, time: this.digestTime, day: Number(this.day) };
        return next;
      },
      colChanged(this: State) {
        for (const c of this.config.channels) {
          if (!!this.colOn[c] === (colState(this.draft, this.config.kinds, c) === "all")) continue;
          this.config.kinds.forEach((k, i) => {
            if (!isLocked(k, c)) this.cells[`${i}|${c}`] = !!this.colOn[c];
          });
        }
        void this.reconcile();
      },
      /** A control changed: turn the difference into a save, asking the browser first when push goes on. */
      async reconcile(this: State) {
        if (this.asking || !this.root) return;
        const next = this.propose();
        if (JSON.stringify(next) === JSON.stringify(this.draft)) return;
        const L = this.config.labels;
        const pushOn = this.config.needsAsk && this.config.kinds.some((k) => !this.draft.matrix[k.id]?.push && next.matrix[k.id]?.push);
        if (pushOn) {
          this.asking = true;
          this.notice = { tone: "info", text: L.pushAsking };
          try {
            const answer = await ask(this.root, "request-push", {});
            if (answer !== "granted") {
              this.notice = { tone: "warning", text: answer === "denied" ? L.pushBlocked : L.pushDenied };
              this.sync();
              return;
            }
          } catch {
            this.notice = { tone: "warning", text: L.pushDenied };
            this.sync();
            return;
          } finally {
            this.asking = false;
          }
        }
        if (next.dailyCap !== this.draft.dailyCap) this.capTouched = false;
        this.commit(next);
      },
      commit(this: State, next: Prefs) {
        this.draft = next;
        this.notice = null;
        this.state = "saving";
        this.sync();
        const gen = this.generation;
        this.pending += 1;
        this.chain = this.chain.then(async () => {
          let ok = true;
          try {
            if (gen !== this.generation) return; // an earlier save failed and this one was rolled back with it
            const result = await ask(this.root!, "save", { prefs: clone(next) });
            const error = failedWith(result);
            if (error) throw new Error(error);
            this.saved = clone(next);
          } catch (e) {
            ok = false;
            this.generation += 1;
            this.draft = clone(this.saved);
            this.notice = { tone: "danger", text: e instanceof Error && e.message && e.message !== "no listener" ? e.message : this.config.labels.failed };
          } finally {
            this.pending -= 1;
            if (this.pending === 0 && this.alive) this.state = ok && gen === this.generation ? "saved" : "idle";
            if (this.alive) this.sync();
          }
        });
      },

      saveCap(this: State) {
        this.capTouched = true;
        const bad = capBad(this.capText) || (this.capOn && this.capText.trim() === "");
        this.capInvalid = bad;
        if (bad) return;
        const n = Number(this.capText);
        if (n !== this.draft.dailyCap) this.commit({ ...this.draft, dailyCap: n });
      },

      find(this: State, id: string) {
        return this.config.destinations.find((d) => d.id === id);
      },
      deriveTarget(this: State) {
        const problem = destinationProblem(this.newKind, this.newTarget);
        const text = this.serverError ?? (this.attempted && problem ? this.config.labels.problem[problem] : "");
        this.targetError = text ?? "";
        this.targetBad = !!this.targetError;
      },
      async addDestination(this: State) {
        this.attempted = true;
        this.serverError = null;
        this.deriveTarget();
        if (destinationProblem(this.newKind, this.newTarget) || !this.root) return;
        this.adding = true;
        try {
          const error = failedWith(await ask(this.root, "add-destination", { kind: this.newKind, target: this.newTarget.trim() }));
          if (error) {
            this.serverError = error;
            this.deriveTarget();
          } else {
            this.newTarget = "";
            this.attempted = false;
            this.serverError = null;
            this.deriveTarget();
          }
        } catch {
          this.serverError = this.config.labels.destFailed;
          this.deriveTarget();
        } finally {
          this.adding = false;
        }
      },
      async test(this: State, id: string) {
        const d = this.find(id);
        if (!d || !this.root) return;
        this.testing = id;
        const L = this.config.labels;
        try {
          const r = (await ask(this.root, "test-destination", { id, target: d.target, kind: d.kind })) as { ok?: boolean; message?: string } | undefined;
          this.results = { ...this.results, [id]: { ok: !!r?.ok, text: r?.ok ? L.testOk : (r?.message ?? L.testFailed) } };
        } catch {
          this.results = { ...this.results, [id]: { ok: false, text: L.testFailed } };
        } finally {
          this.testing = null;
        }
      },
      async remove(this: State, id: string) {
        const d = this.find(id);
        if (!d || !this.root) return;
        this.destError = null;
        try {
          const error = failedWith(await ask(this.root, "remove-destination", { id, target: d.target }));
          if (error) this.destError = error;
          else {
            this.removed = { ...this.removed, [id]: true };
            this.visibleCount = this.config.destinations.filter((x) => !this.removed[x.id]).length;
          }
        } catch {
          this.destError = this.config.labels.destFailed;
        }
      },
    };
  });
};
