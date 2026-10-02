// nqSeoPages and nqSeoChecklist: the live state of the SEO pages list and of one page's issue checklist. The markup is the React
// SeoPageList / SeoIssueChecklist (see the Blade components seo-pages and seo-pages.checklist); the maths is seo-pages-logic.ts.
// The list is the shared <x-nq::data-table>, driven through its x-modelable `rows`.
//
//   <div x-data="nqSeoPages({ pages: [...], can: { open, recrawl, index }, words: {…}, locale: 'en' })" x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-row-click="onRowClick($event)"> … </div>
//   <div x-data="nqSeoChecklist({ issues: [...], texts: { code: { title, why, fix } }, can: true, words: {…}, locale: 'en' })"> … </div>
//
// Page: id, url, title?, indexStatus, issues [{ id, code, severity, fixed?, detail? }], vitals? { LCP, INP, CLS }, lastCrawled? (ISO).
// List events (bubbling, on the root), detail `{ id, url, wait(promise) }` unless noted:
//   open-page (no wait)   recrawl   request-indexing    resolve, or resolve { error } (shown above the table). A rejected promise, or nobody listening, shows the generic error.
// Checklist event: toggle-fixed, detail `{ issue, fixed, wait(promise) }`. The checkbox changes at once; if the host answers { error } or rejects, it goes back and the alert shows.

import { formatVital, issueCounts, rateVital, scoreBand, seoScore, sortIssues, type ScoreBand, type SeoIndexStatus, type SeoIssue, type SeoSeverity, type SeoVitalId, type SeoVitalRating } from "./seo-pages-logic";
import type { Magics, Register } from "./types";

type Outcome = { error?: string } | void | undefined;
type Detail = Record<string, unknown>;

interface Page {
  id: string;
  url: string;
  title?: string;
  indexStatus: SeoIndexStatus;
  issues: SeoIssue[];
  vitals?: Partial<Record<SeoVitalId, number>>;
  lastCrawled?: string;
}
interface ListWords {
  failed: string;
  good: string;
  fair: string;
  poor: string;
  errors1: string;
  errorsN: string;
  warnings1: string;
  warningsN: string;
  notices1: string;
  noticesN: string;
  scoreOf: string;
  indexed: string;
  "not-indexed": string;
  blocked: string;
  pending: string;
  LCP: string;
  INP: string;
  CLS: string;
  ratingGood: string;
  ratingNeeds: string;
  ratingPoor: string;
}
interface ListConfig {
  pages: Page[];
  can: { open: boolean; recrawl: boolean; index: boolean };
  words: ListWords;
  locale: string;
}
interface Vital {
  id: string;
  text: string;
  rating: SeoVitalRating;
  title: string;
}
interface Row {
  id: string;
  page: string;
  url: string;
  title: string;
  hasTitle: boolean;
  score: number;
  scoreText: string;
  band: ScoreBand;
  bandLabel: string;
  scoreLabel: string;
  total: number;
  clean: boolean;
  hasErrors: boolean;
  errorsText: string;
  hasWarnings: boolean;
  warningsText: string;
  hasInfo: boolean;
  infoText: string;
  index: string;
  indexLabel: string;
  vitals: Vital[];
  noVitals: boolean;
  crawled: string;
  actions: string[];
}

/** "1 error" / "3 errors": the singular text, or the plural with {n} filled. */
const count = (n: number, one: string, many: string): string => (n === 1 ? one : many.replace("{n}", String(n)));

interface ListState extends Magics {
  pages: Page[];
  can: ListConfig["can"];
  words: ListWords;
  locale: string;
  tableRows: Row[];
  notice: string;
  busy: Record<string, true>;
  alive: boolean;
  host: HTMLElement | null;
  num(n: number): string;
  buildRows(): Row[];
  ask(name: string, detail: Detail): Promise<Outcome>;
  run(key: string, name: string, detail: Detail): Promise<void>;
  open(page: Page): void;
}

export const seoPages: Register = (Alpine) => {
  Alpine.data("nqSeoPages", (config: ListConfig) => ({
    pages: config.pages.map((p) => ({ ...p })) as Page[],
    can: config.can,
    words: config.words,
    locale: config.locale,
    tableRows: [] as Row[],
    notice: "",
    busy: {} as Record<string, true>,
    alive: true,
    host: null as HTMLElement | null,
    init(this: ListState) {
      this.host = this.$el;
      this.tableRows = this.buildRows();
    },
    destroy(this: ListState) {
      this.alive = false;
    },
    /** A figure with Latin digits. */
    num(this: ListState, n: number): string {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`).format(n);
    },
    /** One row per page, worst score first (the React table opens sorted by score, ascending). */
    buildRows(this: ListState): Row[] {
      const w = this.words;
      const rating: Record<SeoVitalRating, string> = { good: w.ratingGood, "needs-improvement": w.ratingNeeds, poor: w.ratingPoor };
      const rows = this.pages.map((p): Row => {
        const score = seoScore(p.issues);
        const band = scoreBand(score);
        const c = issueCounts(p.issues);
        const vitals = (["LCP", "INP", "CLS"] as const)
          .filter((m) => p.vitals?.[m] !== undefined)
          .map((m): Vital => {
            const r = rateVital(m, p.vitals![m]!);
            return { id: m, text: `${w[m]} ${formatVital(m, p.vitals![m]!, this.locale)}`, rating: r, title: `${w[m]}: ${rating[r]}` };
          });
        const actions: string[] = [];
        if (this.can.open) actions.push("issues");
        actions.push("open");
        if (this.can.recrawl) actions.push("recrawl");
        if (this.can.index && p.indexStatus !== "indexed" && p.indexStatus !== "blocked") actions.push("index");
        return {
          id: p.id,
          page: `${p.url} ${p.title ?? ""}`.trim(),
          url: p.url,
          title: p.title ?? "",
          hasTitle: !!p.title,
          score,
          scoreText: this.num(score),
          band,
          bandLabel: w[band],
          scoreLabel: w.scoreOf.replace("{n}", String(score)),
          total: c.total,
          clean: c.total === 0,
          hasErrors: c.error > 0,
          errorsText: count(c.error, w.errors1, w.errorsN),
          hasWarnings: c.warning > 0,
          warningsText: count(c.warning, w.warnings1, w.warningsN),
          hasInfo: c.info > 0,
          infoText: count(c.info, w.notices1, w.noticesN),
          index: p.indexStatus,
          indexLabel: w[p.indexStatus],
          vitals,
          noVitals: vitals.length === 0,
          crawled: p.lastCrawled ?? "",
          actions,
        };
      });
      return rows.sort((a, b) => a.score - b.score);
    },
    /** Fire an event on the root and wait for the promise the host hands to `wait`. */
    async ask(this: ListState, name: string, detail: Detail): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.host ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async run(this: ListState, key: string, name: string, detail: Detail) {
      if (this.busy[key]) return;
      this.busy = { ...this.busy, [key]: true };
      this.notice = "";
      try {
        const result = await this.ask(name, detail);
        if (this.alive && result && result.error) this.notice = result.error;
      } catch {
        if (this.alive) this.notice = this.words.failed;
      } finally {
        const next = { ...this.busy };
        delete next[key];
        if (this.alive) this.busy = next;
      }
    },
    open(this: ListState, page: Page) {
      (this.host ?? this.$el).dispatchEvent(new CustomEvent("open-page", { bubbles: true, detail: { id: page.id, url: page.url } }));
    },
    /** The table's `nq-data-table-action`: "issues", "open", "recrawl" and "index". */
    onAction(this: ListState, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const page = this.pages.find((p) => p.id === row.id);
      if (!page) return;
      if (action === "issues") this.open(page);
      else if (action === "open") window.open(page.url, "_blank", "noopener,noreferrer");
      else if (action === "recrawl") void this.run(`c-${page.id}`, "recrawl", { id: page.id, url: page.url });
      else if (action === "index") void this.run(`i-${page.id}`, "request-indexing", { id: page.id, url: page.url });
    },
    /** The table's `nq-data-table-row-click`. */
    onRowClick(this: ListState, event: CustomEvent<{ row: { id: string } }>) {
      const page = this.pages.find((p) => p.id === event.detail.row.id);
      if (page && this.can.open) this.open(page);
    },
  }));

  /* ---------------------------------------------------------------- checklist */

  interface ChecklistWords {
    failed: string;
    scoreOf: string;
    descNone: string;
    descOne: string;
    descMany: string;
    markFixed: string;
    fixed: string;
    error: string;
    warning: string;
    info: string;
  }
  interface ChecklistConfig {
    issues: SeoIssue[];
    texts: Record<string, { title: string; why: string; fix: string }>;
    can: boolean;
    words: ChecklistWords;
    locale: string;
  }
  interface Item extends SeoIssue {
    fixed: boolean;
  }
  interface ChecklistState extends Magics {
    issues: SeoIssue[];
    texts: ChecklistConfig["texts"];
    can: boolean;
    words: ChecklistWords;
    locale: string;
    marks: Record<string, boolean>;
    seen: Record<string, boolean>;
    rows: Item[];
    notice: string;
    alive: boolean;
    host: HTMLElement | null;
    items: Item[];
    score: number;
    band: ScoreBand;
    openCount: number;
    textOf(issue: SeoIssue): { title: string; why: string; fix: string };
    ask(name: string, detail: Detail): Promise<Outcome>;
    toggle(issue: SeoIssue, fixed: boolean): Promise<void>;
  }

  Alpine.data("nqSeoChecklist", (config: ChecklistConfig) => ({
    issues: config.issues.map((i) => ({ ...i })) as SeoIssue[],
    texts: config.texts,
    can: config.can,
    words: config.words,
    locale: config.locale,
    marks: Object.fromEntries(config.issues.map((i) => [i.id, !!i.fixed])) as Record<string, boolean>,
    seen: Object.fromEntries(config.issues.map((i) => [i.id, !!i.fixed])) as Record<string, boolean>,
    notice: "",
    alive: true,
    host: null as HTMLElement | null,
    rows: [] as Item[],
    init(this: ChecklistState) {
      this.host = this.$el;
      this.rows = this.items;
      // The checkboxes write `marks`; a change is the user's toggle. Reverting a failed one updates `seen` first so it is not a toggle.
      this.$watch("marks", (marks: Record<string, boolean>) => {
        this.rows = this.items;
        for (const issue of this.issues) {
          const now = !!marks[issue.id];
          if (now !== this.seen[issue.id]) {
            this.seen[issue.id] = now;
            void this.toggle(issue, now);
          }
        }
      });
    },
    destroy(this: ChecklistState) {
      this.alive = false;
    },
    /** The issues with their current fixed state, most severe first. */
    get items(): Item[] {
      const s = this as unknown as ChecklistState;
      return sortIssues(s.issues.map((i) => ({ ...i, fixed: !!s.marks[i.id] }))) as Item[];
    },
    get score(): number {
      return seoScore((this as unknown as ChecklistState).items);
    },
    get band(): ScoreBand {
      return scoreBand((this as unknown as ChecklistState).score);
    },
    get openCount(): number {
      return issueCounts((this as unknown as ChecklistState).items).total;
    },
    get scoreText(): string {
      const s = this as unknown as ChecklistState;
      return s.words.scoreOf.replace("{n}", String(s.score));
    },
    get description(): string {
      const s = this as unknown as ChecklistState;
      return s.openCount === 0 ? s.words.descNone : s.openCount === 1 ? s.words.descOne : s.words.descMany.replace("{n}", String(s.openCount));
    },
    num(n: number): string {
      return new Intl.NumberFormat(`${(this as unknown as ChecklistState).locale}-u-nu-latn`).format(n);
    },
    textOf(this: ChecklistState, issue: SeoIssue) {
      return this.texts[issue.code] ?? { title: issue.code, why: "", fix: "" };
    },
    markLabel(this: ChecklistState, issue: SeoIssue): string {
      return this.words.markFixed.replace("{title}", this.textOf(issue).title);
    },
    /** Which of the four badges an issue shows: fixed, or its severity. */
    badgeOf(this: ChecklistState, issue: SeoIssue): "fixed" | SeoSeverity {
      return this.marks[issue.id] ? "fixed" : issue.severity;
    },
    badgeText(this: ChecklistState, issue: SeoIssue): string {
      return this.marks[issue.id] ? this.words.fixed : this.words[issue.severity];
    },
    async ask(this: ChecklistState, name: string, detail: Detail): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.host ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    async toggle(this: ChecklistState, issue: SeoIssue, fixed: boolean) {
      if (!this.can) return;
      this.notice = "";
      let error = "";
      try {
        const out = await this.ask("toggle-fixed", { issue: { ...issue, fixed: !fixed }, fixed });
        if (out && out.error) error = out.error;
      } catch {
        error = this.words.failed;
      }
      if (!this.alive || !error) return;
      this.notice = error;
      this.seen[issue.id] = !fixed;
      this.marks = { ...this.marks, [issue.id]: !fixed };
    },
  }));
};
