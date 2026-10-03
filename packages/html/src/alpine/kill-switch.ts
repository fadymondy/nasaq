// nqKillSwitch and nqKillSwitchAction: the state behind the Blade kill-switch components.
//
//   <section data-slot="kill-switch" x-data="nqKillSwitch({ failed, unpairTitle })">
//     <button x-on:click="stopOpen = true">…</button>                  opens the reason dialog (<x-nq::dialog x-model="stopOpen">)
//     <textarea x-model="reason"> … <x-nq::field x-model="reasonInvalid"> … <button x-on:click="stop()">
//     <button x-on:click="askUnpair(id, name)"> … <x-nq::alert-dialog x-model="unpairOpen"> … <button x-on:click="unpair()">
//   </section>
//   <div data-slot="paused-banner" x-data="nqKillSwitchAction({ failed })"><button x-bind="actionButton">Resume</button></div>
//
// Nothing here stops or resumes anything. Each action dispatches a bubbling, cancelable event from the root:
//   "nq-kill-switch-stop"    { reason,  resolve(result?), reject(message), waitUntil(promise) }
//   "nq-kill-switch-resume"  {          resolve(result?), reject(message), waitUntil(promise) }
//   "nq-kill-switch-unpair"  { id,      resolve(result?), reject(message), waitUntil(promise) }
// Nobody claimed it (no waitUntil / resolve / reject call, no preventDefault): it counts as done. Otherwise the control stays busy until the
// outcome: resolve() succeeds; resolve({ error }) / reject(message) / a rejected promise fails and shows the message.
//
// The wrapper's names (stopOpen, reasonInvalid, unpairOpen) differ from the inner dialog / field names (`open`, `invalid`) on purpose:
// x-model expressions are read in the scope of the element that carries them.
import type { Register } from "./types";

export interface KillSwitchOutcome {
  error?: string;
}

interface Config {
  failed: string;
  unpairTitle?: string;
}

/** Dispatches the event from `root` and waits for whoever claimed it. Resolves to an error message, or null on success. */
async function run(root: HTMLElement, name: string, detail: Record<string, unknown>, failed: string): Promise<string | null> {
  let claimed = false;
  let settle!: (outcome: KillSwitchOutcome | void) => void;
  const outcome = new Promise<KillSwitchOutcome | void>((resolve) => (settle = resolve));
  const full: Record<string, unknown> = {
    ...detail,
    resolve(result?: KillSwitchOutcome) {
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
        (result) => settle(result && typeof result === "object" ? (result as KillSwitchOutcome) : undefined),
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

interface RootState {
  root: HTMLElement;
  config: Config;
  alive: boolean;
  error: string;
  stopOpen: boolean;
  reason: string;
  reasonInvalid: boolean;
  stopError: string;
  busy: boolean;
  unpairOpen: boolean;
  unpairId: string;
  unpairName: string;
  unpairBusy: boolean;
  $el: HTMLElement;
  $watch<T>(key: string, fn: (value: T) => void): void;
  closeStop(): void;
}

export const killSwitch: Register = (Alpine) => {
  Alpine.data("nqKillSwitch", (config: Config = { failed: "" }) => ({
    config,
    root: null as unknown as HTMLElement,
    alive: true,
    error: "",
    stopOpen: false,
    reason: "",
    reasonInvalid: false,
    stopError: "",
    busy: false,
    unpairOpen: false,
    unpairId: "",
    unpairName: "",
    unpairBusy: false,
    init(this: RootState) {
      this.root = this.$el;
      this.$watch<boolean>("stopOpen", (value) => {
        if (value) return;
        if (this.busy) {
          // A running request keeps the dialog open.
          this.stopOpen = true;
          return;
        }
        this.reason = "";
        this.reasonInvalid = false;
        this.stopError = "";
      });
      this.$watch<boolean>("unpairOpen", (value) => {
        if (!value && this.unpairBusy) this.unpairOpen = true;
      });
    },
    destroy(this: RootState) {
      this.alive = false;
    },
    get unpairTitle(): string {
      const self = this as unknown as RootState;
      return (self.config.unpairTitle ?? "{name}").replace("{name}", self.unpairName);
    },
    clearReason(this: RootState) {
      if (this.reason.trim() !== "") this.reasonInvalid = false;
    },
    closeStop(this: RootState) {
      if (!this.busy) this.stopOpen = false;
    },
    async stop(this: RootState) {
      if (this.busy) return;
      const reason = this.reason.trim();
      if (reason === "") {
        this.reasonInvalid = true;
        return;
      }
      this.reasonInvalid = false;
      this.stopError = "";
      this.busy = true;
      const message = await run(this.root, "nq-kill-switch-stop", { reason }, this.config.failed);
      if (!this.alive) return;
      this.busy = false;
      if (message) this.stopError = message;
      else this.stopOpen = false;
    },
    async resume(this: RootState) {
      this.error = "";
      const message = await run(this.root, "nq-kill-switch-resume", {}, this.config.failed);
      if (this.alive && message) this.error = message;
    },
    askUnpair(this: RootState, id: string, name: string) {
      this.unpairId = id;
      this.unpairName = name;
      this.unpairOpen = true;
    },
    async unpair(this: RootState) {
      if (this.unpairBusy || !this.unpairId) return;
      this.unpairBusy = true;
      this.error = "";
      const message = await run(this.root, "nq-kill-switch-unpair", { id: this.unpairId }, this.config.failed);
      if (!this.alive) return;
      this.unpairBusy = false;
      if (message) this.error = message;
      this.unpairOpen = false;
    },
  }));

  // The paused banner: its Resume button.
  Alpine.data("nqKillSwitchAction", (config: Config = { failed: "" }) => ({
    busy: false,
    error: "",
    alive: true,
    config,
    destroy(this: { alive: boolean }) {
      this.alive = false;
    },
    async resume(this: { busy: boolean; error: string; alive: boolean; config: Config; $el: HTMLElement }) {
      if (this.busy) return;
      this.busy = true;
      this.error = "";
      const message = await run(this.$el.closest<HTMLElement>('[data-slot="paused-banner"]') ?? this.$el, "nq-kill-switch-resume", {}, this.config.failed);
      if (!this.alive) return;
      this.busy = false;
      this.error = message ?? "";
    },
    /** Bind on the Resume button. */
    actionButton: {
      ":aria-busy"(this: { busy: boolean }) {
        return this.busy ? "true" : undefined;
      },
      ":data-disabled"(this: { busy: boolean }) {
        return this.busy ? "" : undefined;
      },
      "x-on:click"(this: { resume(): Promise<void> }) {
        void this.resume();
      },
    },
  }));
};
