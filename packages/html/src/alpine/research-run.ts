// nqResearchRun: the behaviour of the React ResearchRun. The server renders the stages, the answer and the evidence; this adds the ask box
// (draft, Ctrl or Cmd + Enter, suggestions, the pending state and the error that comes back), the citation buttons that highlight and scroll to
// the evidence they rest on, and the stop and retry buttons.
//
//   <section data-slot="research-run" x-data="nqResearchRun({ runId, question, live, failed, defaultQuestion })">…</section>
//
// Events, all bubbling from the root:
//   nq-research-ask     { question, waitUntil }   resolve { error: "message" } to show it under the box
//   nq-research-cancel  { id }                    the stop button
//   nq-research-retry   { id, question }          the retry button after a failure or a stop

import type { Magics, Register } from "./types";

interface Config {
  runId?: string | null;
  question?: string | null;
  live?: boolean;
  failed?: string;
  defaultQuestion?: string;
}

interface State extends Magics {
  question: string;
  pending: boolean;
  problem: string;
  active: string | null;
  runId: string | null;
  runQuestion: string;
  live: boolean;
  failed: string;
  root: HTMLElement | null;
  busy(): boolean;
  ask(text?: string): Promise<void>;
}

function errorOf(results: unknown[]): string {
  for (const r of results) {
    if (r && typeof r === "object" && "error" in r && typeof (r as { error?: unknown }).error === "string" && (r as { error: string }).error) return (r as { error: string }).error;
  }
  return "";
}

export const researchRun: Register = (Alpine) => {
  Alpine.data("nqResearchRun", (config: Config = {}) => ({
    question: config.defaultQuestion ?? "",
    pending: false,
    problem: "",
    active: null as string | null,
    runId: config.runId ?? null,
    runQuestion: config.question ?? "",
    live: Boolean(config.live),
    failed: config.failed ?? "",
    root: null as HTMLElement | null,

    init(this: State) {
      this.root = this.$el;
    },

    /** Busy: a request is in flight or the run is queued or running. */
    busy(this: State): boolean {
      return this.pending || this.live;
    },
    /** The ask button is off while busy or while the box is empty. */
    blocked(this: State): boolean {
      return this.busy() || this.question.trim() === "";
    },

    async ask(this: State, text?: string) {
      const q = (text ?? this.question).trim();
      if (!q || this.busy()) return;
      this.pending = true;
      this.problem = "";
      const waits: unknown[] = [];
      try {
        this.root?.dispatchEvent(new CustomEvent("nq-research-ask", { bubbles: true, detail: { question: q, waitUntil: (p: unknown) => void waits.push(p) } }));
        const results = await Promise.all(waits);
        this.problem = errorOf(results);
      } catch (err) {
        this.problem = err instanceof Error && err.message ? err.message : this.failed;
      } finally {
        this.pending = false;
      }
    },
    pick(this: State, text: string) {
      this.question = text;
      void this.ask(text);
    },
    cancel(this: State) {
      this.root?.dispatchEvent(new CustomEvent("nq-research-cancel", { bubbles: true, detail: { id: this.runId } }));
    },
    retry(this: State) {
      this.root?.dispatchEvent(new CustomEvent("nq-research-retry", { bubbles: true, detail: { id: this.runId, question: this.runQuestion } }));
    },
    /** Highlights the evidence and scrolls it into view (smooth unless the visitor prefers reduced motion). */
    focusEvidence(this: State, id: string) {
      this.active = id;
      const el = [...(this.root?.querySelectorAll<HTMLElement>("[data-evidence-id]") ?? [])].find((n) => n.dataset.evidenceId === id);
      const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
      el?.scrollIntoView?.({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    },
  }));
};
