// nqDeployView: the live durations, cancel and retry of the deploy view. The markup is the React DeployView's (see the Blade component).
//
//   <section x-data="nqDeployView({ units, genericError, steps: [{ id, status, startedAt, durationMs }] })"
//            @retry="$event.detail.wait(…)" @cancel="$event.detail.wait(…)"> … </section>
//
// A 1s ticker runs while a step is running and rewrites the duration elements ([data-step-duration="id"], [data-deploy-total]).
// Events on the root, detail `{ …, wait(promise) }`; resolve, or resolve { error }:
//   cancel  {}              retry  { stepId }

import type { Magics, Register } from "./types";

type Units = { ms: string; s: string; m: string; h: string };
interface StepConfig {
  id: string;
  status: string;
  startedAt?: number | string | null;
  durationMs?: number | null;
}
type Outcome = { error?: string } | void | undefined;

export function formatDuration(ms: number, units: Units): string {
  if (!Number.isFinite(ms) || ms < 0) return "-";
  if (ms < 1000) return `${Math.round(ms)}${units.ms}`;
  const seconds = ms / 1000;
  if (Math.round(seconds) < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}${units.s}`;
  const totalMinutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds - totalMinutes * 60);
  const [m, s] = rest === 60 ? [totalMinutes + 1, 0] : [totalMinutes, rest];
  if (m < 60) return `${m}${units.m} ${String(s).padStart(2, "0")}${units.s}`;
  return `${Math.floor(m / 60)}${units.h} ${String(m % 60).padStart(2, "0")}${units.m}`;
}

const toMs = (t: number | string) => (typeof t === "number" ? t : Date.parse(t));

export function stepDuration(step: StepConfig, now: number): number | undefined {
  if (step.status === "running" && step.startedAt != null) return Math.max(0, now - toMs(step.startedAt));
  return step.durationMs ?? undefined;
}

interface DeployState extends Magics {
  config: { units: Units; genericError: string; steps: StepConfig[] };
  errors: Record<string, string>;
  retrying: Record<string, boolean>;
  cancelling: boolean;
  timer: ReturnType<typeof setInterval> | null;
  alive: boolean;
  root: HTMLElement | null;
  tick(): void;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  cancel(): Promise<void>;
  retry(stepId: string): Promise<void>;
}

export const deployView: Register = (Alpine) => {
  Alpine.data("nqDeployView", (config: DeployState["config"]) => ({
    config,
    errors: {} as Record<string, string>,
    retrying: {} as Record<string, boolean>,
    cancelling: false,
    timer: null as ReturnType<typeof setInterval> | null,
    alive: true,
    root: null as HTMLElement | null,
    init(this: DeployState) {
      this.root = this.$el;
      if (this.config.steps.some((s) => s.status === "running")) {
        this.tick();
        this.timer = setInterval(() => this.tick(), 1000);
      }
    },
    destroy(this: DeployState) {
      this.alive = false;
      if (this.timer) clearInterval(this.timer);
    },
    /** Rewrites the step durations and the total from the clock. */
    tick(this: DeployState) {
      const now = Date.now();
      let total = 0;
      for (const s of this.config.steps) {
        const d = stepDuration(s, now);
        total += d ?? 0;
        if (s.status !== "running") continue;
        const el = this.root?.querySelector(`[data-step-duration="${CSS.escape(s.id)}"]`);
        if (el && d !== undefined) el.textContent = formatDuration(d, this.config.units);
      }
      const totalEl = this.root?.querySelector("[data-deploy-total]");
      if (totalEl) totalEl.textContent = formatDuration(total, this.config.units);
    },
    async ask(this: DeployState, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, cancelable: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async cancel(this: DeployState) {
      if (this.cancelling) return;
      this.cancelling = true;
      try {
        await this.ask("cancel", {});
      } catch {
        /* the host owns the failure */
      } finally {
        if (this.alive) this.cancelling = false;
      }
    },
    async retry(this: DeployState, stepId: string) {
      if (this.retrying[stepId]) return;
      this.retrying = { ...this.retrying, [stepId]: true };
      this.errors = { ...this.errors, [stepId]: "" };
      try {
        const result = await this.ask("retry", { stepId });
        if (this.alive && result && result.error) this.errors = { ...this.errors, [stepId]: result.error };
      } catch {
        if (this.alive) this.errors = { ...this.errors, [stepId]: this.config.genericError };
      } finally {
        if (this.alive) this.retrying = { ...this.retrying, [stepId]: false };
      }
    },
  }));
};
