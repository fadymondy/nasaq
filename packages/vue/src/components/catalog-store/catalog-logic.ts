/*
 * Catalog store logic. Pure: filtering, sorting and counting for a store of installable things
 * (workflow steps, plugins, apps), testable under node.
 */

export type CatalogSort = "popular" | "newest" | "name";

export interface CatalogRow {
  id: string;
  name: string;
  summary: string;
  description?: string;
  category: string;
  publisher?: string;
  tags?: string[];
  installs?: number;
  updatedAt?: Date | number | string;
}

/** Search folding: case, accents, Arabic diacritics and the common letter variants are ignored. */
export function foldSearch(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export interface CatalogFilter {
  query?: string;
  /** A category id; `"all"` or empty means every category. */
  category?: string;
  installedOnly?: boolean;
}

export function filterCatalog<T extends CatalogRow>(items: T[], { query = "", category = "all", installedOnly = false }: CatalogFilter, isInstalled: (item: T) => boolean = () => false): T[] {
  const q = foldSearch(query.trim());
  return items.filter((item) => {
    if (category && category !== "all" && item.category !== category) return false;
    if (installedOnly && !isInstalled(item)) return false;
    if (!q) return true;
    return foldSearch([item.name, item.summary, item.description ?? "", item.publisher ?? "", ...(item.tags ?? [])].join(" ")).includes(q);
  });
}

const time = (v: Date | number | string | undefined) => (v === undefined ? 0 : new Date(v).getTime());

export function sortCatalog<T extends CatalogRow>(items: T[], sort: CatalogSort, locale = "en"): T[] {
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, locale);
  const out = [...items];
  if (sort === "name") return out.sort(byName);
  if (sort === "newest") return out.sort((a, b) => time(b.updatedAt) - time(a.updatedAt) || byName(a, b));
  return out.sort((a, b) => (b.installs ?? 0) - (a.installs ?? 0) || byName(a, b));
}

/** How many items each category holds (after the search, before the category filter), plus the total under "all". */
export function categoryCounts<T extends CatalogRow>(items: T[], query = "", installedOnly = false, isInstalled: (item: T) => boolean = () => false): Map<string, number> {
  const matching = filterCatalog(items, { query, installedOnly }, isInstalled);
  const counts = new Map<string, number>([["all", matching.length]]);
  for (const item of matching) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  return counts;
}
