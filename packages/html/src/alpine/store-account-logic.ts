// Pure logic of the customer account (order groups, reorder, wishlist, address book, return maths). Copy of the React and Vue modules; kept in sync by hand.
// Includes the copies of the commerce types and per-line helpers it needs.
export type CommerceMoney = number;

export type CommerceOrderStatus =
  | "pending" | "paid" | "processing" | "partially-fulfilled" | "fulfilled"
  | "shipped" | "out-for-delivery" | "delivered" | "cancelled" | "refunded" | "partially-refunded" | "returned";
export type CommercePaymentStatus = "pending" | "authorized" | "paid" | "partially-refunded" | "refunded" | "failed" | "cod";
export interface CommerceOrderEvent {
  at: string;
  kind: string;
  label: string;
  by?: string;
  note?: string;
}

export interface CommerceImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  kind?: "image" | "video";
}

export interface CommerceOption {
  id: string;
  name: string;
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
  cost?: CommerceMoney;
  visibility?: "visible" | "hidden";
  seoTitle?: string;
  seoDescription?: string;
}

export interface CommerceCartLine {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantLabel?: string;
  image?: string;
  unitPrice: CommerceMoney;
  compareAt?: CommerceMoney;
  quantity: number;
  maxQuantity?: number;
  savedForLater?: boolean;
}

export interface CommerceAddress {
  id?: string;
  name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  isDefault?: boolean;
}

export interface CommerceShippingMethod {
  id: string;
  label: string;
  price: CommerceMoney;
  freeOver?: CommerceMoney;
  etaDays?: [number, number];
  kind?: "delivery" | "pickup" | "express";
}

export interface CommerceTotals {
  subtotal: CommerceMoney;
  discount: CommerceMoney;
  shipping: CommerceMoney;
  tax: CommerceMoney;
  total: CommerceMoney;
  itemCount: number;
  savings: CommerceMoney;
}

export interface CommerceOrder {
  id: string;
  number: string;
  placedAt: string;
  status: CommerceOrderStatus;
  payment: CommercePaymentStatus;
  customer: { name: string; email?: string; phone?: string };
  lines: (CommerceCartLine & { fulfilled?: number; refunded?: number; returned?: number })[];
  shippingAddress?: CommerceAddress;
  billingAddress?: CommerceAddress;
  shippingMethod?: CommerceShippingMethod;
  totals: CommerceTotals;
  tracking?: { carrier: string; number: string; url?: string };
  events?: CommerceOrderEvent[];
  notes?: string;
}

export interface CommerceLinePick {
  lineId: string;
  quantity: number;
}

export type CommerceRmaStatus = "requested" | "approved" | "shipped-back" | "received" | "refunded" | "rejected" | "cancelled";

/** The happy path of a return, in order. */
export const COMMERCE_RMA_FLOW = ["requested", "approved", "shipped-back", "received", "refunded"] as const;

export const COMMERCE_RETURN_REASONS = ["defective", "wrong-item", "not-as-described", "too-small", "too-large", "changed-mind", "late", "other"] as const;
export type CommerceReturnReason = (typeof COMMERCE_RETURN_REASONS)[number];

export type CommerceRefundMethod = "original" | "store-credit" | "bank";

export interface CommerceReturnRequest {
  id: string;
  /** Shown to the customer, e.g. "RMA-1001". */
  number: string;
  orderId: string;
  createdAt: string;
  status: CommerceRmaStatus;
  lines: CommerceLinePick[];
  reason: CommerceReturnReason;
  note?: string;
  /** Photo URLs. */
  photos?: string[];
  refundMethod: CommerceRefundMethod;
  /** Estimated or final refund, minor units. */
  refundAmount: CommerceMoney;
  /** Why the store said no. */
  rejectionReason?: string;
  /** Status before it was rejected or cancelled. */
  stoppedAfter?: (typeof COMMERCE_RMA_FLOW)[number];
}

const minorFactorCache = new Map<string, number>();

/** Minor units per major unit for an ISO currency (100 for USD and SAR, 1 for JPY, 1000 for KWD). Unknown codes use 100. */
export function commerceMinorFactor(currency: string): number {
  const code = currency.toUpperCase();
  const known = minorFactorCache.get(code);
  if (known !== undefined) return known;
  let factor = 100;
  try {
    factor = 10 ** (new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2);
  } catch {
    factor = 100;
  }
  minorFactorCache.set(code, factor);
  return factor;
}

/* ------------------------------------------------------------------ per-line order maths */

export type OrderLine = CommerceOrder["lines"][number];
export type LinePick = CommerceLinePick;

const whole = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

export const lineFulfilled = (line: OrderLine) => clamp(whole(line.fulfilled), 0, line.quantity);
export const lineRefunded = (line: OrderLine) => clamp(whole(line.refunded), 0, line.quantity);
export const lineReturned = (line: OrderLine) => clamp(whole(line.returned), 0, line.quantity);

/** Units a customer can still send back: shipped, not yet returned, not refunded, and not already in a return request. */
export function lineReturnable(line: OrderLine, inRequest = 0): number {
  return Math.max(0, Math.min(lineFulfilled(line) - lineReturned(line) - whole(inRequest), line.quantity - lineRefunded(line)));
}

/** Splits `total` across `weights` in whole units, largest remainder first, so the parts add up exactly. */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!weights.length) return [];
  if (sum <= 0 || total <= 0) return weights.map(() => 0);
  const exact = weights.map((w) => (total * w) / sum);
  const parts = exact.map(Math.floor);
  let left = total - parts.reduce((s, p) => s + p, 0);
  const order = exact.map((e, i) => [e - Math.floor(e), i] as const).sort((a, b) => b[0] - a[0] || a[1] - b[1]);
  for (let k = 0; left > 0 && k < order.length; k++, left--) parts[order[k]![1]]! += 1;
  return parts;
}

/** What the customer paid for each whole line: gross, minus its discount share, plus its share of exclusive tax. */
export function linePaidValues(order: Pick<CommerceOrder, "lines" | "totals">): number[] {
  const gross = order.lines.map((l) => l.unitPrice * l.quantity);
  const discount = allocate(Math.min(order.totals.discount, gross.reduce((s, g) => s + g, 0)), gross);
  const net = gross.map((g, i) => g - discount[i]!);
  const extra = order.totals.total - order.totals.shipping - net.reduce((s, n) => s + n, 0);
  const tax = extra > 0 ? allocate(extra, net) : net.map(() => 0);
  return net.map((n, i) => n + tax[i]!);
}

/** Value of `count` more units of a line when `before` are already gone. Cumulative rounding: all units add to the line value. */
export function unitsValue(paid: number, quantity: number, before: number, count: number): number {
  if (quantity <= 0 || count <= 0) return 0;
  const at = (n: number) => Math.floor((2 * paid * n + quantity) / (2 * quantity));
  return at(Math.min(before + count, quantity)) - at(Math.min(before, quantity));
}

/*
 * Customer account logic: order history filters, reorder, wishlist availability, recently viewed and the address book.
 * Pure, no framework.
 */

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

/*
 * Return (RMA) maths for the customer account: what can be sent back, the refund it is worth, whether the return
 * window is open, and the return request's status flow. Pure, integer minor units, no framework.
 */

/* The return request shapes live in the shared model (lib/commerce.ts) so the account and the store admin read the same request. */
export type RmaStatus = CommerceRmaStatus;

/** The happy path, in order. */
export const RMA_FLOW = COMMERCE_RMA_FLOW;

export const rmaIsOpen = (status: RmaStatus) => status !== "refunded" && status !== "rejected" && status !== "cancelled";

export interface RmaStep {
  key: (typeof RMA_FLOW)[number];
  state: "done" | "current" | "upcoming" | "skipped";
}

/** The flow as steps. A rejected or cancelled request stops where it was, so later steps read as skipped. */
export function rmaSteps(status: RmaStatus, reachedBeforeStop: (typeof RMA_FLOW)[number] = "requested"): RmaStep[] {
  const stopped = status === "rejected" || status === "cancelled";
  const at = RMA_FLOW.indexOf(stopped ? reachedBeforeStop : (status as (typeof RMA_FLOW)[number]));
  return RMA_FLOW.map((key, i) => ({
    key,
    state: i < at ? "done" : i === at ? (stopped ? "done" : status === "refunded" ? "done" : "current") : stopped ? "skipped" : "upcoming",
  }));
}

/** What the store can do next with a request, in the order the buttons should read. */
export function nextRmaStatuses(status: RmaStatus): RmaStatus[] {
  switch (status) {
    case "requested":
      return ["approved", "rejected"];
    case "approved":
      return ["shipped-back", "cancelled"];
    case "shipped-back":
      return ["received"];
    case "received":
      return ["refunded", "rejected"];
    default:
      return [];
  }
}

export const RETURN_REASONS = COMMERCE_RETURN_REASONS;
export type ReturnReason = CommerceReturnReason;

/** Reasons where the store will want to see a photo. */
export const reasonNeedsPhotos = (reason: ReturnReason | undefined) => reason === "defective" || reason === "wrong-item" || reason === "not-as-described";

export type RefundMethod = CommerceRefundMethod;

/** Cash on delivery has no card or wallet to refund to, so it offers store credit or a bank transfer. */
export function refundMethodsFor(order: Pick<CommerceOrder, "payment">): RefundMethod[] {
  return order.payment === "cod" ? ["store-credit", "bank"] : ["original", "store-credit"];
}

/** A return request. Lives in the shared model as `CommerceReturnRequest`. */
export type ReturnRequest = CommerceReturnRequest;

/** Units per line already in an open request for this order. */
export function inRequestQuantities(requests: readonly Pick<ReturnRequest, "orderId" | "status" | "lines">[], orderId: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of requests) {
    if (r.orderId !== orderId || !rmaIsOpen(r.status)) continue;
    for (const p of r.lines) out[p.lineId] = (out[p.lineId] ?? 0) + p.quantity;
  }
  return out;
}

export function returnableLines(order: CommerceOrder, requests: readonly ReturnRequest[]) {
  const inRequest = inRequestQuantities(requests, order.id);
  return order.lines.map((line) => ({ line, inRequest: inRequest[line.id] ?? 0, returnable: lineReturnable(line, inRequest[line.id] ?? 0) }));
}

/** When the order was delivered, from its events. */
export function deliveredAt(order: Pick<CommerceOrder, "events">): string | undefined {
  return [...(order.events ?? [])].reverse().find((e) => e.kind === "delivered")?.at;
}

const DAY = 86_400_000;

/** The return window: open until `days` after delivery. Nothing delivered means it is not open yet. */
export function returnWindow(delivered: string | undefined, days: number, now: number | Date): { open: boolean; daysLeft: number; deadline?: string } {
  if (!delivered) return { open: false, daysLeft: 0 };
  const deadline = new Date(new Date(delivered).getTime() + days * DAY);
  const left = Math.ceil((deadline.getTime() - new Date(now).getTime()) / DAY);
  return { open: left > 0, daysLeft: Math.max(0, left), deadline: deadline.toISOString() };
}

/** What returning these units is worth, in minor units. Discounts and tax are shared out by line; shipping is not refunded. */
export function refundEstimate(order: Pick<CommerceOrder, "lines" | "totals">, picks: readonly LinePick[]): number {
  const paid = linePaidValues(order);
  let total = 0;
  for (const pick of picks) {
    const index = order.lines.findIndex((l) => l.id === pick.lineId);
    const line = order.lines[index];
    if (!line || pick.quantity <= 0) continue;
    total += unitsValue(paid[index]!, line.quantity, lineRefunded(line), pick.quantity);
  }
  return total;
}

export type ReturnIssue =
  | { code: "empty" }
  | { code: "line-over"; lineId: string; max: number }
  | { code: "reason" }
  | { code: "note" }
  | { code: "photos" }
  | { code: "method" }
  | { code: "window" };

export interface ReturnInput {
  picks: readonly LinePick[];
  reason?: ReturnReason;
  note?: string;
  photos?: number;
  refundMethod?: RefundMethod;
  /** Skip the window check when the caller has already checked it. */
  windowOpen?: boolean;
}

export interface ReturnPlan {
  ok: boolean;
  issues: ReturnIssue[];
  picks: LinePick[];
  refundAmount: number;
  units: number;
}

/** Checks a return request against what is returnable and the store's rules, and prices it. */
export function planReturn(order: CommerceOrder, requests: readonly ReturnRequest[], input: ReturnInput): ReturnPlan {
  const issues: ReturnIssue[] = [];
  const lines = returnableLines(order, requests);
  const picks: LinePick[] = [];
  for (const pick of input.picks) {
    const quantity = Math.floor(pick.quantity);
    if (!(quantity > 0)) continue;
    const row = lines.find((l) => l.line.id === pick.lineId);
    if (!row || quantity > row.returnable) issues.push({ code: "line-over", lineId: pick.lineId, max: row?.returnable ?? 0 });
    else picks.push({ lineId: pick.lineId, quantity });
  }
  if (!picks.length && !issues.length) issues.push({ code: "empty" });
  if (!input.reason) issues.push({ code: "reason" });
  else {
    if (input.reason === "other" && !input.note?.trim()) issues.push({ code: "note" });
    if (reasonNeedsPhotos(input.reason) && !(input.photos && input.photos > 0)) issues.push({ code: "photos" });
  }
  if (!input.refundMethod || !refundMethodsFor(order).includes(input.refundMethod)) issues.push({ code: "method" });
  if (input.windowOpen === false) issues.push({ code: "window" });
  return { ok: issues.length === 0, issues, picks, refundAmount: refundEstimate(order, picks), units: picks.reduce((s, p) => s + p.quantity, 0) };
}
