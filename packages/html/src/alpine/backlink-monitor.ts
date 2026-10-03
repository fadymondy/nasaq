// nqBacklinkMonitor: the live state of the backlink monitor card: the five tiles, the links table and the Disavow / Mark as safe actions.
// The markup is the React BacklinkMonitor's (see the Blade component); the maths is backlink-monitor-logic.ts. The links table is the shared
// <x-nq::data-table>, driven through its x-modelable `rows`.
//
//   <div x-data="nqBacklinkMonitor({ links: [...], now: 1790672400000, words: {…} })" x-on:nq-data-table-action="onAction($event)"
//        x-on:disavow="$event.detail.wait(…)" x-on:mark-safe="$event.detail.wait(…)"> … </div>
//
// Link: id, sourceUrl, targetUrl, anchor, domainRating, spamScore, firstSeen, lostAt?, followed?, disavowed?.
// Row actions fire bubbling events on the root with detail `{ …, wait(promise) }`:
//   disavow    { ids: [id], wait }   mark-safe   { id, wait }   resolve, or resolve { error } (shown above the table).
// On success the card updates itself: a disavowed link gets the "Disavowed" badge, a link marked safe loses the "Toxic" flag and the tile count drops.
// A rejected promise, or nobody listening, shows the generic error.

import { backlinkStatus, domainOf, isToxic, summarizeBacklinks, type BacklinkLike, type BacklinkStatus, type BacklinkSummary } from "./backlink-monitor-logic";
import type { Magics, Register } from "./types";

interface Link extends BacklinkLike {
  targetUrl: string;
  anchor: string;
  domainRating: number;
  followed?: boolean;
}
interface Words {
  locale: string;
  failed: string;
  noAnchor: string;
  toxic: string;
  disavowed: string;
  nofollow: string;
  statusNew: string;
  statusActive: string;
  statusLost: string;
}
interface Config {
  links: Link[];
  now: number;
  words: Words;
}
type Outcome = { error?: string } | void | undefined;

interface Row {
  id: string;
  source: string;
  domain: string;
  path: string;
  anchor: string;
  target: string;
  rating: number;
  spam: number;
  seen: string;
  status: string;
  statusLabel: string;
  tone: string;
  badge: string;
  badgeLabel: string;
  nofollow: boolean;
  nofollowLabel: string;
  actions: string[];
}

interface State extends Magics {
  links: Link[];
  safe: Record<string, true>;
  now: number;
  words: Words;
  tableRows: Row[];
  failed: string;
  alive: boolean;
  root: HTMLElement | null;
  summary: BacklinkSummary;
  toxicOf(l: Link): boolean;
  buildRows(): Row[];
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
  run(name: string, detail: Record<string, unknown>, onOk: () => void): Promise<void>;
}

export const backlinkMonitor: Register = (Alpine) => {
  Alpine.data("nqBacklinkMonitor", (config: Config) => ({
    links: config.links.map((l) => ({ ...l })) as Link[],
    safe: {} as Record<string, true>,
    now: config.now,
    words: config.words,
    tableRows: [] as Row[],
    failed: "",
    alive: true,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
      this.tableRows = this.buildRows();
    },
    destroy(this: State) {
      this.alive = false;
    },
    /** Toxic: a spam score from the threshold up, unless it was disavowed or marked safe. */
    toxicOf(this: State, l: Link): boolean {
      return !this.safe[l.id] && isToxic(l);
    },
    get summary(): BacklinkSummary {
      const s = this as unknown as State;
      const base = summarizeBacklinks(s.links, s.now);
      return { ...base, toxic: s.links.filter((l) => !l.lostAt && s.toxicOf(l)).length };
    },
    /** A figure with Latin digits, as the tiles show it. */
    num(n: number): string {
      return new Intl.NumberFormat(`${(this as unknown as State).words.locale}-u-nu-latn`).format(n);
    },
    buildRows(this: State): Row[] {
      const w = this.words;
      const label: Record<BacklinkStatus, string> = { new: w.statusNew, lost: w.statusLost, active: w.statusActive };
      return this.links.map((l) => {
        const s = backlinkStatus(l, this.now);
        const toxic = !l.lostAt && this.toxicOf(l);
        const flag = l.lostAt ? "lost" : this.toxicOf(l) ? "toxic" : s;
        const actions: string[] = [];
        if (!l.disavowed) actions.push("disavow");
        if (this.toxicOf(l)) actions.push("safe");
        return {
          id: l.id,
          source: `${domainOf(l.sourceUrl)}${l.sourceUrl.replace(/^https?:\/\/[^/]+/i, "") || "/"}`,
          domain: domainOf(l.sourceUrl),
          path: l.sourceUrl.replace(/^https?:\/\/[^/]+/i, "") || "/",
          anchor: l.anchor || w.noAnchor,
          target: l.targetUrl,
          rating: l.domainRating,
          spam: l.spamScore,
          seen: l.firstSeen.slice(0, 10),
          status: flag,
          statusLabel: label[s],
          tone: s === "lost" ? "danger" : s === "new" ? "success" : "neutral",
          badge: l.disavowed ? "disavowed" : toxic ? "toxic" : "",
          badgeLabel: l.disavowed ? w.disavowed : toxic ? w.toxic : "",
          nofollow: l.followed === false,
          nofollowLabel: w.nofollow,
          actions,
        };
      });
    },
    refresh(this: State) {
      this.tableRows = this.buildRows();
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.root ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async run(this: State & { refresh(): void }, name: string, detail: Record<string, unknown>, onOk: () => void) {
      this.failed = "";
      try {
        const result = await this.ask(name, detail);
        if (!this.alive) return;
        if (result && result.error) this.failed = result.error;
        else {
          onOk();
          this.refresh();
        }
      } catch {
        if (this.alive) this.failed = this.words.failed;
      }
    },
    /** The table's `nq-data-table-action`: "disavow" and "safe". */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const l = this.links.find((x) => x.id === row.id);
      if (!l) return;
      if (action === "disavow" && !l.disavowed) {
        void this.run("disavow", { ids: [l.id] }, () => {
          this.links = this.links.map((x) => (x.id === l.id ? { ...x, disavowed: true } : x));
        });
      } else if (action === "safe" && this.toxicOf(l)) {
        void this.run("mark-safe", { id: l.id }, () => {
          this.safe = { ...this.safe, [l.id]: true };
        });
      }
    },
  }));
};
