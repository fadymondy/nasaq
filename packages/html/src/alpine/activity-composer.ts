// nqActivityComposer and nqActivityTimeline: the behaviour of the React ActivityComposer and ActivityTimeline. The markup is the Blade components'
// (<x-nq::activity-composer> and <x-nq::activity-composer.timeline>); this adds the form state, validation and the events the host listens to.
//
//   <form data-slot="activity-composer" x-data="nqActivityComposer({ kind: 'note', when: '2026-09-29T09:00', t: { bodyLabel, bodyHint, whenLabel, submit, errors, failed } })" x-on:submit.prevent="submit()">
//   <div data-slot="activity-timeline" x-data="nqActivityTimeline({ ids: ['a1', 'a2'], labels: { failed } })"> … toggleTask(0, true) / removeActivity(1) … </div>
//
// Each action fires an event on the root with detail `{ …, wait(promise) }`; resolve the promise, or resolve `{ error }` to show the message
// (a rejected promise shows a generic error). Without a listener the action fails with that message.
//   nq-activity-submit  { kind, body, at: Date, atLocal, durationMinutes?, wait }   (composer; the form clears after a good save)
//   nq-activity-toggle  { id, done, wait }                                          (timeline; a failed tick is put back)
//   nq-activity-delete  { id, wait }                                                (timeline)

import { fromLocalInput, toLocalInput, validateActivity, type ComposableKind } from "./activity-composer-logic";
import type { Magics, Register } from "./types";

type Outcome = void | { error?: string } | undefined;

async function ask(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<Outcome> {
  let pending: Promise<Outcome> | undefined;
  root.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } }));
  if (!pending) throw new Error("no listener");
  return pending;
}

interface ComposerConfig {
  kind: ComposableKind;
  when: string;
  t: {
    bodyLabel: Record<string, string>;
    bodyHint: Record<string, string>;
    whenLabel: Record<string, string>;
    submit: Record<string, string>;
    errors: { empty: string; badDate: string; badDuration: string };
    failed: string;
  };
}

interface ComposerState extends Magics {
  t: ComposerConfig["t"];
  kind: ComposableKind;
  body: string;
  when: string;
  duration: string;
  busy: boolean;
  error: string | null;
  alive: boolean;
  root: HTMLElement;
  timed: boolean;
}

interface TimelineConfig {
  ids: string[];
  labels?: { failed?: string };
}

interface TimelineState extends Magics {
  config: TimelineConfig;
  root: HTMLElement;
  alive: boolean;
  busy: boolean;
  error: string | null;
  run(name: string, detail: Record<string, unknown>): Promise<boolean>;
}

export const activityComposer: Register = (Alpine) => {
  Alpine.data("nqActivityComposer", (cfg: ComposerConfig) => ({
    t: cfg.t,
    kind: cfg.kind,
    body: "",
    when: cfg.when,
    duration: "",
    busy: false,
    error: null as string | null,
    alive: true,
    root: null as unknown as HTMLElement,
    init(this: ComposerState) {
      // $el inside a handler is the element that fired the event, so keep the root.
      this.root = this.$el;
    },
    destroy(this: ComposerState) {
      this.alive = false;
    },
    /** Calls and meetings have a duration. */
    get timed(): boolean {
      const self = this as unknown as ComposerState;
      return self.kind === "call" || self.kind === "meeting";
    },
    async submit(this: ComposerState) {
      if (this.busy) return;
      const minutes = this.timed && this.duration.trim() !== "" ? Number(this.duration) : undefined;
      const at = fromLocalInput(this.when);
      const problem = validateActivity({ kind: this.kind, body: this.body, at, durationMinutes: minutes ?? null });
      if (problem) {
        this.error = this.t.errors[problem];
        return;
      }
      this.busy = true;
      this.error = null;
      try {
        const result = await ask(this.root, "nq-activity-submit", {
          kind: this.kind,
          body: this.body.trim(),
          at,
          atLocal: this.when,
          ...(minutes !== undefined ? { durationMinutes: minutes } : {}),
        });
        if (!this.alive) return;
        if (result && "error" in result && result.error) {
          this.error = result.error;
          return;
        }
        this.body = "";
        this.duration = "";
        this.when = toLocalInput(new Date());
      } catch {
        if (this.alive) this.error = this.t.failed;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
  }));

  Alpine.data("nqActivityTimeline", (config: TimelineConfig = { ids: [] }) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    busy: false,
    error: null as string | null,
    init(this: TimelineState) {
      this.root = this.$el;
    },
    destroy(this: TimelineState) {
      this.alive = false;
    },
    /** Tick or untick the task at this position of the list. A button passes its element so a refused tick can be put back. */
    async toggleTask(this: TimelineState, index: number, done: boolean, el?: HTMLElement) {
      const id = this.config.ids[index];
      if (id === undefined) return;
      const ok = await this.run("nq-activity-toggle", { id, done });
      if (ok || !this.alive || !el) return;
      const box = el.closest<HTMLElement>("[data-activity-id]")?.querySelector<HTMLElement>('[role="checkbox"]') ?? el;
      const alpine = (window as unknown as { Alpine?: { $data(el: Element): { checked?: boolean } } }).Alpine;
      const data = alpine ? alpine.$data(box) : null;
      if (data) data.checked = !done;
    },
    async removeActivity(this: TimelineState, index: number) {
      const id = this.config.ids[index];
      if (id !== undefined) await this.run("nq-activity-delete", { id });
    },
    /** Run an action; true on success. The message of a refusal lands in `error`. */
    async run(this: TimelineState, name: string, detail: Record<string, unknown>) {
      this.error = null;
      this.busy = true;
      let ok = false;
      try {
        const result = await ask(this.root, name, detail);
        if (!this.alive) return false;
        if (result && "error" in result && result.error) this.error = result.error;
        else ok = true;
      } catch {
        if (this.alive) this.error = this.config.labels?.failed ?? "That did not work. Try again.";
      } finally {
        if (this.alive) this.busy = false;
      }
      return ok;
    },
  }));
};
