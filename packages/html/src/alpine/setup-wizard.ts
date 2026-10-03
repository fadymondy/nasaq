// nqSetupWizard: a first-run wizard with a step rail, Back / Continue / Skip and a finish gate the server controls. The markup is the
// Blade setup-wizard component (a rail of steps, a header, the step bodies, the gate and error alerts, the footer, the done screen).
//
//   <div data-slot="setup-wizard" x-data="nqSetupWizard({ steps: [{ id: 'name', title: 'Name' }, { id: 'agent', title: 'Agent' }], current: 0, completed: ['name'], canFinish: true })"
//        x-on:nq-step-complete="$event.detail.waitUntil(save($event.detail.stepId))" x-on:nq-finish="$event.detail.waitUntil(finish())"> ... </div>
//
// Events, all bubbling from the root:
//   nq-step-complete { stepId, waitUntil }  leaving a step forward; resolve { error } to stay put and show why
//   nq-finish { waitUntil }                 the last step's Finish; resolve { error } if the server refuses
//   nq-step-change { index, stepId }        after Back, Continue, Skip or a click on the rail
// State to drive from outside: setReady(id, bool) holds Continue while a step's work is open, setCompleted(ids) and
// setCanFinish(ok, message) are the server's verdict on the finish gate. The step bodies are `[data-slot="setup-wizard-step"]` blocks
// shown with stepId().

import { clampStep, missingSteps, setupProgress } from "./setup-wizard-logic";
import type { Magics, Register } from "./types";

const STRINGS = {
  en: { stepOf: "Step {current} of {total}", failed: "Something went wrong. Try again.", gate: "Finish these steps first", complete: "Completed", current: "Current step", upcoming: "Upcoming" },
  ar: { stepOf: "الخطوة {current} من {total}", failed: "حدث خطأ ما. حاول مرة أخرى.", gate: "أكمل هذه الخطوات أولًا", complete: "مكتملة", current: "الخطوة الحالية", upcoming: "قادمة" },
};

interface Step {
  id: string;
  title: string;
  description?: string;
  optional?: boolean;
  ready?: boolean;
}
interface Config {
  steps?: Step[];
  current?: number;
  completed?: string[] | null;
  canFinish?: boolean;
  gateMessage?: string | null;
  labels?: Partial<Record<keyof typeof STRINGS.en, string>>;
}
interface Failure {
  error?: string;
}
interface WizardState extends Magics {
  steps: Step[];
  index: number;
  completed: string[] | null;
  allowFinish: boolean;
  gateText: string | null;
  pending: "next" | "finish" | null;
  error: string;
  done: boolean;
  root: HTMLElement | undefined;
  t: typeof STRINGS.en;
  step(): Step;
  stepId(): string;
  last(): boolean;
  first(): boolean;
  missing(): Step[];
  gated(): boolean;
  go(i: number): void;
  run(kind: "next" | "finish", action: () => Promise<Failure | undefined>, after: () => void): Promise<void>;
  emit(event: string, detail: Record<string, unknown>): unknown[];
  focusHeading(): void;
  finishOff(): boolean;
  num(n: number): string;
  status(i: number): string;
  canGo(i: number): boolean;
}

const lang = () => ((document.documentElement.lang || "en").startsWith("ar") ? "ar" : "en");
const failure = (r: unknown): Failure | undefined => (r && typeof r === "object" && (r as Failure).error ? (r as Failure) : undefined);

export const setupWizard: Register = (Alpine) => {
  agentEnrollWait(Alpine);
  Alpine.data("nqSetupWizard", (config: Config = {}) => {
    const steps = (config.steps ?? []).map((s) => ({ ...s }));
    return {
      steps,
      index: clampStep(config.current ?? 0, steps.length),
      completed: config.completed ?? null,
      allowFinish: config.canFinish ?? true,
      gateText: config.gateMessage ?? null,
      pending: null as "next" | "finish" | null,
      error: "",
      done: false,
      root: undefined as HTMLElement | undefined,
      t: { ...STRINGS[lang()], ...config.labels },
      init(this: WizardState) {
        this.root = this.$el;
        // Focus follows the step, but not on first paint.
        this.$watch("index", () => this.focusHeading());
        this.$watch("done", () => this.focusHeading());
      },
      focusHeading(this: WizardState) {
        this.$nextTick(() => (this.done ? this.$refs.doneHeading : this.$refs.heading)?.focus({ preventScroll: false }));
      },
      step(this: WizardState) {
        return this.steps[this.index] ?? { id: "", title: "" };
      },
      stepId(this: WizardState) {
        return this.step().id;
      },
      last(this: WizardState) {
        return this.index === this.steps.length - 1;
      },
      first(this: WizardState) {
        return this.index === 0;
      },
      /** The step on screen is being finished right now, so it is not held against the gate. */
      missing(this: WizardState) {
        return missingSteps(this.steps, this.completed).filter((s) => s.id !== this.stepId());
      },
      gated(this: WizardState) {
        return this.last() && (!this.allowFinish || this.missing().length > 0);
      },
      gateTitle(this: WizardState) {
        return this.gateText ?? this.t.gate;
      },
      canSkip(this: WizardState) {
        return Boolean(this.step().optional) && !this.last();
      },
      nextOff(this: WizardState) {
        return this.step().ready === false;
      },
      finishOff(this: WizardState) {
        return this.gated() || this.step().ready === false || this.pending === "next";
      },
      backOff(this: WizardState) {
        return this.first() || this.pending !== null;
      },
      nextBlocked(this: WizardState) {
        return this.step().ready === false || this.pending === "next";
      },
      finishBlocked(this: WizardState) {
        return this.finishOff() || this.pending === "finish";
      },
      busy(this: WizardState) {
        return this.pending !== null;
      },
      pct(this: WizardState) {
        return setupProgress(this.index + 1, this.steps.length);
      },
      num(this: WizardState, n: number) {
        return new Intl.NumberFormat(lang() === "ar" ? "ar-u-nu-latn" : "en").format(n);
      },
      stepCount(this: WizardState) {
        return this.t.stepOf.replace("{current}", this.num(this.index + 1)).replace("{total}", this.num(this.steps.length));
      },
      status(this: WizardState, i: number) {
        return i < this.index ? "complete" : i === this.index ? "current" : "upcoming";
      },
      statusLabel(this: WizardState, i: number) {
        return this.t[this.status(i) as "complete" | "current" | "upcoming"];
      },
      /** A finished step on the rail can be revisited while nothing is running. */
      canGo(this: WizardState, i: number) {
        return i < this.index && this.pending === null;
      },
      go(this: WizardState, i: number) {
        const next = clampStep(i, this.steps.length);
        this.index = next;
        this.error = "";
        this.emit("nq-step-change", { index: next, stepId: this.steps[next]?.id });
      },
      goId(this: WizardState, id: string) {
        this.go(this.steps.findIndex((s) => s.id === id));
      },
      railGo(this: WizardState, i: number) {
        if (this.canGo(i)) this.go(i);
      },
      back(this: WizardState) {
        this.go(this.index - 1);
      },
      skip(this: WizardState) {
        this.go(this.index + 1);
      },
      setReady(this: WizardState, id: string, ready: boolean) {
        const s = this.steps.find((x) => x.id === id);
        if (s) s.ready = ready;
      },
      setCompleted(this: WizardState, ids: string[] | null) {
        this.completed = ids;
      },
      setCanFinish(this: WizardState, ok: boolean, message?: string | null) {
        this.allowFinish = ok;
        if (message !== undefined) this.gateText = message;
      },
      emit(this: WizardState, event: string, detail: Record<string, unknown>) {
        const waits: unknown[] = [];
        (this.root ?? this.$el).dispatchEvent(new CustomEvent(event, { bubbles: true, detail: { ...detail, waitUntil: (p: unknown) => void waits.push(p) } }));
        return waits;
      },
      async run(this: WizardState, kind: "next" | "finish", action: () => Promise<Failure | undefined>, after: () => void) {
        this.pending = kind;
        this.error = "";
        try {
          const result = await action();
          if (result?.error) this.error = result.error;
          else after();
        } catch {
          this.error = this.t.failed;
        } finally {
          this.pending = null;
        }
      },
      /** Waits for what listeners handed to waitUntil; the first `{ error }` wins. */
      async settle(waits: unknown[]) {
        const results = await Promise.all(waits);
        return results.map(failure).find(Boolean);
      },
      next(this: WizardState & { settle(w: unknown[]): Promise<Failure | undefined> }) {
        const id = this.stepId();
        return this.run(
          "next",
          () => this.settle(this.emit("nq-step-complete", { stepId: id })),
          () => this.go(this.index + 1),
        );
      },
      finish(this: WizardState & { settle(w: unknown[]): Promise<Failure | undefined> }) {
        const id = this.stepId();
        return this.run(
          "finish",
          async () => {
            const stepResult = await this.settle(this.emit("nq-step-complete", { stepId: id }));
            if (stepResult?.error) return stepResult;
            return this.settle(this.emit("nq-finish", {}));
          },
          () => {
            this.done = true;
          },
        );
      },
    };
  });
};

// nqAgentEnrollWait: the guided-connect step. The server renders the command and the three status panels (the Blade
// setup-wizard.agent-enroll component); this shows the one that matches `status` and keeps it current:
//
//   <div data-slot="agent-enroll-wait" x-data="nqAgentEnrollWait({ status: 'waiting', elapsed: 0 }, 'Waiting {time}')"
//        x-on:nq-agent-status.window="set($event.detail)">
//
// set({ status, agent, elapsed, error }) changes it from outside (poll your server, then call it, or dispatch nq-agent-status). The retry
// button fires nq:retry from the root. The status region is announced politely as it changes.
interface EnrollState extends Magics {
  status: "waiting" | "connected" | "timeout" | "failed";
  agent: { name: string; host?: string; version?: string; system?: string } | null;
  elapsed: number | null;
  error: string;
  elapsedTemplate: string;
  root: HTMLElement | undefined;
}
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const agentEnrollWait: Register = (Alpine) => {
  Alpine.data("nqAgentEnrollWait", (info: Partial<Pick<EnrollState, "status" | "agent" | "elapsed" | "error">> = {}, elapsedTemplate = "Waiting {time}") => ({
    status: info.status ?? "waiting",
    agent: info.agent ?? null,
    elapsed: info.elapsed ?? null,
    error: info.error ?? "",
    elapsedTemplate,
    root: undefined as HTMLElement | undefined,
    init(this: EnrollState) {
      this.root = this.$el;
    },
    set(this: EnrollState, next: Partial<Pick<EnrollState, "status" | "agent" | "elapsed" | "error">>) {
      if (next.status !== undefined) this.status = next.status;
      if (next.agent !== undefined) this.agent = next.agent;
      if (next.elapsed !== undefined) this.elapsed = next.elapsed;
      if (next.error !== undefined) this.error = next.error ?? "";
    },
    elapsedText(this: EnrollState) {
      return this.elapsed === null ? "" : this.elapsedTemplate.replace("{time}", clock(this.elapsed));
    },
    retry(this: EnrollState) {
      (this.root ?? this.$el).dispatchEvent(new CustomEvent("nq:retry", { bubbles: true }));
    },
  }));
};
