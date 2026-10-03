// Pure logic for the storefront chrome: search suggestions, keyboard movement, highlighting, recent searches and
// announcement rotation. No framework.
import type { CommerceProduct } from "../store-listing/commerce";
import { type ListingCategoryNode, listingNormalize, listingSearchScore } from "../store-listing/listing-model";

export type ChromeSuggestionKind = "product" | "category" | "recent" | "popular";

export interface ChromeSuggestion {
  /** Stable key, unique across kinds. */
  id: string;
  kind: ChromeSuggestionKind;
  label: string;
  /** The search text this suggestion runs. */
  query: string;
  productId?: string;
  categoryId?: string;
  /** Category breadcrumb, "Clothing / Tops", for category rows. */
  path?: string;
}

export interface ChromeFlatCategory {
  id: string;
  label: string;
  path: string;
}

/** Every node of a category tree with its breadcrumb path. */
export function chromeFlattenCategories(tree: readonly ListingCategoryNode[], parents: string[] = []): ChromeFlatCategory[] {
  return tree.flatMap((n) => {
    const trail = [...parents, n.label];
    return [{ id: n.id, label: n.label, path: trail.join(" / ") }, ...chromeFlattenCategories(n.children ?? [], trail)];
  });
}

export interface ChromeSuggestOptions {
  categories?: readonly ChromeFlatCategory[];
  recent?: readonly string[];
  popular?: readonly string[];
  maxProducts?: number;
  maxCategories?: number;
  maxRecent?: number;
  maxPopular?: number;
}

/**
 * What the search box offers. An empty query lists recent then popular searches. Otherwise: categories whose name
 * matches, then the best-scoring products, then recent searches that continue the query.
 */
export function chromeSuggest(products: readonly CommerceProduct[], query: string, options: ChromeSuggestOptions = {}): ChromeSuggestion[] {
  const { categories = [], recent = [], popular = [], maxProducts = 5, maxCategories = 3, maxRecent = 4, maxPopular = 5 } = options;
  const q = listingNormalize(query);
  if (!q) {
    return [
      ...recent.slice(0, maxRecent).map((r): ChromeSuggestion => ({ id: `recent:${r}`, kind: "recent", label: r, query: r })),
      ...popular
        .filter((p) => !recent.includes(p))
        .slice(0, maxPopular)
        .map((p): ChromeSuggestion => ({ id: `popular:${p}`, kind: "popular", label: p, query: p })),
    ];
  }
  const cats = categories
    .filter((c) => listingNormalize(c.label).includes(q))
    .slice(0, maxCategories)
    .map((c): ChromeSuggestion => ({ id: `category:${c.id}`, kind: "category", label: c.label, query: c.label, categoryId: c.id, path: c.path }));
  const found = products
    .filter((p) => p.status !== "draft" && p.status !== "archived")
    .map((p) => ({ p, score: listingSearchScore(p, query) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.p.name.localeCompare(b.p.name))
    .slice(0, maxProducts)
    .map(({ p }): ChromeSuggestion => ({ id: `product:${p.id}`, kind: "product", label: p.name, query: p.name, productId: p.id }));
  const past = recent
    .filter((r) => listingNormalize(r).startsWith(q) && listingNormalize(r) !== q)
    .slice(0, maxRecent)
    .map((r): ChromeSuggestion => ({ id: `recent:${r}`, kind: "recent", label: r, query: r }));
  return [...cats, ...found, ...past];
}

/** Next highlighted row for a key. -1 means none. Arrows wrap; Home and End jump. */
export function chromeMoveActive(active: number, count: number, key: string): number {
  if (count <= 0) return -1;
  switch (key) {
    case "ArrowDown":
      return active < 0 || active >= count - 1 ? 0 : active + 1;
    case "ArrowUp":
      return active <= 0 ? count - 1 : active - 1;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return active;
  }
}

export interface ChromeSegment {
  text: string;
  match: boolean;
}

/** Splits text so the parts that match the query can be emphasised. Accent-insensitive, Arabic normalised. */
export function chromeHighlight(text: string, query: string): ChromeSegment[] {
  const words = listingNormalize(query).split(/\s+/).filter(Boolean);
  if (!words.length || !text) return [{ text, match: false }];
  // Normalise per character so matches map back to the original text even when accents are stripped.
  const chars = [...text];
  const norm = chars.map((c) => listingNormalize(c));
  const flags = chars.map(() => false);
  const joined = norm.join("");
  const offsets: number[] = [];
  norm.forEach((n, i) => {
    for (let k = 0; k < n.length; k++) offsets.push(i);
  });
  for (const w of words) {
    let from = 0;
    for (;;) {
      const at = joined.indexOf(w, from);
      if (at < 0) break;
      for (let k = at; k < at + w.length; k++) flags[offsets[k]!] = true;
      from = at + w.length;
    }
  }
  const out: ChromeSegment[] = [];
  chars.forEach((c, i) => {
    const last = out[out.length - 1];
    if (last && last.match === flags[i]) last.text += c;
    else out.push({ text: c, match: flags[i]! });
  });
  return out;
}

/** Puts a search first in the recent list, dropping duplicates (ignoring case and accents) and capping the length. */
export function chromeRecordRecent(list: readonly string[], query: string, max = 6): string[] {
  const q = query.trim();
  if (!q) return [...list];
  const key = listingNormalize(q);
  return [q, ...list.filter((r) => listingNormalize(r) !== key)].slice(0, max);
}

export interface ChromeAnnouncement {
  id: string;
  /** Epoch ms; hidden before. */
  from?: number;
  /** Epoch ms; hidden after. */
  until?: number;
}

/** Announcements that are live at `now` and not dismissed. */
export function chromeLiveAnnouncements<T extends ChromeAnnouncement>(items: readonly T[], dismissed: readonly string[], now: number): T[] {
  return items.filter((a) => !dismissed.includes(a.id) && (a.from === undefined || now >= a.from) && (a.until === undefined || now < a.until));
}

/** Index after a step, wrapping. `count` 0 gives 0. */
export function chromeStep(index: number, count: number, step: 1 | -1): number {
  return count <= 0 ? 0 : (((index + step) % count) + count) % count;
}
