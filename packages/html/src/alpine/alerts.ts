// nqAlerts and nqAlertRow: the state behind the Blade alert list and security alerts.
//
//   <section data-slot="alert-list" x-data="nqAlerts({ rows, status, sort, strings })">
//     <x-nq::tabs x-model="statusTab"> ... <input x-model="query"> <x-nq::select x-model="sevFilter | srcFilter | sortBy">
//     <p x-text="shownText"> <div x-show="visibleCount === 0"> (empty state) <button x-on:click="clear()">
//     <ul x-ref="list">
//       <li data-alert-id="a1" x-data="nqAlertRow({ id, failed })" x-show="matches(alertId)">
//         <button x-on:click="act('ack', 'nq-alert-acknowledge')"> <button x-on:click="expanded = !expanded"> <div x-show="expanded">
//
// The server renders every row; filtering shows and hides them and sorting moves them. Nothing here changes an alert: each action
// dispatches a bubbling, cancelable event from the row:
//   "nq-alert-acknowledge" { id }   "nq-alert-resolve" { id }   "nq-alert-reopen" { id }   "nq-alert-action" { id, action }
// all with detail { resolve(result?), reject(message), waitUntil(promise) }. Nobody claimed it (no waitUntil / resolve / reject call, no
// preventDefault): it counts as done. Otherwise the button stays busy until the outcome; resolve({ error }) / reject(message) / a rejected
// promise shows the message on that row. Re-render the list from the server (or Livewire) to show the new status.
//
// The wrapper's names (statusTab, sevFilter, srcFilter, sortBy) differ from the inner components' names (`value`) on purpose:
// x-model expressions are read in the scope of the element that carries them.
import type { Magics, Register } from "./types";

type Severity = "critical" | "high" | "medium" | "low" | "info";
type Status = "open" | "acknowledged" | "resolved";
type Sort = "newest" | "severity";

const SEVERITIES: readonly Severity[] = ["critical", "high", "medium", "low", "info"];
const STATUSES: readonly Status[] = ["open", "acknowledged", "resolved"];

interface Row {
  id: string;
  severity: Severity;
  status: Status;
  source: string;
  at: number;
  /** Lower-cased title, source, id and the security fields the search box looks in. */
  search: string;
}

interface Config {
  rows: Row[];
  status: Status | "all";
  sort: Sort;
  strings: { shown: string; failed: string };
}

export interface AlertOutcome {
  error?: string;
}

/** Newest first, or most severe first with open before acknowledged before resolved and newest first inside a group. */
function sortRows(rows: readonly Row[], sort: Sort): Row[] {
  const list = [...rows];
  if (sort === "newest") return list.sort((a, b) => b.at - a.at);
  return list.sort((a, b) => STATUSES.indexOf(a.status) - STATUSES.indexOf(b.status) || SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.at - a.at);
}

/** Dispatches the event from `root` and waits for whoever claimed it. Resolves to an error message, or null on success. */
async function run(root: HTMLElement, name: string, detail: Record<string, unknown>, failed: string): Promise<string | null> {
  let claimed = false;
  let settle!: (outcome: AlertOutcome | void) => void;
  const outcome = new Promise<AlertOutcome | void>((resolve) => (settle = resolve));
  const full: Record<string, unknown> = {
    ...detail,
    resolve(result?: AlertOutcome) {
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
        (result) => settle(result && typeof result === "object" ? (result as AlertOutcome) : undefined),
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

interface ListState extends Magics {
  config: Config;
  index: Record<string, Row>;
  statusTab: Status | "all";
  query: string;
  sevFilter: Severity | "all";
  srcFilter: string;
  sortBy: Sort;
  matches(id: string): boolean;
  reorder(): void;
}

interface RowState extends Magics {
  config: { id: string; failed: string };
  root: HTMLElement;
  alive: boolean;
  busy: string | null;
  error: string;
  errorOpen: boolean;
}

export const alerts: Register = (Alpine) => {
  Alpine.data("nqAlerts", (config: Config) => ({
    config,
    index: {} as Record<string, Row>,
    statusTab: config.status,
    query: "",
    sevFilter: "all",
    srcFilter: "all",
    sortBy: config.sort,
    init(this: ListState) {
      this.index = Object.fromEntries(this.config.rows.map((r) => [r.id, r]));
      this.$watch<Sort>("sortBy", () => this.reorder());
    },
    /** Whether the row passes the tab, the severity and source filters and the search. */
    matches(this: ListState, id: string): boolean {
      const row = this.index[id];
      if (!row) return true;
      if (this.statusTab !== "all" && row.status !== this.statusTab) return false;
      if (this.sevFilter !== "all" && row.severity !== this.sevFilter) return false;
      if (this.srcFilter !== "all" && row.source !== this.srcFilter) return false;
      const q = this.query.trim().toLowerCase();
      return q === "" || row.search.includes(q);
    },
    get visibleCount(): number {
      const self = this as unknown as ListState;
      return self.config.rows.filter((r) => self.matches(r.id)).length;
    },
    get shownText(): string {
      const self = this as unknown as ListState & { visibleCount: number };
      return self.config.strings.shown.replace("{n}", String(self.visibleCount)).replace("{total}", String(self.config.rows.length));
    },
    get canClear(): boolean {
      const self = this as unknown as ListState;
      return self.query.trim() !== "" || self.sevFilter !== "all" || self.srcFilter !== "all" || self.statusTab !== "all";
    },
    clear(this: ListState) {
      this.query = "";
      this.sevFilter = "all";
      this.srcFilter = "all";
      this.statusTab = "all";
    },
    /** Moves the rows into the chosen order (the server rendered them in the default order). */
    reorder(this: ListState) {
      const list = this.$refs.list;
      if (!list) return;
      for (const row of sortRows(this.config.rows, this.sortBy)) {
        const li = Array.from(list.children).find((c) => (c as HTMLElement).dataset.alertId === row.id);
        if (li) list.appendChild(li);
      }
    },
  }));

  Alpine.data("nqAlertRow", (config: { id: string; failed: string }) => ({
    config,
    alertId: config.id,
    root: null as unknown as HTMLElement,
    alive: true,
    expanded: false,
    busy: null as string | null,
    error: "",
    errorOpen: true,
    init(this: RowState) {
      this.root = this.$el;
      this.$watch<boolean>("errorOpen", (value) => {
        if (!value) this.error = "";
      });
    },
    destroy(this: RowState) {
      this.alive = false;
    },
    /** Runs one action: `key` marks which button is busy, `name` is the event, `extra` goes in its detail. */
    async act(this: RowState, key: string, name: string, extra: Record<string, unknown> = {}) {
      if (this.busy !== null) return;
      this.busy = key;
      this.error = "";
      const message = await run(this.root, name, { id: this.config.id, ...extra }, this.config.failed);
      if (!this.alive) return;
      this.busy = null;
      if (message) {
        this.error = message;
        this.errorOpen = true;
      }
    },
  }));
};
