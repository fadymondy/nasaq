export interface SemanticHitLike {
  score: number;
  group?: string;
  kind?: string;
  source?: string;
  importance?: number;
}

export type SemanticFacetField = "group" | "kind" | "source";
export const SEMANTIC_FACET_FIELDS: readonly SemanticFacetField[] = ["group", "kind", "source"];

export type SemanticFacetSelection = Record<SemanticFacetField, ReadonlySet<string>>;

export const EMPTY_FACETS: SemanticFacetSelection = { group: new Set(), kind: new Set(), source: new Set() };

/** Importance at or above this counts as "high". */
export const HIGH_IMPORTANCE = 0.7;

export type ScoreLevel = "strong" | "good" | "weak";

/** Buckets a 0..1 similarity score so it reads without colour or a number. */
export function scoreLevel(score: number): ScoreLevel {
  if (score >= 0.75) return "strong";
  if (score >= 0.5) return "good";
  return "weak";
}

export const clamp01 = (n: number) => (Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0);

/** The distinct values of one field across the hits, most common first, then alphabetical. */
export function facetValues(hits: readonly SemanticHitLike[], field: SemanticFacetField): { value: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const hit of hits) {
    const v = hit[field];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
}

export function hasFacetFilters(selection: SemanticFacetSelection, highImportance: boolean): boolean {
  return highImportance || SEMANTIC_FACET_FIELDS.some((f) => selection[f].size > 0);
}

/** Keeps a hit when it matches every field that has a selection (any of the chosen values) and, if asked, is high importance. */
export function filterHits<H extends SemanticHitLike>(hits: readonly H[], selection: SemanticFacetSelection, highImportance: boolean): H[] {
  return hits.filter(
    (hit) =>
      SEMANTIC_FACET_FIELDS.every((f) => selection[f].size === 0 || (hit[f] !== undefined && selection[f].has(hit[f] as string))) &&
      (!highImportance || (hit.importance ?? 0) >= HIGH_IMPORTANCE),
  );
}

export function toggleInSet(set: ReadonlySet<string>, value: string): Set<string> {
  const next = new Set(set);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  return next;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Splits text around the words of the query so matches can be marked. Words shorter than 2 letters are ignored. */
export function highlightParts(text: string, query: string): { text: string; match: boolean }[] {
  const words = [...new Set(query.split(/[\s,،.;:!?؟"'()]+/).filter((w) => w.length >= 2))].sort((a, b) => b.length - a.length);
  if (!words.length || !text) return [{ text, match: false }];
  const re = new RegExp(`(${words.map(escapeRe).join("|")})`, "giu");
  return text
    .split(re)
    .map((p, i) => ({ text: p, match: i % 2 === 1 }))
    .filter((p) => p.text !== "");
}
