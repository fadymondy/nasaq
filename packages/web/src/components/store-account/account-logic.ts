/*
 * Customer account logic: order history filters, reorder, wishlist availability, recently viewed and the address book.
 * Pure, no React.
 */
import type { CommerceAddress, CommerceOrder, CommerceOrderStatus, CommerceProduct, CommerceVariant } from "../../lib/commerce";

/* ------------------------------------------------------------------ order history */

export type OrderGroup = "all" | "active" | "delivered" | "returns" | "cancelled";
export const ORDER_GROUPS: readonly OrderGroup[] = ["all", "active", "delivered", "returns", "cancelled"];

export function orderGroup(status: CommerceOrderStatus): Exclude<OrderGroup, "all"> {
  if (status === "delivered") return "delivered";
  if (status === "cancelled") return "cancelled";
  if (status === "refunded" || status === "partially-refunded" || status === "returned") return "returns";
  return "active";
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ًͯ-ٟ]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").toLowerCase().trim();

export function filterCustomerOrders(orders: readonly CommerceOrder[], state: { group?: OrderGroup; query?: string }): CommerceOrder[] {
  const query = fold(state.query ?? "");
  return orders.filter((o) => {
    if (state.group && state.group !== "all" && orderGroup(o.status) !== state.group) return false;
    if (!query) return true;
    const hay = fold([o.number, ...o.lines.map((l) => l.name), o.tracking?.number].filter(Boolean).join(" "));
    return query.split(/\s+/).every((w) => hay.includes(w));
  });
}

export function orderGroupCounts(orders: readonly CommerceOrder[]): Record<OrderGroup, number> {
  const counts: Record<OrderGroup, number> = { all: orders.length, active: 0, delivered: 0, returns: 0, cancelled: 0 };
  for (const o of orders) counts[orderGroup(o.status)] += 1;
  return counts;
}

/** Newest first, by placement time. */
export const newestOrdersFirst = (orders: readonly CommerceOrder[]) => [...orders].sort((a, b) => (a.placedAt < b.placedAt ? 1 : a.placedAt > b.placedAt ? -1 : 0));

/* ------------------------------------------------------------------ reorder */

const available = (v: CommerceVariant) => (v.stock === undefined || v.allowBackorder ? Number.POSITIVE_INFINITY : Math.max(v.stock, 0));

export interface ReorderLine {
  lineId: string;
  productId: string;
  variantId: string;
  quantity: number;
  /** Today's price, which may differ from what was paid. */
  unitPrice: number;
  priceChanged: boolean;
}

export interface ReorderPlan {
  add: ReorderLine[];
  /** Added, but fewer than before because of stock. */
  reduced: { lineId: string; wanted: number; got: number }[];
  /** Not added: the product or variant is gone, or sold out. */
  skipped: { lineId: string; reason: "missing" | "out" }[];
}

/** What "Order again" can put in the cart today, against the current catalogue. */
export function reorderPlan(order: Pick<CommerceOrder, "lines">, products: readonly CommerceProduct[]): ReorderPlan {
  const plan: ReorderPlan = { add: [], reduced: [], skipped: [] };
  for (const line of order.lines) {
    const product = products.find((p) => p.id === line.productId && p.status !== "archived");
    const variant = product?.variants.find((v) => v.id === line.variantId);
    if (!product || !variant) {
      plan.skipped.push({ lineId: line.id, reason: "missing" });
      continue;
    }
    const room = available(variant);
    if (room <= 0) {
      plan.skipped.push({ lineId: line.id, reason: "out" });
      continue;
    }
    const quantity = Math.min(line.quantity, room);
    if (quantity < line.quantity) plan.reduced.push({ lineId: line.id, wanted: line.quantity, got: quantity });
    plan.add.push({ lineId: line.id, productId: product.id, variantId: variant.id, quantity, unitPrice: variant.price, priceChanged: variant.price !== line.unitPrice });
  }
  return plan;
}

/* ------------------------------------------------------------------ wishlist */

export interface WishlistItem {
  id: string;
  productId: string;
  variantId: string;
  /** ISO time it was saved. */
  addedAt: string;
  /** Tell me when it is back in stock. */
  notify?: boolean;
  /** Price when it was saved, to show a drop. */
  priceWhenSaved?: number;
}

export type WishlistAvailability = "in-stock" | "low" | "out" | "unavailable";

export interface WishlistEntry {
  item: WishlistItem;
  product?: CommerceProduct;
  variant?: CommerceVariant;
  availability: WishlistAvailability;
  stock?: number;
  /** Positive when the price fell since it was saved, in minor units. */
  priceDrop: number;
  canMoveToCart: boolean;
  /** Only sold-out items can ask to be told. */
  canNotify: boolean;
}

export const LOW_STOCK = 3;

export function wishlistEntries(items: readonly WishlistItem[], products: readonly CommerceProduct[], lowAt = LOW_STOCK): WishlistEntry[] {
  return items.map((item) => {
    const product = products.find((p) => p.id === item.productId && p.status !== "archived");
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) return { item, availability: "unavailable", priceDrop: 0, canMoveToCart: false, canNotify: false };
    const room = available(variant);
    const availability: WishlistAvailability = room <= 0 ? "out" : room <= lowAt ? "low" : "in-stock";
    return {
      item,
      product,
      variant,
      availability,
      ...(Number.isFinite(room) ? { stock: room } : {}),
      priceDrop: item.priceWhenSaved !== undefined && variant.price < item.priceWhenSaved ? item.priceWhenSaved - variant.price : 0,
      canMoveToCart: room > 0,
      canNotify: room <= 0,
    };
  });
}

export const toggleNotify = (items: readonly WishlistItem[], id: string): WishlistItem[] => items.map((i) => (i.id === id ? { ...i, notify: !i.notify } : i));
export const removeWishlistItem = (items: readonly WishlistItem[], id: string): WishlistItem[] => items.filter((i) => i.id !== id);

/** Items that asked to be told and are in stock now: the ones to email. */
export function backInStock(items: readonly WishlistItem[], products: readonly CommerceProduct[]): WishlistItem[] {
  const ready = new Set(wishlistEntries(items, products).filter((e) => e.item.notify && e.canMoveToCart).map((e) => e.item.id));
  return items.filter((i) => ready.has(i.id));
}

/* ------------------------------------------------------------------ recently viewed */

/** Puts `id` first, drops earlier copies and keeps the newest `max`. */
export function pushRecentlyViewed(ids: readonly string[], id: string, max = 12): string[] {
  return [id, ...ids.filter((x) => x !== id)].slice(0, Math.max(max, 0));
}

export const removeRecent = (ids: readonly string[], id: string): string[] => ids.filter((x) => x !== id);

/* ------------------------------------------------------------------ address book */

export type AddressField = "name" | "phone" | "line1" | "city" | "country" | "postalCode";

const EG_POSTAL = /^\d{5}$/;

/** A field → problem map; empty when the address is fine. Problems are codes the caller localises. */
export function validateAddress(address: Partial<CommerceAddress>): Partial<Record<AddressField, "required" | "invalid">> {
  const errors: Partial<Record<AddressField, "required" | "invalid">> = {};
  for (const field of ["name", "line1", "city", "country"] as const) if (!address[field]?.trim()) errors[field] = "required";
  if (!address.phone?.trim()) errors.phone = "required";
  else if (address.phone.replace(/\D/g, "").length < 8) errors.phone = "invalid";
  if (address.country === "EG" && address.postalCode?.trim() && !EG_POSTAL.test(address.postalCode.trim())) errors.postalCode = "invalid";
  return errors;
}

/** Adds or replaces an address (by id), keeping exactly one default. The first address is always the default. */
export function upsertAddress(book: readonly CommerceAddress[], address: CommerceAddress, makeId: () => string = () => `addr-${book.length + 1}`): CommerceAddress[] {
  const id = address.id ?? makeId();
  const exists = book.some((a) => a.id === id);
  const next = exists ? book.map((a) => (a.id === id ? { ...address, id } : a)) : [...book, { ...address, id }];
  const wantsDefault = address.isDefault || next.length === 1;
  return next.map((a) => ({ ...a, isDefault: wantsDefault ? a.id === id : (a.isDefault ?? false) }));
}

export const setDefaultAddress = (book: readonly CommerceAddress[], id: string): CommerceAddress[] => book.map((a) => ({ ...a, isDefault: a.id === id }));

/** Removes an address. When the default goes, the first one left takes over. */
export function removeAddress(book: readonly CommerceAddress[], id: string): CommerceAddress[] {
  const next = book.filter((a) => a.id !== id);
  if (next.length && !next.some((a) => a.isDefault)) return next.map((a, i) => ({ ...a, isDefault: i === 0 }));
  return next;
}

/** Address as display lines, skipping the empty ones. The country is left to the caller to name. */
export function addressLines(a: CommerceAddress): string[] {
  return [a.line1, a.line2, [a.region, a.city].filter(Boolean).join(", "), a.postalCode].filter((x): x is string => !!x && x.trim() !== "");
}
