/*
 * Pure catalog listing logic: filtering, sorting, disjunctive facet counts, chips, pagination, compare rows.
 * No React. Money is integer minor units, as in lib/commerce.ts.
 *
 * Filters are evaluated per variant where they can differ between variants (option values, stock, sale, price), so
 * "Red + size L + in stock" only matches a product that has a red L variant in stock.
 * Facet counts are disjunctive: the count of a value is "how many products would match if this value were the
 * only one selected in its own group, keeping every other filter".
 */
import {
  COMMERCE_EMPTY_LISTING_FILTERS,
  COMMERCE_LISTING_SORTS,
  type CommerceCategoryFacet,
  type CommerceCategoryNode,
  type CommerceFacetValue,
  type CommerceFacets,
  type CommerceListingFilters,
  type CommerceListingSort,
  type CommerceOptionFacet,
  type CommerceProduct,
  type CommerceVariant,
  commerceDiscountPercent,
  commerceInStock,
} from "../../lib/commerce";

/* The filter, sort and facet shapes live in the shared model (lib/commerce.ts) so a catalogue API can share them. */
export type ListingSort = CommerceListingSort;
export const LISTING_SORTS = COMMERCE_LISTING_SORTS;
export type ListingCategoryNode = CommerceCategoryNode;
export type ListingFilters = CommerceListingFilters;
export const EMPTY_LISTING_FILTERS = COMMERCE_EMPTY_LISTING_FILTERS;

export type ListingDimension = "query" | "category" | "brand" | "price" | "rating" | "stock" | "sale" | `option:${string}`;

/* ------------------------------------------------------------------ text */

/** Lower-case, strip accents, Arabic diacritics and tatweel, and fold alef, ya and ta-marbuta variants. */
export function listingNormalize(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[آأإ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

const tokens = (text: string) => listingNormalize(text).split(/[\s,.;:/\\|-]+/).filter(Boolean);

function haystack(product: CommerceProduct): string {
  return listingNormalize([product.name, product.brand, product.category, product.description, ...(product.tags ?? []), ...product.variants.map((v) => v.sku)].filter(Boolean).join(" "));
}

/**
 * Relevance of a product to a query: 0 when any token is missing. Name matches outrank brand, category and
 * description matches; a name that starts with a token scores highest.
 */
export function listingSearchScore(product: CommerceProduct, query: string): number {
  const words = tokens(query);
  if (!words.length) return 1;
  const all = haystack(product);
  const name = listingNormalize(product.name);
  const brand = listingNormalize(product.brand ?? "");
  const category = listingNormalize(product.category ?? "");
  let score = 0;
  for (const word of words) {
    if (!all.includes(word)) return 0;
    if (name.startsWith(word)) score += 12;
    else if (name.split(/\s+/).some((n) => n.startsWith(word))) score += 8;
    else if (name.includes(word)) score += 5;
    if (brand.includes(word)) score += 3;
    if (category.includes(word)) score += 2;
    score += 1;
  }
  return score;
}

/* ------------------------------------------------------------------ product facts */

export function listingMinPrice(product: CommerceProduct): number {
  return product.variants.length ? Math.min(...product.variants.map((v) => v.price)) : 0;
}

/** The variant with the lowest price (first one wins ties), used for "from" pricing and the discount badge. */
export function listingCheapestVariant(product: CommerceProduct): CommerceVariant | undefined {
  return product.variants.reduce<CommerceVariant | undefined>((best, v) => (!best || v.price < best.price ? v : best), undefined);
}

export function listingOnSale(variant: CommerceVariant): boolean {
  return variant.compareAt !== undefined && variant.compareAt > variant.price;
}

export function listingProductOnSale(product: CommerceProduct): boolean {
  return product.variants.some(listingOnSale);
}

export function listingProductInStock(product: CommerceProduct): boolean {
  return product.variants.some((v) => commerceInStock(v));
}

/** Biggest integer percentage off across variants, rounded down. */
export function listingBestDiscount(product: CommerceProduct): number {
  return product.variants.reduce((best, v) => Math.max(best, commerceDiscountPercent(v.price, v.compareAt)), 0);
}

/** True when variants differ in price, so cards show "from ...". */
export function listingHasPriceRange(product: CommerceProduct): boolean {
  return new Set(product.variants.map((v) => v.price)).size > 1;
}

/** Lowest and highest variant price across the given products (for the slider bounds). */
export function listingPriceBounds(products: readonly CommerceProduct[]): { min: number; max: number } {
  let min = Infinity;
  let max = -Infinity;
  for (const p of products)
    for (const v of p.variants) {
      if (v.price < min) min = v.price;
      if (v.price > max) max = v.price;
    }
  return min === Infinity ? { min: 0, max: 0 } : { min, max };
}

/* ------------------------------------------------------------------ category tree */

/** `id` and every node below it. Empty when `id` is not in the tree. */
export function listingDescendantIds(tree: readonly ListingCategoryNode[], id: string): Set<string> {
  const out = new Set<string>();
  const collect = (node: ListingCategoryNode) => {
    out.add(node.id);
    (node.children ?? []).forEach(collect);
  };
  const find = (nodes: readonly ListingCategoryNode[]): boolean => {
    for (const node of nodes) {
      if (node.id === id) {
        collect(node);
        return true;
      }
      if (find(node.children ?? [])) return true;
    }
    return false;
  };
  find(tree);
  return out;
}

/** Ids from the root to `id`, inclusive; empty when `id` is not in the tree. */
export function listingCategoryPath(tree: readonly ListingCategoryNode[], id: string): string[] {
  for (const node of tree) {
    if (node.id === id) return [node.id];
    const inner = listingCategoryPath(node.children ?? [], id);
    if (inner.length) return [node.id, ...inner];
  }
  return [];
}

/* ------------------------------------------------------------------ matching */

interface MatchContext {
  tree: readonly ListingCategoryNode[];
}

function variantMatches(v: CommerceVariant, f: ListingFilters, skip: ListingDimension | null): boolean {
  for (const [optionId, values] of Object.entries(f.options)) {
    if (!values.length || skip === `option:${optionId}`) continue;
    if (!values.includes(v.options[optionId] as string)) return false;
  }
  if (f.inStock && skip !== "stock" && !commerceInStock(v)) return false;
  if (f.onSale && skip !== "sale" && !listingOnSale(v)) return false;
  if (f.price && skip !== "price" && (v.price < f.price[0] || v.price > f.price[1])) return false;
  return true;
}

function hasVariantConstraint(f: ListingFilters, skip: ListingDimension | null): boolean {
  return (
    Object.entries(f.options).some(([id, values]) => values.length > 0 && skip !== `option:${id}`) ||
    (f.inStock && skip !== "stock") ||
    (f.onSale && skip !== "sale") ||
    (f.price !== null && skip !== "price")
  );
}

/** Whether a product passes every filter, optionally ignoring one dimension. */
export function listingMatches(product: CommerceProduct, f: ListingFilters, ctx: MatchContext = { tree: [] }, skip: ListingDimension | null = null): boolean {
  if (skip !== "query" && f.query.trim() && listingSearchScore(product, f.query) === 0) return false;
  if (skip !== "category" && f.category) {
    const ids = ctx.tree.length ? listingDescendantIds(ctx.tree, f.category) : new Set([f.category]);
    if (!ids.has(product.category ?? "")) return false;
  }
  if (skip !== "brand" && f.brands.length && !f.brands.includes(product.brand ?? "")) return false;
  if (skip !== "rating" && f.minRating !== null && (product.rating?.average ?? 0) < f.minRating) return false;
  if (product.variants.length === 0) return !hasVariantConstraint(f, skip);
  return product.variants.some((v) => variantMatches(v, f, skip));
}

export function listingFilter(products: readonly CommerceProduct[], f: ListingFilters, ctx: MatchContext = { tree: [] }): CommerceProduct[] {
  return products.filter((p) => listingMatches(p, f, ctx));
}

/* ------------------------------------------------------------------ sorting */

/** Stable sort. "relevance" ranks by query score when there is a query and keeps catalog order otherwise. */
export function listingSort(products: readonly CommerceProduct[], sort: ListingSort, query = "", locale = "en"): CommerceProduct[] {
  const indexed = products.map((product, index) => ({ product, index }));
  const rating = (p: CommerceProduct) => p.rating?.average ?? 0;
  const by: Record<ListingSort, (a: CommerceProduct, b: CommerceProduct) => number> = {
    relevance: (a, b) => (query.trim() ? listingSearchScore(b, query) - listingSearchScore(a, query) : 0),
    popular: (a, b) => (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
    rating: (a, b) => rating(b) - rating(a) || (b.rating?.count ?? 0) - (a.rating?.count ?? 0),
    "price-asc": (a, b) => listingMinPrice(a) - listingMinPrice(b),
    "price-desc": (a, b) => listingMinPrice(b) - listingMinPrice(a),
    discount: (a, b) => listingBestDiscount(b) - listingBestDiscount(a),
    name: (a, b) => a.name.localeCompare(b.name, locale),
  };
  return indexed.sort((x, y) => by[sort](x.product, y.product) || x.index - y.index).map((x) => x.product);
}

/* ------------------------------------------------------------------ facets */

export type ListingFacetValue = CommerceFacetValue;
export type ListingCategoryFacet = CommerceCategoryFacet;
export type ListingOptionFacet = CommerceOptionFacet;
export type ListingFacets = CommerceFacets;

export interface ListingLabelIndex {
  categories: Map<string, string>;
  options: Map<string, { name: string; display: ListingOptionFacet["display"]; values: Map<string, { label: string; color?: string; image?: string }> }>;
}

/** Labels of every option and value across the catalogue (first product wins), for chips and facets. */
export function listingLabelIndex(products: readonly CommerceProduct[], tree: readonly ListingCategoryNode[] = []): ListingLabelIndex {
  const categories = new Map<string, string>();
  const walk = (nodes: readonly ListingCategoryNode[]) =>
    nodes.forEach((n) => {
      categories.set(n.id, n.label);
      walk(n.children ?? []);
    });
  walk(tree);
  for (const p of products) if (p.category && !categories.has(p.category)) categories.set(p.category, p.category);
  const options: ListingLabelIndex["options"] = new Map();
  for (const p of products)
    for (const o of p.options) {
      let entry = options.get(o.id);
      if (!entry) options.set(o.id, (entry = { name: o.name, display: o.display ?? "button", values: new Map() }));
      for (const v of o.values)
        if (!entry.values.has(v.id)) entry.values.set(v.id, { label: v.label, ...(v.color ? { color: v.color } : {}), ...(v.image ? { image: v.image } : {}) });
    }
  return { categories, options };
}

const count = (products: readonly CommerceProduct[], f: ListingFilters, ctx: MatchContext) => products.filter((p) => listingMatches(p, f, ctx)).length;

/** Disjunctive facet counts for the current filters. */
export function listingFacets(
  products: readonly CommerceProduct[],
  f: ListingFilters,
  tree: readonly ListingCategoryNode[] = [],
  index: ListingLabelIndex = listingLabelIndex(products, tree),
): ListingFacets {
  const ctx = { tree };

  const categoryCount = (id: string) => count(products, { ...f, category: id }, ctx);
  const path = f.category ? listingCategoryPath(tree, f.category) : [];
  const cat = (node: ListingCategoryNode): ListingCategoryFacet => ({
    id: node.id,
    label: node.label,
    count: categoryCount(node.id),
    selected: f.category === node.id,
    open: path.includes(node.id),
    children: (node.children ?? []).map(cat),
  });
  let categories: ListingCategoryFacet[];
  if (tree.length) categories = tree.map(cat);
  else {
    const ids = [...new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))];
    categories = ids.map((id) => ({ id, label: index.categories.get(id) ?? id, count: categoryCount(id), selected: f.category === id, open: f.category === id, children: [] }));
  }

  const brandIds = [...new Set(products.map((p) => p.brand).filter((b): b is string => Boolean(b)))];
  const brands = brandIds
    .map((id): ListingFacetValue => ({ id, label: id, count: count(products, { ...f, brands: [id] }, ctx), selected: f.brands.includes(id) }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  const options = [...index.options.entries()].map(
    ([id, meta]): ListingOptionFacet => ({
      id,
      name: meta.name,
      display: meta.display,
      values: [...meta.values.entries()].map(([valueId, v]) => ({
        id: valueId,
        label: v.label,
        count: count(products, { ...f, options: { ...f.options, [id]: [valueId] } }, ctx),
        selected: (f.options[id] ?? []).includes(valueId),
        ...(v.color ? { color: v.color } : {}),
        ...(v.image ? { image: v.image } : {}),
      })),
    }),
  );

  const ratings = [4, 3, 2, 1].map((min) => ({ min, count: count(products, { ...f, minRating: min }, ctx), selected: f.minRating === min }));

  return {
    categories,
    brands,
    options,
    ratings,
    inStock: count(products, { ...f, inStock: true }, ctx),
    onSale: count(products, { ...f, onSale: true }, ctx),
    price: listingPriceBounds(products),
  };
}

/* ------------------------------------------------------------------ filter edits and chips */

export type ListingChip =
  | { id: string; kind: "query"; value: string }
  | { id: string; kind: "category"; value: string }
  | { id: string; kind: "brand"; value: string }
  | { id: string; kind: "option"; optionId: string; value: string }
  | { id: string; kind: "price"; value: [number, number] }
  | { id: string; kind: "rating"; value: number }
  | { id: string; kind: "stock" }
  | { id: string; kind: "sale" };

/** One chip per applied value, in a stable order (query, category, brands, options, price, rating, stock, sale). */
export function listingActiveChips(f: ListingFilters): ListingChip[] {
  const chips: ListingChip[] = [];
  if (f.query.trim()) chips.push({ id: "query", kind: "query", value: f.query.trim() });
  if (f.category) chips.push({ id: `category:${f.category}`, kind: "category", value: f.category });
  for (const b of f.brands) chips.push({ id: `brand:${b}`, kind: "brand", value: b });
  for (const [optionId, values] of Object.entries(f.options)) for (const v of values) chips.push({ id: `option:${optionId}:${v}`, kind: "option", optionId, value: v });
  if (f.price) chips.push({ id: "price", kind: "price", value: f.price });
  if (f.minRating !== null) chips.push({ id: "rating", kind: "rating", value: f.minRating });
  if (f.inStock) chips.push({ id: "stock", kind: "stock" });
  if (f.onSale) chips.push({ id: "sale", kind: "sale" });
  return chips;
}

export function listingRemoveChip(f: ListingFilters, chip: ListingChip): ListingFilters {
  switch (chip.kind) {
    case "query":
      return { ...f, query: "" };
    case "category":
      return { ...f, category: null };
    case "brand":
      return { ...f, brands: f.brands.filter((b) => b !== chip.value) };
    case "option": {
      const rest = (f.options[chip.optionId] ?? []).filter((v) => v !== chip.value);
      const options = { ...f.options };
      if (rest.length) options[chip.optionId] = rest;
      else delete options[chip.optionId];
      return { ...f, options };
    }
    case "price":
      return { ...f, price: null };
    case "rating":
      return { ...f, minRating: null };
    case "stock":
      return { ...f, inStock: false };
    case "sale":
      return { ...f, onSale: false };
  }
}

/** Clears every filter; keeps the search text unless `keepQuery` is false. */
export function listingClear(f: ListingFilters, keepQuery = true): ListingFilters {
  return { ...EMPTY_LISTING_FILTERS, query: keepQuery ? f.query : "" };
}

/** Number of applied filters (everything except the search text). */
export function listingFilterCount(f: ListingFilters): number {
  return listingActiveChips(f).filter((c) => c.kind !== "query").length;
}

export function listingToggleValue(list: readonly string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function listingToggleOption(f: ListingFilters, optionId: string, valueId: string): ListingFilters {
  const next = listingToggleValue(f.options[optionId] ?? [], valueId);
  const options = { ...f.options };
  if (next.length) options[optionId] = next;
  else delete options[optionId];
  return { ...f, options };
}

function normalizeFilters(f: ListingFilters) {
  return {
    ...f,
    brands: [...f.brands].sort(),
    options: Object.fromEntries(
      Object.entries(f.options)
        .filter(([, v]) => v.length)
        .map(([k, v]) => [k, [...v].sort()] as const)
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  };
}

export function listingFiltersEqual(a: ListingFilters, b: ListingFilters): boolean {
  return JSON.stringify(normalizeFilters(a)) === JSON.stringify(normalizeFilters(b));
}

/** Which single filters, if dropped, would bring results back; for the empty-results screen. */
export function listingRelaxations(products: readonly CommerceProduct[], f: ListingFilters, tree: readonly ListingCategoryNode[] = []): { chip: ListingChip; count: number }[] {
  const ctx = { tree };
  return listingActiveChips(f)
    .map((chip) => ({ chip, count: count(products, listingRemoveChip(f, chip), ctx) }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

/* ------------------------------------------------------------------ paging */

export interface ListingPage {
  page: number;
  pageCount: number;
  total: number;
  /** 1-based, inclusive; 0 when empty. */
  from: number;
  to: number;
  start: number;
  end: number;
}

export function listingPage(total: number, page: number, pageSize: number): ListingPage {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const pageCount = Math.max(1, Math.ceil(total / size));
  const current = Math.min(Math.max(Math.floor(page) || 1, 1), pageCount);
  const start = (current - 1) * size;
  const end = Math.min(start + size, total);
  return { page: current, pageCount, total, from: total ? start + 1 : 0, to: end, start, end };
}

/** How many items a "load more" list shows: `pageSize` per press, capped at the total. */
export function listingVisibleCount(total: number, pageSize: number, presses: number): number {
  return Math.min(total, Math.max(1, pageSize) * (Math.max(0, presses) + 1));
}

/* ------------------------------------------------------------------ compare */

export function listingToggleCompare(ids: readonly string[], id: string, max = 4): { ids: string[]; rejected: boolean } {
  if (ids.includes(id)) return { ids: ids.filter((x) => x !== id), rejected: false };
  if (ids.length >= max) return { ids: [...ids], rejected: true };
  return { ids: [...ids, id], rejected: false };
}

export type ListingCompareRowKind = "price" | "brand" | "category" | "rating" | "availability" | "description" | "option";

export interface ListingCompareRow {
  id: string;
  kind: ListingCompareRowKind;
  /** Option name for `option` rows. */
  label?: string;
  /** One cell per product. price: min price; rating: average; availability: boolean; others text or null. */
  cells: (string | number | boolean | null)[];
  /** The products differ on this row. */
  differs: boolean;
}

export function listingCompareRows(products: readonly CommerceProduct[]): ListingCompareRow[] {
  const row = (id: string, kind: ListingCompareRowKind, cells: ListingCompareRow["cells"], label?: string): ListingCompareRow => ({
    id,
    kind,
    cells,
    differs: new Set(cells.map((c) => String(c))).size > 1,
    ...(label ? { label } : {}),
  });
  const rows: ListingCompareRow[] = [
    row("price", "price", products.map(listingMinPrice)),
    row("brand", "brand", products.map((p) => p.brand ?? null)),
    row("category", "category", products.map((p) => p.category ?? null)),
    row("rating", "rating", products.map((p) => p.rating?.average ?? null)),
    row("availability", "availability", products.map(listingProductInStock)),
  ];
  const optionIds: string[] = [];
  for (const p of products) for (const o of p.options) if (!optionIds.includes(o.id)) optionIds.push(o.id);
  for (const id of optionIds) {
    const name = products.flatMap((p) => p.options).find((o) => o.id === id)?.name ?? id;
    rows.push(row(`option:${id}`, "option", products.map((p) => p.options.find((o) => o.id === id)?.values.map((v) => v.label).join(", ") ?? null), name));
  }
  rows.push(row("description", "description", products.map((p) => p.description ?? null)));
  return rows;
}

/** Keeps only the rows where the products differ (all rows when there are fewer than two products). */
export function listingCompareDifferences(rows: readonly ListingCompareRow[], products: number): ListingCompareRow[] {
  return products < 2 ? [...rows] : rows.filter((r) => r.differs);
}

/** Minor units to major units for display with `Intl` or `Price`. `digits` is the currency's minor-unit exponent. */
export function listingToMajor(amount: number, digits: number): number {
  return amount / 10 ** digits;
}

export function listingToMinor(amount: number, digits: number): number {
  return Math.round(amount * 10 ** digits);
}
