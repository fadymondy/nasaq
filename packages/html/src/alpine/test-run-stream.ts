// nqTestRunStream: a test run that streams. The markup is the React TestRunStream's (see the Blade component), the state lives here.
//
//   <section data-slot="test-run-stream" x-data="nqTestRunStream({ labels })" x-bind:data-state="state">
//     <button x-on:click="start()">Run test</button> <button x-on:click="stop()">Stop</button> <button x-on:click="clear()">Clear</button>
//     <p role="status" x-text="line()"></p>
//     <template x-for="(step, i) in steps" :key="stepKey(step)"> <li :data-status="stepStatus(step)"> … </li> </template>
//     <template x-for="r in results" :key="r.id"> <li> … <button x-on:click="toggleRaw(r.id)"> </li> </template>
//   </section>
//
// Run starts a run by firing "test-run-start" (bubbling) from the section with detail { step, result, done, fail, signal, waitUntil }:
//   step(step)      a new step, or an update to the one with the same id (or name)
//   result(result)  something the run kept
//   done()          the run finished; steps still running are marked skipped
//   fail(message)   the run failed as a whole
//   signal          an AbortSignal that aborts on Stop, Clear-after-restart or when the section is removed: close your stream then
//   waitUntil(p)    optional: a promise; resolving finishes the run, rejecting fails it
// Calls after the run ended or was stopped are ignored. "test-run-state" ({ state }) fires on every state change. The same four
// handlers are also methods of the component (step, result, done, fail), so Alpine.$data(el) reaches them.
// Options: labels (strings, with status and summary sub-objects), blocked (blocks starting a run).

import {
  formatTestRunDuration,
  settleTestRunSteps,
  testRunCounts,
  testRunStepStatus,
  upsertTestRunStep,
  type TestRunResult,
  type TestRunState,
  type TestRunStep,
  type TestRunStepStatus,
} from "./test-run-stream-logic";
import type { Magics, Register } from "./types";

interface Labels {
  running: string;
  stepsCount: string;
  finished: string;
  stopped: string;
  failed: string;
  run: string;
  runAgain: string;
  items: string;
  untitled: string;
  status: Record<TestRunStepStatus, string>;
  summary: Record<"ok" | "error" | "skipped", string>;
  [key: string]: unknown;
}

interface Options {
  labels?: Partial<Labels>;
  blocked?: boolean;
}

interface StreamState extends Magics {
  $nq: { locale: string };
  state: TestRunState;
  steps: TestRunStep[];
  results: TestRunResult[];
  error: string;
  elapsed: number;
  blocked: boolean;
  labels: Labels;
  rawOpen: Record<string, boolean>;
  root: HTMLElement | null;
  controller: AbortController | null;
  token: number;
  startedAt: number;
  timer: ReturnType<typeof setInterval> | undefined;
  setState(next: TestRunState): void;
  finish(mine: number, next: TestRunState, message?: string): void;
  num(n: number): string;
}

const fillText = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? "");

export const testRunStream: Register = (Alpine) => {
  Alpine.data("nqTestRunStream", (options: Options = {}) => ({
    state: "idle" as TestRunState,
    steps: [] as TestRunStep[],
    results: [] as TestRunResult[],
    error: "",
    elapsed: 0,
    blocked: options.blocked ?? false,
    labels: (options.labels ?? {}) as Labels,
    rawOpen: {} as Record<string, boolean>,
    root: null as HTMLElement | null,
    controller: null as AbortController | null,
    token: 0,
    startedAt: 0,
    timer: undefined as ReturnType<typeof setInterval> | undefined,
    init(this: StreamState) {
      this.root = this.$el;
    },
    destroy(this: StreamState) {
      if (this.timer) clearInterval(this.timer);
      this.controller?.abort();
    },
    num(this: StreamState, n: number) {
      return new Intl.NumberFormat(this.$nq.locale).format(n);
    },
    setState(this: StreamState, next: TestRunState) {
      this.state = next;
      if (this.timer) clearInterval(this.timer);
      this.timer = undefined;
      if (next === "running") this.timer = setInterval(() => (this.elapsed = Date.now() - this.startedAt), 100);
      this.root?.dispatchEvent(new CustomEvent("test-run-state", { bubbles: true, detail: { state: next } }));
    },
    finish(this: StreamState, mine: number, next: TestRunState, message?: string) {
      if (this.token !== mine) return;
      this.token += 1;
      this.controller = null;
      this.steps = settleTestRunSteps(this.steps);
      this.elapsed = Math.max(this.elapsed, Date.now() - this.startedAt);
      if (message !== undefined) this.error = message;
      this.setState(next);
    },
    // The four handlers, for the run in progress (calls with no run going are ignored).
    step(this: StreamState, step: TestRunStep) {
      if (this.state === "running") this.steps = upsertTestRunStep(this.steps, step);
    },
    result(this: StreamState, result: TestRunResult) {
      if (this.state !== "running") return;
      this.results = this.results.some((r) => r.id === result.id) ? this.results.map((r) => (r.id === result.id ? result : r)) : [...this.results, result];
    },
    done(this: StreamState) {
      if (this.state !== "running") return;
      this.finish(this.token, "done");
    },
    fail(this: StreamState, message: string) {
      if (this.state !== "running") return;
      this.finish(this.token, "error", message);
    },
    start(this: StreamState) {
      if (this.blocked || this.state === "running") return;
      this.controller?.abort();
      const ac = new AbortController();
      this.controller = ac;
      this.token += 1;
      const mine = this.token;
      this.startedAt = Date.now();
      this.elapsed = 0;
      this.steps = [];
      this.results = [];
      this.error = "";
      this.rawOpen = {};
      this.setState("running");
      const live = () => this.token === mine;
      let pending: Promise<unknown> | null = null;
      const detail = {
        step: (step: TestRunStep) => {
          if (live()) this.steps = upsertTestRunStep(this.steps, step);
        },
        result: (result: TestRunResult) => {
          if (!live()) return;
          this.results = this.results.some((r) => r.id === result.id) ? this.results.map((r) => (r.id === result.id ? result : r)) : [...this.results, result];
        },
        done: () => this.finish(mine, "done"),
        fail: (message: string) => this.finish(mine, "error", message),
        signal: ac.signal,
        waitUntil: (p: Promise<unknown>) => {
          pending = p;
        },
      };
      try {
        this.root?.dispatchEvent(new CustomEvent("test-run-start", { bubbles: true, detail }));
      } catch (e) {
        this.finish(mine, "error", e instanceof Error ? e.message : String(e));
        return;
      }
      const wait = pending as Promise<unknown> | null;
      if (wait && typeof wait.then === "function") {
        wait.then(
          () => this.finish(mine, "done"),
          (e: unknown) => {
            if (!ac.signal.aborted) this.finish(mine, "error", e instanceof Error ? e.message : String(e));
          },
        );
      }
    },
    stop(this: StreamState) {
      const mine = this.token;
      this.controller?.abort();
      this.finish(mine, "stopped");
    },
    clear(this: StreamState) {
      this.setState("idle");
      this.steps = [];
      this.results = [];
      this.error = "";
      this.elapsed = 0;
      this.rawOpen = {};
    },
    isRunning(this: StreamState) {
      return this.state === "running";
    },
    isIdle(this: StreamState) {
      return this.state === "idle";
    },
    showClear(this: StreamState) {
      return this.state !== "idle" && this.state !== "running";
    },
    runLabel(this: StreamState) {
      return this.state === "idle" ? this.labels.run : this.labels.runAgain;
    },
    showResults(this: StreamState) {
      return this.results.length > 0 || this.state === "done";
    },
    waiting(this: StreamState) {
      return this.state === "running" && this.steps.length === 0;
    },
    /** The live status line under the header; "" while idle. */
    line(this: StreamState) {
      const counts = testRunCounts(this.steps);
      const time = formatTestRunDuration(this.elapsed);
      const l = this.labels;
      const parts = (["ok", "error", "skipped"] as const).filter((k) => counts[k] > 0).map((k) => fillText(l.summary[k], { n: this.num(counts[k]) }));
      if (this.state === "running") return `${l.running} · ${fillText(l.stepsCount, { n: this.num(counts.total) })} · ${time}`;
      if (this.state === "done") return [fillText(l.finished, { time }), ...parts].join(" · ");
      if (this.state === "stopped") return [fillText(l.stopped, { time }), ...parts].join(" · ");
      if (this.state === "error") return fillText(l.failed, { time });
      return "";
    },
    stepKey(step: TestRunStep) {
      return step.id ?? step.name;
    },
    stepStatus(step: TestRunStep) {
      return testRunStepStatus(step.status);
    },
    /** True when the step is in `status` (ok, error, skipped or running). */
    stepIs(step: TestRunStep, status: string) {
      return testRunStepStatus(step.status) === status;
    },
    stepStatusClass(step: TestRunStep) {
      return testRunStepStatus(step.status) === "error" ? "text-nq-danger-text" : "text-muted-foreground";
    },
    stepNumber(this: StreamState, index: number) {
      return `${this.num(index + 1)}.`;
    },
    hasCount(step: TestRunStep) {
      return typeof step.count === "number" && step.count > 0;
    },
    itemsText(this: StreamState, step: TestRunStep) {
      return fillText(this.labels.items, { n: this.num(step.count ?? 0) });
    },
    hasDuration(step: TestRunStep) {
      return typeof step.durationMs === "number";
    },
    duration(step: TestRunStep) {
      return formatTestRunDuration(step.durationMs ?? 0);
    },
    resultTitle(this: StreamState, r: TestRunResult) {
      return r.title || r.url || this.labels.untitled;
    },
    hasMeta(r: TestRunResult) {
      return Boolean(r.meta && r.meta.length);
    },
    hasRaw(r: TestRunResult) {
      return r.raw !== undefined;
    },
    rawJson(r: TestRunResult) {
      return JSON.stringify(r.raw, null, 2) ?? "";
    },
    isRaw(this: StreamState, id: string) {
      return Boolean(this.rawOpen[id]);
    },
    toggleRaw(this: StreamState, id: string) {
      this.rawOpen = { ...this.rawOpen, [id]: !this.rawOpen[id] };
    },
    rawLabel(this: StreamState, id: string) {
      return this.rawOpen[id] ? this.labels.hideRaw : this.labels.showRaw;
    },
    rawId(this: StreamState, id: string) {
      return this.$id("nq-test-run", `raw-${id}`);
    },
    resultCount(this: StreamState) {
      return this.num(this.results.length);
    },
    uid(this: StreamState, part: string) {
      return this.$id("nq-test-run", part);
    },
  }));
};
