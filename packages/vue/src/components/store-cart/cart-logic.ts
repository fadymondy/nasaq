/*
 * Pure cart logic for the storefront: quantity clamping, add/merge, remove with undo, save for later, stock
 * warnings and the shipping-by-city estimate. Money is integer minor units. No framework imports, so it runs under node --test.
 */
import { commerceClampQuantity, commerceMatchDeliveryZone, commerceNormalizePlace } from "./commerce";
import type { CommerceCartLine, CommerceDeliveryZone, CommerceMoney, CommerceProduct, CommerceShippingMethod, CommerceVariant } from "./commerce";

/** What a caller passes to add a product: a line without its id and quantity. */
export type CartNewLine = Omit<CommerceCartLine, "id" | "quantity" | "savedForLater"> & { id?: string };

export interface CartChange {
  lines: CommerceCartLine[];
  /** The line's quantity after the change (0 when the line is gone). */
  quantity: number;
  /** The requested quantity was above the limit and was lowered. */
  clamped: boolean;
  /** Something actually changed. */
  changed: boolean;
}

const same = (a: CommerceCartLine, b: CommerceCartLine) => a.variantId === b.variantId;

/** The lines that count towards totals, shipping and checkout. */
export const cartActiveLines = (lines: readonly CommerceCartLine[]): CommerceCartLine[] => lines.filter((l) => !l.savedForLater);
export const cartSavedLines = (lines: readonly CommerceCartLine[]): CommerceCartLine[] => lines.filter((l) => l.savedForLater);
/** Items in the cart (sum of quantities), saved-for-later excluded. */
export const cartCount = (lines: readonly CommerceCartLine[]): number => cartActiveLines(lines).reduce((n, l) => n + l.quantity, 0);

/** Sets a line's quantity, clamped to 1..maxQuantity. Non-numbers become 1. */
export function cartSetQuantity(lines: readonly CommerceCartLine[], lineId: string, requested: number): CartChange {
  const line = lines.find((l) => l.id === lineId);
  if (!line) return { lines: [...lines], quantity: 0, clamped: false, changed: false };
  const wanted = Math.max(1, Math.floor(requested) || 1);
  const quantity = commerceClampQuantity(wanted, line.maxQuantity);
  return {
    lines: lines.map((l) => (l.id === lineId ? { ...l, quantity } : l)),
    quantity,
    clamped: quantity < wanted,
    changed: quantity !== line.quantity,
  };
}

/** Adds a product. The same variant merges into its line (and comes back from the saved-for-later list); the total is clamped to the line limit. */
export function cartAdd(lines: readonly CommerceCartLine[], item: CartNewLine, quantity = 1): CartChange & { line: CommerceCartLine } {
  const existing = lines.find((l) => l.variantId === item.variantId);
  const wanted = Math.max(1, Math.floor(quantity) || 1) + (existing && !existing.savedForLater ? existing.quantity : 0);
  const max = item.maxQuantity ?? existing?.maxQuantity;
  const next = commerceClampQuantity(wanted, max);
  const line: CommerceCartLine = { ...existing, ...item, id: existing?.id ?? item.id ?? `line-${item.variantId}`, quantity: next, savedForLater: false };
  return {
    lines: existing ? lines.map((l) => (l.id === existing.id ? line : l)) : [...lines, line],
    line,
    quantity: next,
    clamped: next < wanted,
    changed: !existing || !!existing.savedForLater || next !== existing.quantity,
  };
}

/** A removed line and where it was, so undo can put it back in place. */
export interface CartRemoval {
  line: CommerceCartLine;
  index: number;
}

export function cartRemove(lines: readonly CommerceCartLine[], lineId: string): { lines: CommerceCartLine[]; removed?: CartRemoval } {
  const index = lines.findIndex((l) => l.id === lineId);
  if (index < 0) return { lines: [...lines] };
  return { lines: lines.filter((l) => l.id !== lineId), removed: { line: lines[index]!, index } };
}

/** Undo of `cartRemove`. If the shopper added the same variant again meanwhile, the quantities merge (still clamped). */
export function cartRestore(lines: readonly CommerceCartLine[], removal: CartRemoval): CommerceCartLine[] {
  const twin = lines.find((l) => same(l, removal.line) && !!l.savedForLater === !!removal.line.savedForLater);
  if (twin) {
    const quantity = commerceClampQuantity(twin.quantity + removal.line.quantity, twin.maxQuantity ?? removal.line.maxQuantity);
    return lines.map((l) => (l === twin ? { ...l, quantity } : l));
  }
  const at = Math.min(Math.max(removal.index, 0), lines.length);
  return [...lines.slice(0, at), removal.line, ...lines.slice(at)];
}

function moveLine(lines: readonly CommerceCartLine[], lineId: string, savedForLater: boolean): CommerceCartLine[] {
  const line = lines.find((l) => l.id === lineId);
  if (!line || !!line.savedForLater === savedForLater) return [...lines];
  const twin = lines.find((l) => l.id !== line.id && same(l, line) && !!l.savedForLater === savedForLater);
  if (!twin) return lines.map((l) => (l.id === lineId ? { ...l, savedForLater } : l));
  const quantity = commerceClampQuantity(twin.quantity + line.quantity, twin.maxQuantity ?? line.maxQuantity);
  return lines.filter((l) => l.id !== line.id).map((l) => (l.id === twin.id ? { ...l, quantity } : l));
}

export const cartSaveForLater = (lines: readonly CommerceCartLine[], lineId: string) => moveLine(lines, lineId, true);
export const cartMoveToCart = (lines: readonly CommerceCartLine[], lineId: string) => moveLine(lines, lineId, false);

export type CartStockIssue = { kind: "out" } | { kind: "over"; available: number } | { kind: "low"; available: number };

/**
 * The stock problem on a line, if any. "out" and "over" block checkout; "low" is a nudge (`lowAt` or fewer left).
 * Lines without `maxQuantity` are not tracked and never warn.
 */
export function cartStockIssue(line: CommerceCartLine, lowAt = 5): CartStockIssue | undefined {
  const max = line.maxQuantity;
  if (max === undefined) return undefined;
  if (max <= 0) return { kind: "out" };
  if (line.quantity > max) return { kind: "over", available: max };
  if (max <= lowAt) return { kind: "low", available: max };
  return undefined;
}

/** Active lines that stop checkout: out of stock, or more than what is left. */
export const cartBlockers = (lines: readonly CommerceCartLine[]): CommerceCartLine[] =>
  cartActiveLines(lines).filter((l) => {
    const issue = cartStockIssue(l);
    return issue?.kind === "out" || issue?.kind === "over";
  });

/** Brings every over-stock line down to what is available. Out-of-stock lines are left for the shopper to remove. */
export function cartFixOverStock(lines: readonly CommerceCartLine[]): CommerceCartLine[] {
  return lines.map((l) => (l.maxQuantity !== undefined && l.maxQuantity > 0 && l.quantity > l.maxQuantity ? { ...l, quantity: l.maxQuantity } : l));
}

/* ------------------------------------------------------------------ shipping estimate by city */

/** A zone priced for this cart. Promoted to the shared model as `CommerceDeliveryZone` (build one from a merchant zone with `commerceDeliveryZone`). */
export type StoreShippingZone = CommerceDeliveryZone;

/** Folds a place name so English and Arabic spellings compare. Promoted to the shared model as `commerceNormalizePlace`. */
export const normalizePlace = commerceNormalizePlace;

/** The zone that delivers to `city`, or undefined. Promoted to the shared model as `commerceMatchDeliveryZone`. */
export const matchShippingZone = commerceMatchDeliveryZone;

export interface CartShippingOption {
  method: CommerceShippingMethod;
  /** What it costs for this subtotal (0 when free). */
  cost: CommerceMoney;
  free: boolean;
  /** Still to spend to make it free, when it has a free-over threshold. */
  remaining?: CommerceMoney;
}

/** Each method's cost for a subtotal, using the same free-over rule as `commerceTotals`. */
export function cartShippingOptions(zone: StoreShippingZone | undefined, subtotal: CommerceMoney): CartShippingOption[] {
  if (!zone) return [];
  return zone.methods.map((method) => {
    const free = method.price === 0 || (method.freeOver !== undefined && subtotal >= method.freeOver);
    return {
      method,
      cost: free ? 0 : method.price,
      free,
      ...(!free && method.freeOver !== undefined ? { remaining: method.freeOver - subtotal } : {}),
    };
  });
}

/** The cheapest option, used as the default pick. */
export const cartCheapestShipping = (options: readonly CartShippingOption[]): CartShippingOption | undefined =>
  options.reduce<CartShippingOption | undefined>((best, o) => (!best || o.cost < best.cost ? o : best), undefined);

/* ------------------------------------------------------------------ announcements */

/** What changed, for the aria-live region. The component turns it into a sentence in the shopper's language. */
export type CartEvent =
  | { kind: "added"; name: string; quantity: number }
  | { kind: "removed"; name: string }
  | { kind: "quantity"; name: string; quantity: number }
  | { kind: "clamped"; name: string; quantity: number }
  | { kind: "saved"; name: string }
  | { kind: "moved"; name: string }
  | { kind: "restored"; name: string }
  | { kind: "promo-applied"; code: string }
  | { kind: "promo-removed"; code: string };

/* ------------------------------------------------------------------ from a product */

const inStock = (v: CommerceVariant) => v.allowBackorder || v.stock === undefined || v.stock > 0;

/**
 * The line to add for a product: the given variant, or the first one in stock. Returns undefined when that variant is
 * sold out or the product has nothing to buy. The label joins the option values ("Black · M").
 */
export function cartItemFromProduct(product: CommerceProduct, variantId?: string): CartNewLine | undefined {
  const variant = (variantId ? product.variants.find((v) => v.id === variantId) : undefined) ?? product.variants.find(inStock);
  if (!variant || !inStock(variant)) return undefined;
  const label = product.options.map((o) => o.values.find((x) => x.id === variant.options[o.id])?.label).filter(Boolean).join(" · ");
  const image = variant.image ?? product.images[0]?.src;
  return {
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    ...(label ? { variantLabel: label } : {}),
    ...(image ? { image } : {}),
    unitPrice: variant.price,
    ...(variant.compareAt && variant.compareAt > variant.price ? { compareAt: variant.compareAt } : {}),
    ...(variant.stock !== undefined && !variant.allowBackorder ? { maxQuantity: variant.stock } : {}),
  };
}
