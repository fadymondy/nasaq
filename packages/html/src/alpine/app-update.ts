// nqAppUpdate, nqAppUpdateSheet, nqReleaseManager: the behaviour behind the Blade app-update components (pill, sheet, forced gate, release manager).
// The markup is the React component's; the state lives here. Nothing here downloads or restarts: you drive the state and answer the events.
//
//   pill / gate: <button x-data="nqAppUpdate({ status, progress, speed, size, locale, t })" x-on:nq-update-state.window="set($event.detail)">…</button>
//   sheet:       <div x-data="nqAppUpdateSheet({ open, status, progress, speed, size, locale, t })" x-modelable="open">…teleported panel…</div>
//   manager:     <section x-data="nqReleaseManager({ min, latest, usage, locale, t })">…</section>
//
// State comes in from the server render and then from a window event: dispatch
//   new CustomEvent("nq-update-state", { detail: { status: "downloading", progress: 42, speed: 3_200_000 } })
// (any field is optional) and every pill, sheet and gate on the page follows.
//
// The sheet and gate dispatch bubbling events from their root: "nq-update-download", "nq-update-restart" and (sheet) "nq-update-later".
// The release manager dispatches bubbling, cancelable events that carry the wallet-style outcome helpers
//   "nq-release-min-build" { build, resolve(result?), reject(message), waitUntil(promise) }
//   "nq-release-publish"   { id, resolve, reject, waitUntil }
//   "nq-release-rollback"  { id, resolve, reject, waitUntil }
// Nobody claimed it (no waitUntil / resolve / reject call, no preventDefault): it counts as done. resolve({ error }) / reject(message) / a rejected
// promise shows the error.

import { clampUpdatePercent, countBelow, formatUpdateSize, formatUpdateSpeed, formatUpdateTime, minBuildProblem, secondsLeft, type UpdateStatus } from "./app-update-logic";
import type { Magics, Register } from "./types";

type Words = Record<string, string>;

interface UpdateConfig {
  status?: UpdateStatus;
  progress?: number;
  speed?: number | null;
  /** Release size in bytes. */
  size?: number | null;
  locale?: string;
  t: Words;
  open?: boolean;
}

const fill = (text: string | undefined, values: Record<string, string | number>) => (text ?? "").replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));

export interface UpdateOutcome {
  error?: string;
}

/** Dispatches a cancelable event whose detail can claim the work, and resolves with the outcome (undefined when nobody claimed it). */
function claim(root: HTMLElement, name: string, extra: Record<string, unknown>): Promise<UpdateOutcome | void> {
  let claimed = false;
  let settle!: (outcome: UpdateOutcome | void) => void;
  const outcome = new Promise<UpdateOutcome | void>((resolve) => (settle = resolve));
  const detail: Record<string, unknown> = {
    ...extra,
    resolve(result?: UpdateOutcome) {
      claimed = true;
      settle(result);
    },
    reject(message?: string) {
      claimed = true;
      settle({ error: message || undefined });
    },
    waitUntil(promise: Promise<unknown>) {
      claimed = true;
      Promise.resolve(promise).then(
        (result) => settle(result && typeof result === "object" ? (result as UpdateOutcome) : undefined),
        (e) => settle({ error: e instanceof Error && e.message ? e.message : typeof e === "string" ? e : undefined }),
      );
    },
  };
  const event = new CustomEvent(name, { detail, bubbles: true, cancelable: true });
  root.dispatchEvent(event);
  return claimed || event.defaultPrevented ? outcome : Promise.resolve();
}

interface UpdateState extends Magics {
  status: UpdateStatus;
  progress: number;
  speed: number | null;
  size: number | null;
  locale: string;
  t: Words;
  root: HTMLElement;
  percent(): number;
  rounded(): number;
}

function base(config: UpdateConfig) {
  return {
    status: (config.status ?? "available") as UpdateStatus,
    progress: config.progress ?? 0,
    speed: config.speed ?? null,
    size: config.size ?? null,
    locale: config.locale ?? "en",
    t: config.t,
    root: null as unknown as HTMLElement,
    init(this: UpdateState) {
      this.root = this.$el;
    },
    /** Takes { status, progress, speed } from the "nq-update-state" window event. */
    set(this: UpdateState, detail?: { status?: UpdateStatus; progress?: number; speed?: number | null }) {
      if (!detail) return;
      if (detail.status !== undefined) this.status = detail.status;
      if (detail.progress !== undefined) this.progress = detail.progress;
      if (detail.speed !== undefined) this.speed = detail.speed;
    },
    percent(this: UpdateState) {
      return clampUpdatePercent(this.progress);
    },
    /** The whole percent shown in the pill. */
    rounded(this: UpdateState) {
      return Math.round(this.percent());
    },
    pillText(this: UpdateState) {
      const map = {
        available: this.t.pillAvailable,
        downloading: fill(this.t.pillDownloading, { percent: this.rounded() }),
        ready: this.t.pillReady,
        error: this.t.pillError,
      };
      return map[this.status];
    },
    speedText(this: UpdateState) {
      return this.speed ? formatUpdateSpeed(this.speed, this.locale) : "";
    },
    leftText(this: UpdateState) {
      if (!this.size || !this.speed) return "";
      const left = secondsLeft(this.size, (this.size * this.percent()) / 100, this.speed);
      return left === null ? "" : `${formatUpdateTime(left)} ${this.t.remaining}`;
    },
    sizeText(this: UpdateState) {
      return this.size ? formatUpdateSize(this.size, this.locale) : "";
    },
    download(this: UpdateState) {
      this.root.dispatchEvent(new CustomEvent("nq-update-download", { bubbles: true }));
    },
    restart(this: UpdateState) {
      this.root.dispatchEvent(new CustomEvent("nq-update-restart", { bubbles: true }));
    },
  };
}

interface SheetState extends UpdateState {
  open: boolean;
  close(): void;
}

export const appUpdate: Register = (Alpine) => {
  // The pill and the forced gate.
  Alpine.data("nqAppUpdate", (config: UpdateConfig) => base(config));

  // The sheet: the same state plus the dialog's open / close and popup bindings (the content is teleported, so it carries its own bindings).
  Alpine.data("nqAppUpdateSheet", (config: UpdateConfig) => ({
    ...base(config),
    open: Boolean(config.open),
    show(this: SheetState) {
      this.open = true;
    },
    close(this: SheetState) {
      this.open = false;
    },
    toggle(this: SheetState) {
      this.open = !this.open;
    },
    /** "Later": tells you, then closes the sheet. */
    later(this: SheetState) {
      this.root.dispatchEvent(new CustomEvent("nq-update-later", { bubbles: true }));
      this.open = false;
    },
    popup: {
      role: "dialog",
      "aria-modal": "true",
      tabindex: "-1",
      ":aria-labelledby"(this: Magics) {
        return this.$id("nq-dialog", "title");
      },
      ":aria-describedby"(this: Magics) {
        return this.$id("nq-dialog", "description");
      },
      "x-on:keydown.escape.prevent.stop"(this: SheetState) {
        this.close();
      },
    },
  }));

  // The release manager: the minimum supported build, and publish / roll back per row.
  Alpine.data(
    "nqReleaseManager",
    (config: { min: number; latest: number; usage?: { build: number; users: number }[]; locale?: string; t: Words }) => ({
      min: config.min,
      latest: config.latest,
      usage: config.usage ?? [],
      locale: config.locale ?? "en",
      t: config.t,
      draft: String(config.min),
      saving: false,
      notice: "",
      pending: "",
      root: null as unknown as HTMLElement,
      init(this: Magics & { root: HTMLElement }) {
        this.root = this.$el;
      },
      value(this: { draft: string }) {
        return this.draft.trim() === "" ? Number.NaN : Number(this.draft);
      },
      problem(this: { value(): number; latest: number }) {
        return minBuildProblem(this.value(), this.latest);
      },
      changed(this: { value(): number; min: number }) {
        return this.value() !== this.min;
      },
      blocked(this: { value(): number; problem(): string | null; usage: { build: number; users: number }[] }) {
        return this.usage.length && !this.problem() ? countBelow(this.usage, this.value()) : 0;
      },
      blockedText(this: { blocked(): number; locale: string; t: Words }) {
        return fill(this.t.blocked, { count: new Intl.NumberFormat(this.locale, { numberingSystem: "latn" }).format(this.blocked()) });
      },
      hint(this: { problem(): string | null; t: Words }) {
        const problem = this.problem();
        return problem === "invalid" ? this.t.invalid : problem === "too-high" ? this.t.tooHigh : this.t.minBuildHint;
      },
      /** True when the save button must be off. */
      cannotSave(this: { problem(): string | null; changed(): boolean; saving: boolean }) {
        return Boolean(this.problem()) || !this.changed() || this.saving;
      },
      async save(this: { problem(): string | null; value(): number; saving: boolean; notice: string; min: number; root: HTMLElement; t: Words }) {
        if (this.problem() || this.saving) return;
        this.saving = true;
        this.notice = "";
        const build = this.value();
        try {
          const result = await claim(this.root, "nq-release-min-build", { build });
          if (result && result.error) this.notice = result.error;
          else {
            this.notice = this.t.saved ?? "";
            this.min = build;
          }
        } finally {
          this.saving = false;
        }
      },
      /** Publish or roll back one row. `key` names the busy button, `name` is the event. */
      async act(this: { pending: string; root: HTMLElement }, key: string, name: string, id: string) {
        if (this.pending) return;
        this.pending = key;
        try {
          await claim(this.root, name, { id });
        } finally {
          this.pending = "";
        }
      },
    }),
  );
};
