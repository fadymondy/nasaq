// nqRunHistory / nqRunDetail: the runs list (status filter, search, selection) and one run's detail (expanded steps, the chosen span,
// the screenshot viewer, Run again / Cancel). The markup is the React RunHistory's (see <x-nq::run-history>); the server renders every
// run, its steps, spans and raw data, and this shows and hides them.
//
//   <div x-data="nqRunHistory({ runs: [{ id, category, text }], selected: null })"
//        x-on:nq-run-retry="$event.detail.waitUntil(rerun($event.detail.id))">...</div>
//
// Retrying and cancelling are yours. nqRunDetail dispatches, from its root:
//   nq-run-retry   detail: { id, waitUntil(promise) }   resolve { error } or reject to show the message
//   nq-run-cancel  detail: { id, waitUntil(promise) }   the same
// nqRunHistory dispatches, from its root:
//   nq-run-select  detail: { id }                       id is null when the selection is cleared

import type { Magics, Register } from "./types";

interface RunRow {
  id: string;
  category: string;
  text: string;
}
interface HistoryConfig {
  runs?: RunRow[];
  selected?: string | null;
}
interface DetailConfig {
  id: string;
  failing?: string | null;
  tab?: string;
  failed?: string;
}
interface Shot {
  src: string;
  alt: string;
  caption: string;
}
interface HistoryState extends Magics {
  runs: RunRow[];
  selected: string | null;
  filterSel: string[];
  query: string;
  root: HTMLElement;
  readonly filter: string;
  readonly shown: number;
  visible(id: string): boolean;
}
interface DetailState extends Magics {
  root: HTMLElement;
  pane: string;
  open: Record<string, boolean>;
  span: string | null;
  busy: boolean;
  error: string;
  shotOpen: boolean;
  shot: Shot;
  run(kind: "retry" | "cancel"): Promise<boolean>;
}

export const runHistory: Register = (Alpine) => {
  Alpine.data("nqRunHistory", (cfg: HistoryConfig = {}) => ({
    runs: cfg.runs ?? [],
    selected: cfg.selected ?? null,
    filterSel: ["all"],
    query: "",
    root: null as unknown as HTMLElement,
    init(this: HistoryState) {
      this.root = this.$el;
    },
    get filter(): string {
      return (this as unknown as HistoryState).filterSel[0] ?? "all";
    },
    visible(this: HistoryState, id: string) {
      const r = this.runs.find((x) => x.id === id);
      if (!r) return false;
      const q = this.query.trim().toLowerCase();
      return (this.filter === "all" || r.category === this.filter) && (!q || r.text.includes(q));
    },
    get shown(): number {
      const self = this as unknown as HistoryState;
      return self.runs.filter((r) => self.visible(r.id)).length;
    },
    toggle(this: HistoryState, id: string | null) {
      this.selected = id === this.selected ? null : id;
      this.root.dispatchEvent(new CustomEvent("nq-run-select", { bubbles: true, detail: { id: this.selected } }));
    },
  }));

  Alpine.data("nqRunDetail", (cfg: DetailConfig) => ({
    root: null as unknown as HTMLElement,
    pane: cfg.tab ?? "steps",
    open: (cfg.failing ? { [cfg.failing]: true } : {}) as Record<string, boolean>,
    span: null as string | null,
    busy: false,
    error: "",
    shotOpen: false,
    shot: { src: "", alt: "", caption: "" } as Shot,
    init(this: DetailState) {
      this.root = this.$el;
    },
    get ariaBusy(): string | null {
      return (this as unknown as DetailState).busy ? "true" : null;
    },
    isOpen(this: DetailState, id: string) {
      return !!this.open[id];
    },
    toggle(this: DetailState, id: string) {
      this.open = { ...this.open, [id]: !this.open[id] };
    },
    pickSpan(this: DetailState, id: string) {
      this.span = this.span === id ? null : id;
    },
    openShot(this: DetailState, shot: Shot) {
      this.shot = shot;
      this.shotOpen = true;
    },
    showFailing(this: DetailState) {
      if (!cfg.failing) return;
      this.pane = "steps";
      this.open = { ...this.open, [cfg.failing]: true };
      this.$nextTick(() => this.root.querySelector(`[data-step="${CSS.escape(cfg.failing as string)}"]`)?.scrollIntoView?.({ block: "nearest" }));
    },
    retry(this: DetailState) {
      return this.run("retry");
    },
    cancel(this: DetailState) {
      return this.run("cancel");
    },
    async run(this: DetailState, kind: "retry" | "cancel") {
      if (this.busy) return false;
      this.busy = true;
      this.error = "";
      const pending: unknown[] = [];
      this.root.dispatchEvent(new CustomEvent(`nq-run-${kind}`, { bubbles: true, detail: { id: cfg.id, waitUntil: (p: unknown) => void pending.push(p) } }));
      try {
        const results = await Promise.all(pending);
        const failed = results.find((r) => r && typeof r === "object" && (r as { error?: string }).error) as { error: string } | undefined;
        if (failed) this.error = failed.error;
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : (cfg.failed ?? "Could not finish. Try again.");
      } finally {
        this.busy = false;
      }
      return !this.error;
    },
  }));
};
