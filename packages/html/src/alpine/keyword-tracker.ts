// nqKeywordTracker: the live state of the rank tracking card: the four tiles, the ranking distribution, the biggest movers, the keywords table
// (change arrows, best, trend, ranking URL, volume, difficulty, SERP features), the add dialog and the stop-tracking confirmation.
// The markup is the React KeywordTracker's (see the Blade component); the maths is keyword-tracker-logic.ts. The keywords table is the shared
// <x-nq::data-table>, driven through its x-modelable `rows`.
//
//   <div x-data="nqKeywordTracker({ keywords: [...], locations: [...], defaultLocation: 'sa', can: { add, remove, refresh, update, open }, words: {…} })"
//        x-on:nq-data-table-action="onAction($event)" x-on:nq-data-table-edit="onEdit($event)"> … </div>
//
// Keyword: id, keyword, position (null = not ranking), previousPosition (null = was not ranking, left out = unknown), history ([position|null]), best, url, volume,
// difficulty, features ([snippet | paa | images | video | local | sitelinks | reviews | ads]).
// Host events (bubbling, on the root) carry `wait(promise)`: resolve, or resolve { error } shown above the table (or in the dialog); a rejection, or nobody
// listening, shows the generic error. The last `wait` wins.
//   add-keywords      { keywords: [text], location, device, wait }   resolve { keywords: [Keyword] } to add the new rows to the table
//   remove-keywords   { ids, wait }                                  on success the rows leave the table
//   refresh-keywords  { ids ([] = every keyword), wait }
//   update-keyword    { id, patch: { url }, wait }                   the ranking URL edited in the table
//   open-keyword      { keyword }                                    a row was opened (row click or the row menu); no wait
// Differences from the React component: the position history chart is drawn once by the Blade component (it does not change with the rows), and the table
// opens sorted by position because the Blade table has no default sort option.

import { averagePosition, bestPosition, competitorStats, difficultyBand, parseKeywordList, rankChange, rankDistribution, topMovers, visibilityShare, RANK_BUCKETS, type RankBucket, type RankPosition } from "./keyword-tracker-logic";
import type { Magics, Register } from "./types";

interface Keyword {
  id: string;
  keyword: string;
  position: RankPosition;
  previousPosition?: RankPosition;
  history?: RankPosition[];
  best?: RankPosition;
  url?: string;
  volume: number;
  difficulty: number;
  features?: string[];
}
interface Location {
  value: string;
  label: string;
}
interface Words {
  locale: string;
  failed: string;
  notRanking: string;
  keywordsRequired: string;
  urlInvalid: string;
  trend: string;
  up: string;
  down: string;
  same: string;
  newRank: string;
  lostRank: string;
  keywordCount: string[];
  addSubmit: string[];
  removeTitle: string[];
  bucketCount: string;
  vsPrevious: string;
  was: string;
  band: Record<"easy" | "medium" | "hard", string>;
  feature: Record<string, string>;
  bucket: Record<RankBucket, string>;
  urlEmpty: string;
  volumePerMonth: string;
  ahead: string[];
}
interface Competitor {
  id: string;
  domain: string;
  you?: boolean;
  ranks: Record<string, RankPosition>;
}
interface Config {
  keywords: Keyword[];
  competitors?: Competitor[];
  locations: Location[];
  defaultLocation?: string;
  can: { add: boolean; remove: boolean; refresh: boolean; update: boolean; open: boolean };
  words: Words;
}
type Outcome = { error?: string; keywords?: Keyword[] } | void | undefined;

interface Row {
  id: string;
  keyword: string;
  position: number;
  positionText: string;
  ranked: boolean;
  dir: string;
  deltaText: string;
  changeText: string;
  best: number;
  bestText: string;
  trendPath: string;
  trendLabel: string;
  trendColor: string;
  url: string;
  volume: number;
  volumeText: string;
  difficulty: number;
  band: string;
  difficultyText: string;
  difficultyTone: string;
  features: { id: string; label: string }[];
  actions: string[];
}
interface Tile {
  id: string;
  value: string;
  was: string;
  delta: string;
  tone: string;
}

const fill = (s: string, vars: Record<string, string | number>): string => s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
const TONE = { easy: "success", medium: "warning", hard: "danger" } as const;
const BAR = { top3: "bg-nq-success", top10: "bg-nq-info", top100: "bg-nq-warning", unranked: "bg-nq-line-strong" } as const;

/** A polyline for the trend cell. Higher on the chart is a better rank (the position is negated); a day without a rank sits at the bottom. */
function trendPath(history: readonly RankPosition[]): string {
  const ys = history.map((p) => -(p ?? 101));
  const lo = Math.min(...ys);
  const span = Math.max(...ys) - lo || 1;
  const w = 96;
  const h = 28;
  return ys.map((y, i) => `${i === 0 ? "M" : "L"}${((i / (ys.length - 1)) * w).toFixed(1)} ${(h - 3 - ((y - lo) / span) * (h - 6)).toFixed(1)}`).join(" ");
}

interface State extends Magics {
  keywords: Keyword[];
  competitors: Competitor[];
  words: Words;
  locations: Location[];
  can: Config["can"];
  tableRows: Row[];
  summaryRows: unknown[];
  matrixRows: unknown[];
  notice: string;
  busy: boolean;
  alive: boolean;
  host: HTMLElement | null;
  addOpen: boolean;
  addText: string;
  addTouched: boolean;
  addBad: boolean;
  addMsg: string;
  addError: string | null;
  addLocation: string;
  deviceSel: string[];
  removeOpen: boolean;
  removeIds: string[];
  num(n: number, options?: Intl.NumberFormatOptions): string;
  refresh(): void;
  changeOf(k: Keyword): { dir: string; deltaText: string; changeText: string };
  askRemove(ids: string[]): void;
  run(name: string, detail: Record<string, unknown>): Promise<{ ok: Outcome } | null>;
  ask(name: string, detail: Record<string, unknown>): Promise<Outcome>;
}

export const keywordTracker: Register = (Alpine) => {
  Alpine.data("nqKeywordTracker", (config: Config) => ({
    keywords: config.keywords.map((k) => ({ ...k })) as Keyword[],
    words: config.words,
    competitors: (config.competitors ?? []) as Competitor[],
    locations: config.locations,
    can: config.can,
    tableRows: [] as Row[],
    summaryRows: [] as unknown[],
    matrixRows: [] as unknown[],
    notice: "",
    busy: false,
    alive: true,
    host: null as HTMLElement | null,
    addOpen: false,
    addText: "",
    addTouched: false,
    addBad: false,
    addMsg: "",
    addError: null as string | null,
    addLocation: config.defaultLocation ?? config.locations[0]?.value ?? "",
    deviceSel: ["desktop"] as string[],
    removeOpen: false,
    removeIds: [] as string[],
    init(this: State) {
      this.host = this.$el;
      this.refresh();
    },
    destroy(this: State) {
      this.alive = false;
    },
    /** A figure with Latin digits, as the tiles and the table show it. */
    num(this: State, n: number, options?: Intl.NumberFormatOptions): string {
      return new Intl.NumberFormat(`${this.words.locale}-u-nu-latn`, options).format(n);
    },

    /* ---------------------------------------------------------------- derived figures */
    get stats() {
      const s = this as unknown as State;
      const ks = s.keywords;
      const now = ks.map((k) => k.position);
      const prevOf = (k: Keyword) => (k.previousPosition === undefined ? k.position : k.previousPosition);
      const hasPrev = ks.some((k) => k.previousPosition !== undefined);
      const top10 = (ps: RankPosition[]) => ps.filter((p) => p !== null && p <= 10).length;
      return {
        distribution: rankDistribution(now),
        avg: averagePosition(now),
        avgPrev: hasPrev ? averagePosition(ks.map(prevOf)) : undefined,
        top10: top10(now),
        top10Prev: hasPrev ? top10(ks.map(prevOf)) : undefined,
        visibility: visibilityShare(ks),
        visibilityPrev: hasPrev ? visibilityShare(ks.map((k) => ({ volume: k.volume, position: prevOf(k) }))) : undefined,
        movers: topMovers(ks, 3),
      };
    },
    /** The four tiles: tracked, average position (down is good), in the top 10 and visibility. */
    get tiles(): Tile[] {
      const s = this as unknown as State & Record<string, any>;
      const st = s.stats;
      const avg: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
      const pct: Intl.NumberFormatOptions = { style: "percent", maximumFractionDigits: 1 };
      const make = (id: string, value: number, previous: number | undefined | null, opts: Intl.NumberFormatOptions | undefined, invert: boolean): Tile => {
        const text = s.num(value, opts);
        if (previous === undefined || previous === null) return { id, value: text, was: "", delta: "", tone: "neutral" };
        const change = previous === 0 ? 0 : (value - previous) / previous;
        const good = (change > 0) !== invert;
        return {
          id,
          value: text,
          was: `${s.words.was} ${s.num(previous, opts)}`,
          delta: change === 0 ? "" : `${change > 0 ? "+" : "-"}${s.num(Math.abs(change), { style: "percent", maximumFractionDigits: 1 })}`,
          tone: change === 0 ? "neutral" : good ? "positive" : "negative",
        };
      };
      return [
        make("tracked", s.keywords.length, undefined, undefined, false),
        make("avg", st.avg ?? 0, st.avgPrev, avg, true),
        make("top10", st.top10, st.top10Prev, undefined, false),
        make("visibility", st.visibility, st.visibilityPrev, pct, false),
      ];
    },
    get buckets() {
      const s = this as unknown as State & Record<string, any>;
      const d = s.stats.distribution;
      const pct = (n: number) => (d.total > 0 ? n / d.total : 0);
      return RANK_BUCKETS.map((b) => ({
        id: b,
        label: s.words.bucket[b],
        count: s.num(d[b]),
        share: s.num(pct(d[b]), { style: "percent", maximumFractionDigits: 0 }),
        width: `${(pct(d[b]) * 100).toFixed(2)}%`,
        shown: d[b] > 0,
        bar: BAR[b],
      }));
    },
    get distributionSummary(): string {
      const s = this as unknown as State & { buckets: { label: string; count: string; share: string }[] };
      return s.buckets.map((b) => fill(s.words.bucketCount, { label: b.label, n: b.count, share: b.share })).join(". ");
    },
    changeOf(this: State, k: Keyword) {
      const m = rankChange(k.previousPosition, k.position);
      const n = Math.abs(m.delta);
      return {
        dir: m.direction,
        deltaText: m.direction === "up" || m.direction === "down" ? this.num(n) : "",
        changeText: m.direction === "up" ? fill(this.words.up, { n: this.num(n) }) : m.direction === "down" ? fill(this.words.down, { n: this.num(n) }) : m.direction === "same" ? this.words.same : m.direction === "new" ? this.words.newRank : m.direction === "lost" ? this.words.lostRank : "",
      };
    },
    get movers() {
      const s = this as unknown as State & Record<string, any>;
      const pick = (rows: Keyword[]) => rows.map((k) => ({ id: k.id, keyword: k.keyword, ...s.changeOf(k) }));
      return { gainers: pick(s.stats.movers.gainers as Keyword[]), losers: pick(s.stats.movers.losers as Keyword[]) };
    },

    /* ---------------------------------------------------------------- competitors */
    /** One row per domain: visibility, average position and top 10 count, and how many keywords it is ahead of you. */
    get compSummary() {
      const s = this as unknown as State & Record<string, any>;
      const me = s.competitors.find((c: Competitor) => c.you);
      return s.competitors.map((c: Competitor) => {
        const st = competitorStats(c.ranks, s.keywords, me && c !== me ? me.ranks : undefined);
        return {
          id: c.id,
          domain: c.domain,
          you: !!c.you,
          visibility: st.visibility,
          visibilityText: s.num(st.visibility, { style: "percent", maximumFractionDigits: 1 }),
          avg: st.averagePosition ?? 1000,
          avgText: st.averagePosition === null ? "-" : s.num(st.averagePosition, { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          top10: st.top10,
          top10Text: s.num(st.top10),
          aheadText: me && c !== me ? fill(st.ahead === 1 ? s.words.ahead[0]! : s.words.ahead[1]!, { n: s.num(st.ahead) }) : "",
          other: !!me && c !== me,
        };
      });
    },
    /** One row per keyword with a rank cell per competitor (c0, c1, …), the best one flagged. */
    get compMatrix() {
      const s = this as unknown as State & Record<string, any>;
      return s.keywords.map((k: Keyword) => {
        const row: Record<string, unknown> = { id: k.id, keyword: k.keyword };
        const best = Math.min(...s.competitors.map((c: Competitor) => c.ranks[k.id] ?? Infinity));
        s.competitors.forEach((c: Competitor, i: number) => {
          const p = c.ranks[k.id] ?? null;
          row["c" + i] = p ?? 1000;
          row["c" + i + "Text"] = p === null ? "-" : s.num(p);
          row["c" + i + "Best"] = p !== null && p === best;
        });
        return row;
      });
    },

    /* ---------------------------------------------------------------- the table */
    buildRows(this: State): Row[] {
      const w = this.words;
      const rows = this.keywords.map((k): Row => {
        const change = this.changeOf(k);
        const best = k.best !== undefined ? k.best : bestPosition([...(k.history ?? []), k.position]);
        const band = difficultyBand(k.difficulty);
        const actions: string[] = this.can.open ? ["open"] : [];
        if (this.can.refresh) actions.push("refresh");
        if (this.can.remove) actions.push("remove");
        const worse = k.position !== null && k.previousPosition != null && k.position > k.previousPosition;
        const hist = k.history && k.history.length > 1 ? k.history : null;
        return {
          id: k.id,
          keyword: k.keyword,
          position: k.position ?? 1000,
          positionText: k.position === null ? w.notRanking : this.num(k.position),
          ranked: k.position !== null,
          ...change,
          best: best ?? 1000,
          bestText: best === null ? "-" : this.num(best),
          trendPath: hist ? trendPath(hist) : "",
          trendLabel: hist ? `${k.keyword}: ${w.trend}` : "",
          trendColor: worse ? "var(--nq-danger)" : "var(--nq-success)",
          url: k.url ?? "",
          volume: k.volume,
          volumeText: this.num(k.volume, { notation: "compact", maximumFractionDigits: 1 }),
          difficulty: k.difficulty,
          band,
          difficultyText: `${this.num(k.difficulty)} ${w.band[band]}`,
          difficultyTone: TONE[band],
          features: (k.features ?? []).map((f) => ({ id: f, label: w.feature[f] ?? f })),
          actions,
        };
      });
      return rows.sort((a, b) => a.position - b.position);
    },
    refresh(this: State & { buildRows(): Row[]; compSummary: unknown[]; compMatrix: unknown[] }) {
      this.tableRows = this.buildRows();
      this.summaryRows = this.compSummary;
      this.matrixRows = this.compMatrix;
    },

    /* ---------------------------------------------------------------- host round trip */
    /** Fire an event on the host and wait for the promise the host hands to `wait`. */
    async ask(this: State, name: string, detail: Record<string, unknown>): Promise<Outcome> {
      let pending: Promise<Outcome> | undefined;
      const event = new CustomEvent(name, { bubbles: true, detail: { ...detail, wait: (p: Promise<Outcome>) => (pending = Promise.resolve(p)) } });
      (this.host ?? this.$el).dispatchEvent(event);
      if (!pending) throw new Error("no listener");
      return pending;
    },
    /** Runs a host action: returns the outcome, or null once it failed (the message is in `notice`). */
    async run(this: State, name: string, detail: Record<string, unknown>): Promise<{ ok: Outcome } | null> {
      this.busy = true;
      this.notice = "";
      try {
        const out = await this.ask(name, detail);
        if (!this.alive) return null;
        if (out && out.error) {
          this.notice = out.error;
          return null;
        }
        return { ok: out };
      } catch {
        if (this.alive) this.notice = this.words.failed;
        return null;
      } finally {
        if (this.alive) this.busy = false;
      }
    },

    /** The table's `nq-data-table-action`: open, refresh and remove. */
    onAction(this: State, event: CustomEvent<{ action: string; row: { id: string } }>) {
      const { action, row } = event.detail;
      const k = this.keywords.find((x) => x.id === row.id);
      if (!k) return;
      if (action === "open") this.host?.dispatchEvent(new CustomEvent("open-keyword", { bubbles: true, detail: { keyword: k } }));
      else if (action === "refresh") void this.run("refresh-keywords", { ids: [k.id] });
      else if (action === "remove") this.askRemove([k.id]);
    },
    /** The table's row click opens the keyword. */
    onRowClick(this: State, event: CustomEvent<{ row: { id: string } }>) {
      const k = this.keywords.find((x) => x.id === event.detail.row.id);
      if (k) this.host?.dispatchEvent(new CustomEvent("open-keyword", { bubbles: true, detail: { keyword: k } }));
    },
    /** "Check now": every keyword. */
    checkAll(this: State & Record<string, any>) {
      void this.run("refresh-keywords", { ids: [] });
    },
    /** The table's `nq-data-table-edit`: validates and saves the ranking URL. */
    onEdit(this: State & Record<string, any>, event: CustomEvent<{ row: { id: string }; column: string; value: unknown; promise?: unknown }>) {
      if (event.detail.column !== "url" || !this.can.update) return;
      const value = String(event.detail.value ?? "").trim();
      const id = event.detail.row.id;
      event.detail.promise = (async () => {
        if (value !== "" && !/^\/|^https?:\/\//i.test(value)) return { error: this.words.urlInvalid };
        const done = await this.run("update-keyword", { id, patch: { url: value } });
        if (!done) return { error: this.notice || this.words.failed };
        this.keywords = this.keywords.map((k: Keyword) => (k.id === id ? { ...k, url: value || undefined } : k));
        this.refresh();
      })();
    },

    /* ---------------------------------------------------------------- stop tracking */
    askRemove(this: State, ids: string[]) {
      this.removeIds = ids;
      this.removeOpen = true;
    },
    get removeTitle(): string {
      const s = this as unknown as State;
      const n = s.removeIds.length;
      return fill(n === 1 ? s.words.removeTitle[0]! : s.words.removeTitle[1]!, { n: s.num(n) });
    },
    async confirmRemove(this: State & Record<string, any>) {
      const ids = this.removeIds;
      this.removeOpen = false;
      const done = await this.run("remove-keywords", { ids });
      if (done) {
        this.keywords = this.keywords.filter((k: Keyword) => !ids.includes(k.id));
        this.refresh();
      }
    },

    /* ---------------------------------------------------------------- add dialog */
    openAdd(this: State) {
      this.addText = "";
      this.addTouched = this.addBad = false;
      this.addMsg = "";
      this.addError = null;
      this.addOpen = true;
    },
    get addKeywords(): string[] {
      return parseKeywordList((this as unknown as State).addText);
    },
    get addCountText(): string {
      const s = this as unknown as State & { addKeywords: string[] };
      const n = s.addKeywords.length;
      return n === 0 ? s.words.keywordCount[0]! : fill(n === 1 ? s.words.keywordCount[1]! : s.words.keywordCount[2]!, { n: s.num(n) });
    },
    get addLabel(): string {
      const s = this as unknown as State & { addKeywords: string[] };
      const n = s.addKeywords.length;
      return n > 1 ? fill(s.words.addSubmit[1]!, { n: s.num(n) }) : s.words.addSubmit[0]!;
    },
    async submitAdd(this: State & Record<string, any>) {
      if (this.busy) return;
      this.addTouched = true;
      const list: string[] = this.addKeywords;
      this.addBad = list.length === 0;
      this.addMsg = this.addBad ? this.words.keywordsRequired : "";
      if (this.addBad) return;
      this.busy = true;
      this.addError = null;
      try {
        const out = await this.ask("add-keywords", { keywords: list, location: this.addLocation, device: this.deviceSel[0] ?? "desktop" });
        if (!this.alive) return;
        if (out && out.error) this.addError = out.error;
        else {
          if (out && Array.isArray(out.keywords)) {
            this.keywords = [...this.keywords, ...out.keywords.map((k: Keyword) => ({ ...k }))];
            this.refresh();
          }
          this.addText = "";
          this.addOpen = false;
        }
      } catch {
        if (this.alive) this.addError = this.words.failed;
      } finally {
        if (this.alive) this.busy = false;
      }
    },
  }));
};

