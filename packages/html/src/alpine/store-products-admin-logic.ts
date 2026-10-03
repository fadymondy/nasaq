// Pure logic of the store products admin. Copy of the React and Vue modules (product-admin-logic.ts); kept in sync by hand.
// Includes the commerce types it uses (packages/web/src/lib/commerce.ts) so the module has no cross-package import.
export type CommerceMoney = number;

export interface CommerceImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  /** Video poster or 3D preview; the gallery shows a play badge. */
  kind?: "image" | "video";
}

/** An option axis such as Colour or Size, with its values in display order. */
export interface CommerceOption {
  id: string;
  name: string;
  /** "swatch" draws a colour chip (value.color must be a token or CSS colour from data), "image" a thumbnail. */
  display?: "button" | "swatch" | "image" | "select";
  values: { id: string; label: string; color?: string; image?: string }[];
}

export interface CommerceVariant {
  id: string;
  sku?: string;
  /** optionId → valueId */
  options: Record<string, string>;
  price: CommerceMoney;
  compareAt?: CommerceMoney;
  /** undefined = not tracked (always in stock). */
  stock?: number;
  allowBackorder?: boolean;
  image?: string;
  weightGrams?: number;
}

export interface CommerceProduct {
  id: string;
  slug?: string;
  name: string;
  brand?: string;
  category?: string;
  description?: string;
  images: CommerceImage[];
  options: CommerceOption[];
  variants: CommerceVariant[];
  rating?: { average: number; count: number };
  badges?: string[];
  tags?: string[];
  status?: "active" | "draft" | "archived";
  /** Merchant-only fields, edited in the product admin. Never render `cost` on the storefront. */
  /** Cost per item, minor units. */
  cost?: CommerceMoney;
  /** "hidden" keeps an active product out of listings and search while its page still opens by link. Default "visible". */
  visibility?: CommerceProductVisibility;
  seoTitle?: string;
  seoDescription?: string;
}

export type CommerceProductVisibility = "visible" | "hidden";
import type { RuleCondition, RuleGroup } from "./rule-builder-logic";

/* ------------------------------------------------------------------ small helpers */

/** Integer `amount * bps / 10000`, rounding half up. */
export function bpsOf(amount: number, bps: number): number {
  return Math.floor((amount * bps + 5000) / 10000);
}

/** A lower-case slug that keeps letters and digits of any script (Arabic stays Arabic). */
export function slugify(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
}

/** Moves one item and returns a new list. Out-of-range targets clamp. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from < 0 || from >= list.length) return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item as T);
  return next;
}

/* ------------------------------------------------------------------ options */

export const MAX_OPTIONS = 3;
export const MAX_VARIANTS = 100;

/**
 * Turns the labels typed for an option back into values. A label that already exists keeps its id (so variants keep
 * their data when neighbours change); a new label gets a fresh id. Blank and duplicate labels are dropped.
 */
export function optionValuesFromLabels(option: CommerceOption, labels: readonly string[]): CommerceOption["values"] {
  const byLabel = new Map(option.values.map((v) => [v.label.trim().toLowerCase(), v]));
  const taken = new Set<string>();
  const out: CommerceOption["values"] = [];
  for (const raw of labels) {
    const label = raw.trim();
    const key = label.toLowerCase();
    if (!label || out.some((v) => v.label.trim().toLowerCase() === key)) continue;
    const existing = byLabel.get(key);
    if (existing) {
      out.push(existing);
      taken.add(existing.id);
      continue;
    }
    const base = slugify(label) || "value";
    let id = base;
    for (let n = 2; taken.has(id) || option.values.some((v) => v.id === id); n += 1) id = `${base}-${n}`;
    taken.add(id);
    out.push({ id, label });
  }
  return out;
}

/** How many variants the options produce (axes with no values are ignored). */
export function variantCount(options: readonly CommerceOption[]): number {
  const axes = options.filter((o) => o.values.length > 0);
  return axes.length === 0 ? 0 : axes.reduce((n, o) => n * o.values.length, 1);
}

/** Every combination of option values, in option order then value order. */
export function optionCombinations(options: readonly CommerceOption[]): Record<string, string>[] {
  const axes = options.filter((o) => o.values.length > 0);
  if (axes.length === 0) return [];
  let combos: Record<string, string>[] = [{}];
  for (const axis of axes) combos = combos.flatMap((base) => axis.values.map((v) => ({ ...base, [axis.id]: v.id })));
  return combos;
}

export interface VariantDefaults {
  price: CommerceMoney;
  compareAt?: CommerceMoney;
  /** undefined = not tracked. */
  stock?: number;
  weightGrams?: number;
}

export interface GenerateVariantsOptions {
  defaults: VariantDefaults;
  /** SKUs for new variants are `${skuBase}-${VALUE-IDS}`. No base, no SKU. */
  skuBase?: string;
  /** Most variants to create. Default 100. */
  limit?: number;
  /** Makes the id of a new variant. Default: `v-` plus the value ids. */
  makeId?: (combo: Record<string, string>) => string;
}

export interface GenerateVariantsResult {
  variants: CommerceVariant[];
  /** Ids of variants that did not exist before. */
  created: string[];
  /** Existing variants that no combination could take over (a value or an option was removed). */
  dropped: CommerceVariant[];
  /** More combinations than `limit`: the extra ones were not created. */
  truncated: boolean;
}

/**
 * Builds the variant matrix for a set of options and keeps what the merchant already typed.
 *
 * An existing variant is carried over to the combination it still describes:
 * - A removed value drops the variants that used it.
 * - A new option axis: existing variants move to the first value of the new axis.
 * - A removed axis: variants that only differed by that axis collapse; the first one wins, the rest are `dropped`.
 * Prices, SKUs, stock and images of kept variants are never touched. Each existing variant is used at most once.
 */
export function generateVariants(options: readonly CommerceOption[], existing: readonly CommerceVariant[], opts: GenerateVariantsOptions): GenerateVariantsResult {
  const axes = options.filter((o) => o.values.length > 0);
  const combos = optionCombinations(options);
  const limit = opts.limit ?? MAX_VARIANTS;
  const truncated = combos.length > limit;
  const used = new Set<string>();
  const variants: CommerceVariant[] = [];
  const created = new Set<string>();
  const ids = new Set<string>();

  const takeExisting = (combo: Record<string, string>): CommerceVariant | undefined =>
    existing.find((v) => {
      if (used.has(v.id)) return false;
      return axes.every((axis) => {
        const has = v.options[axis.id];
        return has === undefined ? combo[axis.id] === axis.values[0]?.id : has === combo[axis.id];
      });
    });

  const carried = new Map<Record<string, string>, CommerceVariant>();
  for (const combo of combos.slice(0, limit)) {
    const found = takeExisting(combo);
    if (found) {
      used.add(found.id);
      carried.set(combo, found);
    }
  }

  for (const v of carried.values()) ids.add(v.id);

  for (const combo of combos.slice(0, limit)) {
    const found = carried.get(combo);
    if (found) {
      variants.push({ ...found, options: combo });
      continue;
    }
    const base = opts.makeId ? opts.makeId(combo) : `v-${axes.map((a) => combo[a.id]).join("-")}`;
    let id = base;
    for (let n = 2; ids.has(id); n += 1) id = `${base}-${n}`;
    ids.add(id);
    const v: CommerceVariant = { id, options: combo, price: opts.defaults.price };
    if (opts.skuBase) v.sku = `${opts.skuBase}-${axes.map((a) => (slugify(combo[a.id] ?? "") || "X").toUpperCase()).join("-")}`;
    if (opts.defaults.compareAt !== undefined) v.compareAt = opts.defaults.compareAt;
    if (opts.defaults.stock !== undefined) v.stock = opts.defaults.stock;
    if (opts.defaults.weightGrams !== undefined) v.weightGrams = opts.defaults.weightGrams;
    variants.push(v);
    created.add(id);
  }
  return { variants, created: [...created], dropped: existing.filter((v) => !used.has(v.id)), truncated };
}

/** "Red / M" from the option values of a variant. */
export function variantLabel(options: readonly CommerceOption[], variant: Pick<CommerceVariant, "options">): string {
  return options
    .map((o) => o.values.find((v) => v.id === variant.options[o.id])?.label)
    .filter(Boolean)
    .join(" / ");
}

/* ------------------------------------------------------------------ bulk fill */

export interface VariantPatch {
  price?: CommerceMoney;
  /** `null` clears compare-at. */
  compareAt?: CommerceMoney | null;
  /** Sets stock. `null` stops tracking. */
  stock?: number | null;
  /** Adds to tracked stock (negative removes). Never below 0. Untracked variants are left alone. */
  stockDelta?: number;
  /** SKUs become `${prefix}-${1..n}` in row order. */
  skuPrefix?: string;
  weightGrams?: number | null;
  image?: string | null;
}

/** Applies one patch to the chosen variants and returns the whole list. The others come back untouched. */
export function bulkFillVariants(variants: readonly CommerceVariant[], ids: ReadonlySet<string> | readonly string[], patch: VariantPatch): CommerceVariant[] {
  const chosen = new Set(ids);
  let n = 0;
  return variants.map((v) => {
    if (!chosen.has(v.id)) return v;
    n += 1;
    const next: CommerceVariant = { ...v };
    if (patch.price !== undefined) next.price = Math.max(0, Math.round(patch.price));
    if (patch.compareAt !== undefined) {
      if (patch.compareAt === null) delete next.compareAt;
      else next.compareAt = Math.max(0, Math.round(patch.compareAt));
    }
    if (patch.stock !== undefined) {
      if (patch.stock === null) delete next.stock;
      else next.stock = Math.max(0, Math.floor(patch.stock));
    }
    if (patch.stockDelta !== undefined && next.stock !== undefined) next.stock = Math.max(0, next.stock + Math.trunc(patch.stockDelta));
    if (patch.skuPrefix !== undefined && patch.skuPrefix.trim()) next.sku = `${patch.skuPrefix.trim()}-${n}`;
    if (patch.weightGrams !== undefined) {
      if (patch.weightGrams === null) delete next.weightGrams;
      else next.weightGrams = Math.max(0, Math.round(patch.weightGrams));
    }
    if (patch.image !== undefined) {
      if (patch.image === null) delete next.image;
      else next.image = patch.image;
    }
    return next;
  });
}

/** SKUs used more than once (case-insensitive), upper-cased. Blank SKUs are ignored. */
export function duplicateSkus(variants: readonly Pick<CommerceVariant, "sku">[]): string[] {
  const seen = new Map<string, number>();
  for (const v of variants) {
    const key = v.sku?.trim().toUpperCase();
    if (key) seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([sku]) => sku);
}

/* ------------------------------------------------------------------ margin */

export interface Margin {
  /** price - cost, in minor units. */
  profit: number;
  /** profit / price in basis points, rounded half up. */
  marginBps: number;
  /** profit / cost in basis points, or null when the cost is 0. */
  markupBps: number | null;
}

/** Margin of a price over its cost. Null when the price is 0 or a value is missing. */
export function marginFromCost(price: number | null | undefined, cost: number | null | undefined): Margin | null {
  if (price === null || price === undefined || cost === null || cost === undefined || price <= 0) return null;
  const profit = price - cost;
  const half = (d: number) => Math.floor(d / 2);
  return {
    profit,
    marginBps: Math.floor((profit * 10000 + half(price)) / price),
    markupBps: cost > 0 ? Math.floor((profit * 10000 + half(cost)) / cost) : null,
  };
}

/** The price that gives a target margin over a cost, rounded half up. Null when the margin is 100% or more. */
export function priceForMargin(cost: number, marginBps: number): number | null {
  if (marginBps >= 10000 || marginBps < 0 || cost < 0) return null;
  const keep = 10000 - marginBps;
  return Math.floor((cost * 10000 + Math.floor(keep / 2)) / keep);
}

/* ------------------------------------------------------------------ stock and price summaries */

export type StockLevel = "untracked" | "out" | "low" | "in";

/** Total tracked stock and the level for a list row. One untracked variant makes the product always available. */
export function stockSummary(variants: readonly CommerceVariant[], lowAt = 5): { total: number; level: StockLevel; outVariants: number } {
  if (variants.length === 0) return { total: 0, level: "untracked", outVariants: 0 };
  const tracked = variants.filter((v) => v.stock !== undefined);
  const total = tracked.reduce((s, v) => s + (v.stock ?? 0), 0);
  const outVariants = tracked.filter((v) => (v.stock ?? 0) <= 0 && !v.allowBackorder).length;
  if (tracked.length < variants.length) return { total, level: "untracked", outVariants };
  return { total, level: total <= 0 ? "out" : total <= lowAt ? "low" : "in", outVariants };
}

/* ------------------------------------------------------------------ bulk edit of products */

export type BulkPriceMode = "set" | "increase-percent" | "decrease-percent" | "increase-amount" | "decrease-amount";
export type BulkStockMode = "set" | "add" | "remove";

export interface BulkPriceRule {
  mode: BulkPriceMode;
  /** Minor units for set and amount modes, basis points for percent modes. */
  value: number;
  /** Move compare-at by the same rule (kept above the new price). */
  compareAt?: boolean;
}

export interface ProductBulkEdit {
  price?: BulkPriceRule;
  stock?: { mode: BulkStockMode; value: number };
  status?: NonNullable<CommerceProduct["status"]>;
}

/** The price after one bulk rule. Never below 0; percent modes round half up. */
export function bulkPrice(price: number, rule: Pick<BulkPriceRule, "mode" | "value">): number {
  switch (rule.mode) {
    case "set":
      return Math.max(0, Math.round(rule.value));
    case "increase-percent":
      return price + bpsOf(price, rule.value);
    case "decrease-percent":
      return Math.max(0, price - bpsOf(price, rule.value));
    case "increase-amount":
      return price + Math.round(rule.value);
    case "decrease-amount":
      return Math.max(0, price - Math.round(rule.value));
  }
}

/** Applies a bulk edit to the chosen products. Add and remove leave untracked variants alone. */
export function bulkEditProducts<P extends CommerceProduct>(products: readonly P[], ids: ReadonlySet<string> | readonly string[], edit: ProductBulkEdit): P[] {
  const chosen = new Set(ids);
  return products.map((p) => {
    if (!chosen.has(p.id)) return p;
    const variants = p.variants.map((v) => {
      const next: CommerceVariant = { ...v };
      if (edit.price) {
        next.price = bulkPrice(v.price, edit.price);
        if (edit.price.compareAt && v.compareAt !== undefined) next.compareAt = Math.max(bulkPrice(v.compareAt, edit.price), next.price + 1);
      }
      if (edit.stock) {
        const { mode, value } = edit.stock;
        if (mode === "set") next.stock = Math.max(0, Math.floor(value));
        else if (v.stock !== undefined) next.stock = Math.max(0, v.stock + (mode === "add" ? 1 : -1) * Math.floor(value));
      }
      return next;
    });
    return { ...p, variants, ...(edit.status ? { status: edit.status } : {}) };
  });
}

/* ------------------------------------------------------------------ collections */

export type CollectionKind = "manual" | "rules";

export interface CollectionDef {
  id: string;
  title: string;
  kind: CollectionKind;
  /** Manual: product ids in display order. */
  productIds?: string[];
  /** Rules: the condition tree from `RuleBuilder`. */
  conditions?: RuleGroup;
}

/** The fields a collection rule can test. */
export const COLLECTION_FIELDS = ["tag", "brand", "category", "title", "price", "stock", "onSale", "status"] as const;
export type CollectionField = (typeof COLLECTION_FIELDS)[number];

interface Facts {
  tag: string[];
  brand: string[];
  category: string[];
  title: string[];
  status: string[];
  onSale: string[];
  price: number;
  stock: number | undefined;
}

function factsOf(product: CommerceProduct): Facts {
  const prices = product.variants.map((v) => v.price);
  const stock = stockSummary(product.variants);
  return {
    tag: product.tags ?? [],
    brand: product.brand ? [product.brand] : [],
    category: product.category ? [product.category] : [],
    title: [product.name],
    status: [product.status ?? "active"],
    onSale: [product.variants.some((v) => v.compareAt !== undefined && v.compareAt > v.price) ? "true" : "false"],
    price: prices.length ? Math.min(...prices) : 0,
    stock: stock.level === "untracked" ? undefined : stock.total,
  };
}

/** "12.5" and "12,5" to minor units with integer maths ("12.5", 100 gives 1250). Null when not a number. */
export function decimalToMinor(text: string, minorPerMajor: number): number | null {
  const clean = text.trim().replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(clean)) return null;
  const negative = clean.startsWith("-");
  const [whole = "0", frac = ""] = clean.replace("-", "").split(".");
  const digits = String(minorPerMajor).length - 1;
  const padded = (frac + "0".repeat(digits)).slice(0, digits);
  const roundUp = frac.length > digits && Number(frac[digits]) >= 5 ? 1 : 0;
  const minor = Number(whole) * minorPerMajor + (digits ? Number(padded) : 0) + roundUp;
  return negative ? -minor : minor;
}

function testCondition(c: RuleCondition, facts: Facts, minorPerMajor: number): boolean {
  const field = c.field as CollectionField;
  if (field === "price" || field === "stock") {
    const have = field === "price" ? facts.price : facts.stock;
    if (c.op === "isEmpty") return have === undefined;
    if (c.op === "isNotEmpty") return have !== undefined;
    const want = field === "price" ? decimalToMinor(c.value, minorPerMajor) : /^-?\d+$/.test(c.value.trim()) ? Number(c.value) : null;
    if (have === undefined || want === null) return c.op === "isNot";
    switch (c.op) {
      case "is": return have === want;
      case "isNot": return have !== want;
      case "gt": return have > want;
      case "gte": return have >= want;
      case "lt": return have < want;
      case "lte": return have <= want;
      default: return false;
    }
  }
  const values = ((facts as unknown as Record<string, string[] | undefined>)[field] ?? []).map((v) => v.trim().toLowerCase());
  const want = c.value.trim().toLowerCase();
  switch (c.op) {
    case "is": return values.some((v) => v === want);
    case "isNot": return values.every((v) => v !== want);
    case "contains": return values.some((v) => v.includes(want));
    case "startsWith": return values.some((v) => v.startsWith(want));
    case "isEmpty": return values.length === 0;
    case "isNotEmpty": return values.length > 0;
    default: return false;
  }
}

function testGroup(g: RuleGroup, facts: Facts, minorPerMajor: number): boolean {
  const results = g.children.map((c) => (c.kind === "group" ? testGroup(c, facts, minorPerMajor) : testCondition(c, facts, minorPerMajor)));
  if (results.length === 0) return false;
  return g.join === "and" ? results.every(Boolean) : results.some(Boolean);
}

export interface MatchOptions {
  /** Minor units in one major unit (100 for USD). Rule prices are typed in major units. Default 100. */
  minorPerMajor?: number;
  /** Also match draft and archived products. Default false: only active products show in a collection. */
  includeInactive?: boolean;
}

/**
 * The products a collection holds. Manual collections keep their own order and skip ids that no longer exist.
 * A rule collection with no conditions matches nothing (an empty rule is a mistake, not "everything").
 */
export function matchCollection<P extends CommerceProduct>(products: readonly P[], collection: Pick<CollectionDef, "kind" | "productIds" | "conditions">, options: MatchOptions = {}): P[] {
  const visible = (p: P) => options.includeInactive || (p.status ?? "active") === "active";
  if (collection.kind === "manual") {
    const byId = new Map(products.map((p) => [p.id, p]));
    return (collection.productIds ?? []).map((id) => byId.get(id)).filter((p): p is P => p !== undefined && visible(p));
  }
  const group = collection.conditions;
  if (!group) return [];
  const minorPerMajor = options.minorPerMajor ?? 100;
  return products.filter((p) => visible(p) && testGroup(group, factsOf(p), minorPerMajor));
}

/** Ids of the collections a product belongs to. */
export function collectionsOfProduct(products: readonly CommerceProduct[], collections: readonly CollectionDef[], productId: string, options: MatchOptions = {}): string[] {
  return collections.filter((c) => matchCollection(products, c, options).some((p) => p.id === productId)).map((c) => c.id);
}

/* ------------------------------------------------------------------ draft checks */

export interface ProductDraftIssue {
  code: "title" | "price" | "compare-at" | "sku-duplicate" | "no-variants" | "too-many-variants" | "slug";
  variantId?: string;
}

/** What blocks saving. Compare-at must be above price and SKUs must be unique. */
export function validateProductDraft(draft: { title: string; price: number | null; compareAt?: number | null; options: readonly CommerceOption[]; variants: readonly CommerceVariant[]; slug?: string }): ProductDraftIssue[] {
  const issues: ProductDraftIssue[] = [];
  if (!draft.title.trim()) issues.push({ code: "title" });
  if (draft.slug !== undefined && draft.slug !== "" && slugify(draft.slug) !== draft.slug) issues.push({ code: "slug" });
  if (draft.options.length === 0) {
    if (draft.price === null || draft.price < 0) issues.push({ code: "price" });
    if (draft.compareAt !== null && draft.compareAt !== undefined && draft.price !== null && draft.compareAt <= draft.price) issues.push({ code: "compare-at" });
    return issues;
  }
  if (draft.variants.length === 0) issues.push({ code: "no-variants" });
  if (variantCount(draft.options) > MAX_VARIANTS) issues.push({ code: "too-many-variants" });
  for (const v of draft.variants) if (v.compareAt !== undefined && v.compareAt <= v.price) issues.push({ code: "compare-at", variantId: v.id });
  const dupes = new Set(duplicateSkus(draft.variants));
  for (const v of draft.variants) if (v.sku && dupes.has(v.sku.trim().toUpperCase())) issues.push({ code: "sku-duplicate", variantId: v.id });
  return issues;
}

/* ------------------------------------------------------------------ draft */

/** Lives in the shared model as `CommerceProductVisibility`. */
export type ProductVisibility = CommerceProductVisibility;

/** What the product editor edits. A product without options keeps its one variant in `variants[0]`. */
export interface ProductDraft {
  id?: string;
  title: string;
  /** HTML from the rich text editor. */
  description: string;
  brand: string;
  category: string;
  tags: string[];
  status: NonNullable<CommerceProduct["status"]>;
  visibility: ProductVisibility;
  images: CommerceImage[];
  options: CommerceOption[];
  variants: CommerceVariant[];
  /** Cost per item, minor units. Only the merchant sees it. */
  cost: number | null;
  slug: string;
  seoTitle: string;
  seoDescription: string;
}

export const DEFAULT_VARIANT_ID = "default";

export function emptyProductDraft(): ProductDraft {
  return { title: "", description: "", brand: "", category: "", tags: [], status: "draft", visibility: "visible", images: [], options: [], variants: [{ id: DEFAULT_VARIANT_ID, options: {}, price: 0 }], cost: null, slug: "", seoTitle: "", seoDescription: "" };
}

/** A draft from a stored product. Cost, visibility and SEO come from `extra` first, then from the product itself (the shared model carries them as optional merchant fields). */
export function productToDraft(product: CommerceProduct, extra: Partial<Pick<ProductDraft, "cost" | "visibility" | "seoTitle" | "seoDescription">> = {}): ProductDraft {
  return {
    id: product.id,
    title: product.name,
    description: product.description ?? "",
    brand: product.brand ?? "",
    category: product.category ?? "",
    tags: [...(product.tags ?? [])],
    status: product.status ?? "active",
    visibility: extra.visibility ?? product.visibility ?? "visible",
    images: product.images.map((i) => ({ ...i })),
    options: product.options.map((o) => ({ ...o, values: o.values.map((v) => ({ ...v })) })),
    variants: product.variants.length ? product.variants.map((v) => ({ ...v, options: { ...v.options } })) : [{ id: DEFAULT_VARIANT_ID, options: {}, price: 0 }],
    cost: extra.cost ?? product.cost ?? null,
    slug: product.slug ?? "",
    seoTitle: extra.seoTitle ?? product.seoTitle ?? "",
    seoDescription: extra.seoDescription ?? product.seoDescription ?? "",
  };
}

/** The product a draft describes. Cost, hidden visibility and SEO text are carried over when set, so a saved product keeps them. */
export function draftToProduct(draft: ProductDraft, id = draft.id ?? "new"): CommerceProduct {
  const p: CommerceProduct = { id, name: draft.title.trim(), images: draft.images, options: draft.options.filter((o) => o.values.length > 0), variants: draft.variants, status: draft.status };
  if (draft.slug) p.slug = draft.slug;
  if (draft.brand.trim()) p.brand = draft.brand.trim();
  if (draft.category.trim()) p.category = draft.category.trim();
  if (draft.description.trim()) p.description = draft.description;
  if (draft.tags.length) p.tags = draft.tags;
  if (draft.cost !== null) p.cost = draft.cost;
  if (draft.visibility !== "visible") p.visibility = draft.visibility;
  if (draft.seoTitle.trim()) p.seoTitle = draft.seoTitle.trim();
  if (draft.seoDescription.trim()) p.seoDescription = draft.seoDescription.trim();
  return p;
}

/** Whether two drafts differ, ignoring key order. */
export function draftChanged(a: ProductDraft, b: ProductDraft): boolean {
  return stable(a) !== stable(b);
}

function stable(v: unknown): string {
  return JSON.stringify(v, (_k, x: unknown) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([p], [q]) => (p < q ? -1 : p > q ? 1 : 0))) : x));
}

/* ------------------------------------------------------------------ native drag (ports only; React uses dnd-kit) */

/** Index of the centre closest to a pointer position. Used by the picture grid's pointer drag. */
export function nearestCentre(centres: readonly { x: number; y: number }[], x: number, y: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;
  centres.forEach((c, i) => {
    const d = (c.x - x) ** 2 + (c.y - y) ** 2;
    if (d < bestDistance) {
      bestDistance = d;
      best = i;
    }
  });
  return best;
}
