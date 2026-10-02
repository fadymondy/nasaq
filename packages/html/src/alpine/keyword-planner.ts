// nqKeywordPlanner: plan which page owns which keyword, group related keywords into clusters and catch pages that compete for one keyword.
// The markup is the React KeywordPlanner's (see the Blade component); the state and the maths live here. The keywords table is the shared
// <x-nq::data-table>, driven through its x-modelable `rows`.
//
//   <div x-data="nqKeywordPlanner([{ id: 'k1', keyword: 'arabic design system', volume: 2400, difficulty: 38, ownerUrl: '/design-system' }], { …words })"> … </div>
//
// Keyword: id, keyword, volume, difficulty, intent (default guessed from the wording), ownerUrl, rankingUrls ([{ url, position }]).
// Bubbling event `nq-keyword-planner-assign` { id, url, promise } on every owner change ("" removes the owner); a listener may set
// `event.detail.promise` to a Promise (or one resolving to { error }); an error rolls the owner back and shows a status alert.
// The owner cell is validated here: empty, "/path" or "https://…".

import { classifyIntent, clusterKeywords, findCannibalization, normalizeUrl, type Cannibalization, type KeywordCluster, type RankingUrl, type SearchIntent } from "./keyword-planner-logic";
import type { Magics, Register } from "./types";

interface Keyword {
  id: string;
  keyword: string;
  volume: number;
  difficulty: number;
  intent?: SearchIntent;
  ownerUrl?: string;
  rankingUrls?: RankingUrl[];
}
interface Words {
  failed: string;
  ownerInvalid: string;
  conflictTitle: string;
  conflictZero: string;
  conflictOne: string;
  clusterKeywordsOne: string;
  clusterKeywordsMany: string;
  positionShort: string;
}
type Row = Record<string, unknown>;

const fill = (s: string, vars: Record<string, string | number>) => Object.entries(vars).reduce((a, [k, v]) => a.split(`{${k}}`).join(String(v)), s);

export const keywordPlanner: Register = (Alpine) => {
  Alpine.data("nqKeywordPlanner", (initial: Keyword[] = [], words: Partial<Words> = {}) => ({
    keywords: initial.map((k) => ({ ...k })) as Keyword[],
    tableRows: [] as Row[],
    clusters: [] as KeywordCluster<Keyword>[],
    conflicts: [] as Cannibalization[],
    saveError: "",
    words: words as Words,

    init(this: Magics & Record<string, unknown> & { refresh(): void }) {
      this.refresh();
    },
    refresh(this: { keywords: Keyword[]; tableRows: Row[]; clusters: KeywordCluster<Keyword>[]; conflicts: Cannibalization[]; words: Words }) {
      this.clusters = clusterKeywords(this.keywords);
      this.conflicts = findCannibalization(this.keywords);
      const head = new Map<string, string>();
      for (const c of this.clusters) for (const k of c.keywords) head.set(k.id, c.head);
      const conflicted = new Set(this.conflicts.map((c) => c.keyword));
      this.tableRows = this.keywords.map((k) => ({
        id: k.id,
        keyword: k.keyword,
        intent: k.intent ?? classifyIntent(k.keyword),
        cluster: head.get(k.id) ?? "",
        volume: k.volume,
        difficulty: k.difficulty,
        owner: k.ownerUrl ?? "",
        status: conflicted.has(k.keyword) ? "conflict" : k.ownerUrl ? "owned" : "unassigned",
      }));
    },
    get conflictLine(): string {
      const n = this.conflicts.length;
      if (n === 0) return this.words.conflictZero;
      return n === 1 ? this.words.conflictOne : fill(this.words.conflictTitle, { n });
    },
    clusterCount(n: number): string {
      return fill(n === 1 ? this.words.clusterKeywordsOne : this.words.clusterKeywordsMany, { n });
    },
    positionText(n: number): string {
      return fill(this.words.positionShort, { n });
    },
    isKeep(url: string, keep: string): boolean {
      return normalizeUrl(url) === normalizeUrl(keep);
    },
    /** Sets (or, with "", clears) the owner of a keyword. Resolves to { error } when it was refused or the host's promise failed. */
    async assign(this: Magics & { keywords: Keyword[]; saveError: string; words: Words; refresh(): void }, id: string, url: string): Promise<{ error?: string } | void> {
      const value = url.trim();
      if (value !== "" && !/^\/|^https?:\/\//i.test(value)) return { error: this.words.ownerInvalid };
      const before = this.keywords;
      this.saveError = "";
      this.keywords = before.map((k) => (k.id === id ? { ...k, ownerUrl: value || undefined } : k));
      this.refresh();
      const detail: { id: string; url: string; promise?: Promise<unknown> | unknown } = { id, url: value };
      this.$root.dispatchEvent(new CustomEvent("nq-keyword-planner-assign", { bubbles: true, detail }));
      let failure = "";
      try {
        const r = (await detail.promise) as { error?: string } | undefined | void;
        if (r && typeof r === "object" && r.error) failure = r.error;
      } catch {
        failure = this.words.failed;
      }
      if (failure) {
        this.keywords = before;
        this.refresh();
        this.saveError = failure;
        return { error: failure };
      }
    },
    /** The table's `nq-data-table-edit`: validates and saves the owner column. */
    onEdit(this: { assign(id: string, url: string): Promise<unknown> }, e: CustomEvent<{ row: Row; column: string; value: unknown; promise?: unknown }>) {
      if (e.detail.column !== "owner") return;
      e.detail.promise = this.assign(String(e.detail.row.id), String(e.detail.value ?? ""));
    },
    /** The table's `nq-data-table-action`: "clear" removes the owner. */
    onAction(this: { assign(id: string, url: string): Promise<unknown> }, e: CustomEvent<{ action: string; row: Row }>) {
      if (e.detail.action === "clear") void this.assign(String(e.detail.row.id), "");
    },
    keepThis(this: { keywords: Keyword[]; assign(id: string, url: string): Promise<unknown> }, keyword: string, url: string) {
      const k = this.keywords.find((x) => x.keyword === keyword);
      if (k) void this.assign(k.id, url);
    },
  }));
};
