// nqSemanticSearch: a search box for a knowledge base with ranked results, marked query words, a similarity score and facet chips
// (group, type, source, high importance) that narrow the hits on the client. The markup is the React SemanticSearch's (see the
// Blade component); the hits are rendered here from `results`.
//
//   <section data-slot="semantic-search" x-data="nqSemanticSearch({ results: [], mode: 'semantic', limit: 10 })" x-modelable="results"> … </section>
//
// Submitting dispatches the bubbling `nq-semantic-search` with { query, mode, limit, promise? }: a listener sets `event.detail.promise`
// to a Promise resolving to the hits array (or { error }); the hits replace `results`. Or set `results` yourself (x-model).
// `nq-semantic-open` is dispatched with { hit } from the Open button. The result context menu is not ported.
// Options: results, query, mode, limit, locale, labels (levels, countOne, countMany, countOf, none, allFiltered, scoreTitle, importance, via, failed).

import type { Magics, Register } from "./types";

interface Hit {
  id: string;
  content: string;
  score: number;
  group?: string;
  kind?: string;
  source?: string;
  sourceRef?: string;
  importance?: number;
  viaEntity?: string;
}
type Field = "group" | "kind" | "source";
const FIELDS: Field[] = ["group", "kind", "source"];
const HIGH = 0.7;

interface Options {
  results?: Hit[];
  query?: string;
  mode?: string;
  limit?: number;
  locale?: string;
  labels?: Record<string, string>;
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

interface State extends Magics {
  results: Hit[];
  query: string;
  asked: string | null;
  mode: string;
  limit: number;
  searching: boolean;
  error: string | null;
  selected: Record<Field, string[]>;
  high: boolean;
  locale: string;
  labels: Record<string, string>;
  copied: string | null;
  root: HTMLElement | null;
  num(n: number, digits?: number): string;
  fig(n: number): string;
  clear(): void;
}

export const semanticSearch: Register = (Alpine) => {
  Alpine.data("nqSemanticSearch", (options: Options = {}) => ({
    results: (options.results ?? []).map((h) => ({ ...h })),
    query: options.query ?? "",
    asked: null as string | null,
    mode: options.mode ?? "semantic",
    limit: options.limit ?? 10,
    searching: false,
    error: null as string | null,
    selected: { group: [], kind: [], source: [] } as Record<Field, string[]>,
    high: false,
    copied: null as string | null,
    locale: options.locale ?? (typeof document !== "undefined" ? document.documentElement.lang || "en" : "en"),
    labels: { strong: "Strong", good: "Good", weak: "Weak", failed: "The search failed. Try again.", ...options.labels } as Record<string, string>,
    root: null as HTMLElement | null,
    init(this: State) {
      this.root = this.$el;
    },
    num(this: State, n: number, digits?: number): string {
      return new Intl.NumberFormat(`${this.locale}-u-nu-latn`, digits ? { minimumFractionDigits: digits, maximumFractionDigits: digits } : undefined).format(n);
    },
    fig(this: State, n: number): string {
      return this.num(clamp01(n), 2);
    },
    level(this: State, h: Hit): string {
      const s = clamp01(h.score);
      return this.labels[s >= 0.75 ? "strong" : s >= 0.5 ? "good" : "weak"] ?? "";
    },
    weak(h: Hit): boolean {
      return clamp01(h.score) < 0.5;
    },
    scoreWidth(h: Hit): string {
      return `width: ${clamp01(h.score) * 100}%`;
    },
    scoreTitle(this: State, h: Hit): string {
      return (this.labels.scoreTitle ?? "Similarity {n}").replace("{n}", this.fig(h.score));
    },
    importanceText(this: State, h: Hit): string {
      return (this.labels.importance ?? "Importance {n}").replace("{n}", this.fig(h.importance ?? 0));
    },
    viaText(this: State, h: Hit): string {
      return (this.labels.via ?? "via {entity}").replace("{entity}", h.viaEntity ?? "");
    },
    tag(h: Hit): string {
      return [h.group, h.kind].filter(Boolean).join(" · ");
    },
    sourceText(h: Hit): string {
      return `${h.source ?? ""}${h.sourceRef ? ` · ${h.sourceRef}` : ""}`;
    },
    values(this: State, field: Field): string[] {
      const counts = new Map<string, number>();
      for (const h of this.results) {
        const v = h[field];
        if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
      }
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([v]) => v);
    },
    get hasImportance(): boolean {
      return (this as unknown as State).results.some((h) => h.importance !== undefined);
    },
    get filtered(): boolean {
      const s = this as unknown as State;
      return s.high || FIELDS.some((f) => s.selected[f].length > 0);
    },
    get shown(): Hit[] {
      const s = this as unknown as State;
      return s.results.filter(
        (h) => FIELDS.every((f) => s.selected[f].length === 0 || (h[f] !== undefined && s.selected[f].includes(h[f] as string))) && (!s.high || (h.importance ?? 0) >= HIGH),
      );
    },
    get countText(): string {
      const s = this as unknown as State & { shown: Hit[]; filtered: boolean };
      const n = s.num(s.shown.length);
      if (s.filtered) return (s.labels.countOf ?? "{n} of {total} results").replace("{n}", n).replace("{total}", s.num(s.results.length));
      return s.shown.length === 1 ? (s.labels.countOne ?? "1 result") : (s.labels.countMany ?? "{n} results").replace("{n}", n);
    },
    get noneText(): string {
      const s = this as unknown as State;
      return (s.labels.none ?? "Nothing found for “{q}”").replace("{q}", s.asked ?? s.query);
    },
    get filteredText(): string {
      const s = this as unknown as State;
      return (s.labels.allFiltered ?? "All {n} results are hidden by the filters.").replace("{n}", s.num(s.results.length));
    },
    isOn(this: State, field: Field, value: string): boolean {
      return this.selected[field].includes(value);
    },
    toggle(this: State, field: Field, value: string) {
      const list = this.selected[field];
      this.selected[field] = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    },
    clear(this: State) {
      this.selected = { group: [], kind: [], source: [] };
      this.high = false;
    },
    /** The hit text as HTML with the query words wrapped in <mark>; the text itself is escaped. */
    marked(this: State, h: Hit): string {
      const q = this.asked ?? this.query;
      const words = [...new Set(q.split(/[\s,،.;:!?؟"'()]+/).filter((w) => w.length >= 2))].sort((a, b) => b.length - a.length);
      if (!words.length || !h.content) return esc(h.content ?? "");
      const re = new RegExp(`(${words.map(escapeRe).join("|")})`, "giu");
      return h.content
        .split(re)
        .map((p, i) => (i % 2 === 1 ? `<mark class="rounded-[3px] bg-nq-accent/20 px-0.5 text-inherit">${esc(p)}</mark>` : esc(p)))
        .join("");
    },
    open(this: State, hit: Hit) {
      this.root?.dispatchEvent(new CustomEvent("nq-semantic-open", { bubbles: true, detail: { hit: { ...hit } } }));
    },
    async copy(this: State, hit: Hit) {
      try {
        await navigator.clipboard?.writeText(hit.content);
      } catch {
        /* clipboard can be blocked */
      }
      this.copied = hit.id;
      setTimeout(() => {
        if (this.copied === hit.id) this.copied = null;
      }, 1600);
    },
    async submit(this: State) {
      const q = this.query.trim();
      if (!q || this.searching) return;
      this.clear();
      this.asked = q;
      this.error = null;
      this.searching = true;
      const detail: { query: string; mode: string; limit: number; promise?: Promise<unknown> | unknown } = { query: q, mode: this.mode, limit: this.limit };
      this.root?.dispatchEvent(new CustomEvent("nq-semantic-search", { bubbles: true, detail }));
      try {
        const r = (await detail.promise) as Hit[] | { error?: string; results?: Hit[] } | undefined | void;
        if (Array.isArray(r)) this.results = r;
        else if (r && typeof r === "object") {
          if (r.error) this.error = r.error;
          else if (Array.isArray(r.results)) this.results = r.results;
        }
      } catch (e) {
        this.error = e instanceof Error && e.message ? e.message : (this.labels.failed ?? "");
      }
      this.searching = false;
    },
  }));
};
