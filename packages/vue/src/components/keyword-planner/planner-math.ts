/*
 * Keyword planner maths: search intent from the wording, clusters of related keywords, and cannibalization (several of
 * your pages ranking for the same keyword). Pure, shared by the UI and the tests. Works for English and Arabic.
 */

export type SearchIntent = "informational" | "commercial" | "transactional" | "navigational";

const TRANSACTIONAL = ["buy", "price", "pricing", "cheap", "discount", "coupon", "order", "subscribe", "download", "free trial", "hire", "quote", "شراء", "سعر", "أسعار", "اسعار", "رخيص", "خصم", "اشتراك", "تحميل", "طلب"];
const COMMERCIAL = ["best", "top", "review", "reviews", "vs", "versus", "compare", "comparison", "alternative", "alternatives", "أفضل", "مقارنة", "مراجعة", "بديل", "بدائل"];
const INFORMATIONAL = ["how", "what", "why", "when", "guide", "tutorial", "learn", "tips", "examples", "example", "meaning", "كيف", "ما هو", "ما هي", "لماذا", "شرح", "دليل", "طريقة", "أمثلة"];
const NAVIGATIONAL = ["login", "log in", "sign in", "dashboard", "contact", "support", "docs", "تسجيل الدخول", "دخول", "لوحة التحكم", "تواصل", "الدعم"];

function hasTerm(text: string, terms: readonly string[]): boolean {
  return terms.some((t) => (/^[؀-ۿ ]+$/.test(t) ? text.includes(t) : new RegExp(`(^|[^a-z])${t.replace(/ /g, "\\s+")}([^a-z]|$)`).test(text)));
}

/**
 * Guesses the intent behind a keyword from its wording. Transactional beats commercial beats navigational beats
 * informational; a keyword with no signal defaults to informational.
 */
export function classifyIntent(keyword: string): SearchIntent {
  const k = keyword.toLowerCase().trim();
  if (hasTerm(k, TRANSACTIONAL)) return "transactional";
  if (hasTerm(k, COMMERCIAL)) return "commercial";
  if (hasTerm(k, NAVIGATIONAL)) return "navigational";
  return "informational";
}

const STOP = new Set(["a", "an", "the", "for", "of", "to", "in", "on", "and", "with", "how", "what", "best", "في", "من", "على", "و", "مع", "ما", "هو", "هي", "كيف"]);

/** Lowercased words without stop words, with a trailing plural "s" folded ("components" is "component"). */
export function keywordTokens(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w && !STOP.has(w))
    .map((w) => (/^[a-z]{4,}s$/.test(w) && !w.endsWith("ss") ? w.slice(0, -1) : w));
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const sa = new Set(a);
  const sb = new Set(b);
  let both = 0;
  for (const x of sa) if (sb.has(x)) both += 1;
  const union = sa.size + sb.size - both;
  return union === 0 ? 0 : both / union;
}

export interface ClusterInput {
  id: string;
  keyword: string;
  volume: number;
}

export interface KeywordCluster<T extends ClusterInput = ClusterInput> {
  id: string;
  /** The keyword with the most volume: the cluster's name. */
  head: string;
  keywords: T[];
  volume: number;
}

/**
 * Groups keywords that share their meaningful words: a keyword joins the first cluster whose head it overlaps with
 * (Jaccard 0.5 or more, or the head's words are all inside it). Heads are the biggest keywords, so big terms attract
 * their long tails. Clusters come back biggest volume first.
 */
export function clusterKeywords<T extends ClusterInput>(rows: readonly T[], threshold = 0.5): KeywordCluster<T>[] {
  const byVolume = [...rows].sort((a, b) => b.volume - a.volume || a.keyword.localeCompare(b.keyword));
  const clusters: { head: T; tokens: string[]; members: T[] }[] = [];
  for (const row of byVolume) {
    const tokens = keywordTokens(row.keyword);
    const home = clusters.find((c) => {
      if (tokens.length === 0 || c.tokens.length === 0) return false;
      const inside = c.tokens.every((t) => tokens.includes(t));
      return inside || jaccard(tokens, c.tokens) >= threshold;
    });
    if (home) home.members.push(row);
    else clusters.push({ head: row, tokens, members: [row] });
  }
  return clusters
    .map((c) => ({ id: `cluster-${c.head.id}`, head: c.head.keyword, keywords: c.members, volume: c.members.reduce((s, r) => s + r.volume, 0) }))
    .sort((a, b) => b.volume - a.volume || a.head.localeCompare(b.head));
}

export interface RankingUrl {
  url: string;
  position: number;
}

export interface Cannibalization {
  keyword: string;
  /** The URLs that rank, best first. */
  urls: RankingUrl[];
  /** The URL to keep: the assigned owner if it is one of them, else the best ranking one. */
  keep: string;
}

/** Path only, without query, fragment, trailing slash or "www.": "/Blog/" and "/blog" are the same page. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(/^[a-z]+:\/\//i.test(url) ? url : `https://x.invalid${url.startsWith("/") ? "" : "/"}${url}`);
    const host = u.hostname === "x.invalid" ? "" : u.hostname.replace(/^www\./, "");
    return `${host}${u.pathname.replace(/\/+$/, "") || "/"}`.toLowerCase();
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Keywords where two or more of your pages rank within `depth` (default the top 20). Pages that differ only by
 * a query string or trailing slash are one page. The page to keep is the assigned owner when it ranks, else the best.
 */
export function findCannibalization(rows: readonly { keyword: string; ownerUrl?: string; rankingUrls?: readonly RankingUrl[] }[], depth = 20): Cannibalization[] {
  const out: Cannibalization[] = [];
  for (const row of rows) {
    const best = new Map<string, RankingUrl>();
    for (const r of row.rankingUrls ?? []) {
      if (r.position > depth) continue;
      const key = normalizeUrl(r.url);
      const prev = best.get(key);
      if (!prev || r.position < prev.position) best.set(key, r);
    }
    if (best.size < 2) continue;
    const urls = [...best.values()].sort((a, b) => a.position - b.position);
    const owner = row.ownerUrl ? urls.find((u) => normalizeUrl(u.url) === normalizeUrl(row.ownerUrl!)) : undefined;
    out.push({ keyword: row.keyword, urls, keep: (owner ?? urls[0]!).url });
  }
  return out.sort((a, b) => a.urls[0]!.position - b.urls[0]!.position || a.keyword.localeCompare(b.keyword));
}
