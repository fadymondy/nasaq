// Pure logic of the store admin (order maths, order list, abandoned carts). Copy of the React and Vue modules; kept in sync by hand.
// Copies of the order types and helpers in packages/web/src/lib/commerce.ts that the store admin uses.
export type CommerceMoney = number;

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




export type CommerceFulfilmentState = "unfulfilled" | "partial" | "fulfilled" | "none";

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

export interface CommerceRefundRecord {
  id?: string;
  at?: string;
  /** Money handed back, in minor units. */
  amount: CommerceMoney;
  picks?: CommerceLinePick[];
  shipping?: boolean;
  restock?: boolean;
  note?: string;
  by?: string;
}

export interface CommerceAbandonedCart {
  id: string;
  customer: { name: string; email?: string } | null;
  lines: CommerceCartLine[];
  lastActivityAt: string;
  stage: "cart" | "checkout" | "payment";
  emailsSent: number;
  lastEmailAt?: string;
  recoveredOrderId?: string;
  discountCode?: string;
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
/*
 * Order maths for the store admin and the customer account: what can still be refunded, shipped or returned, and the
 * order status that follows. Pure functions, integer minor units, no React and no runtime imports.
 *
 * Conventions
 * - `line.fulfilled` counts shipped units, `line.refunded` refunded units, `line.returned` units that came back.
 * - A refund cancels unshipped units first. To refund a unit that already shipped, ship it (or mark it returned) first.
 * - Each line carries its share of the order discount and of any exclusive tax. Shares are handed out with the
 *   largest-remainder method, so line values plus shipping always add up to the order total to the last unit.
 */

export type OrderLine = CommerceOrder["lines"][number];
export type LinePick = CommerceLinePick;

/** One refund. Lives in the shared model as `CommerceRefundRecord`. */
export type RefundRecord = CommerceRefundRecord;

export interface Restock {
  variantId: string;
  productId: string;
  quantity: number;
}

const whole = (n: number | undefined) => (n !== undefined && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0);
const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/* ------------------------------------------------------------------ per line */

export const lineFulfilled = (line: OrderLine) => clamp(whole(line.fulfilled), 0, line.quantity);
export const lineRefunded = (line: OrderLine) => clamp(whole(line.refunded), 0, line.quantity);
export const lineReturned = (line: OrderLine) => clamp(whole(line.returned), 0, line.quantity);

/** Units cancelled before shipping: refunded units eat the unshipped ones first (returned units were shipped). */
export function lineCancelled(line: OrderLine): number {
  return clamp(Math.min(lineRefunded(line) - lineReturned(line), line.quantity - lineFulfilled(line)), 0, line.quantity);
}

/** Units still to ship. */
export const lineOutstanding = (line: OrderLine) => Math.max(0, line.quantity - lineFulfilled(line) - lineCancelled(line));

/** Units that can still be refunded. */
export const lineRefundable = (line: OrderLine) => Math.max(0, line.quantity - lineRefunded(line));

/** Units a customer can still send back: shipped, not yet returned, not refunded, and not already in a return request. */
export function lineReturnable(line: OrderLine, inRequest = 0): number {
  return Math.max(0, Math.min(lineFulfilled(line) - lineReturned(line) - whole(inRequest), line.quantity - lineRefunded(line)));
}

/* ------------------------------------------------------------------ money shares */

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

/* ------------------------------------------------------------------ refunds */

export const refundedTotal = (refunds: readonly RefundRecord[]) => refunds.reduce((s, r) => s + r.amount, 0);

/** Money that can still be handed back. */
export const refundRemaining = (order: Pick<CommerceOrder, "totals">, refunds: readonly RefundRecord[]) => Math.max(0, order.totals.total - refundedTotal(refunds));

export const shippingRefunded = (refunds: readonly RefundRecord[]) => refunds.some((r) => r.shipping);

export type RefundIssue =
  | { code: "empty" }
  | { code: "unpaid" }
  | { code: "line-over"; lineId: string; max: number }
  | { code: "unknown-line"; lineId: string }
  | { code: "shipping-done" }
  | { code: "amount-invalid" }
  | { code: "amount-over"; max: number };

export interface RefundInput {
  mode: "lines" | "amount";
  picks?: readonly LinePick[];
  /** Minor units, for mode "amount". */
  amount?: number;
  includeShipping?: boolean;
  restock?: boolean;
  note?: string;
}

export interface RefundPlan {
  ok: boolean;
  amount: number;
  issues: RefundIssue[];
  /** Picks without zero rows. */
  picks: LinePick[];
  shipping: boolean;
  restock: Restock[];
  /** Amount per line for the lines mode. */
  perLine: { lineId: string; amount: number }[];
  record: RefundRecord | null;
}

const UNPAID: readonly CommercePaymentStatus[] = ["pending", "failed", "authorized"];

/** Whether anything is left to refund at all (paid, and not refunded in full). */
export function canRefund(order: Pick<CommerceOrder, "payment" | "totals" | "status">, refunds: readonly RefundRecord[]): boolean {
  return !UNPAID.includes(order.payment) && order.status !== "cancelled" && refundRemaining(order, refunds) > 0;
}

export function planRefund(order: Pick<CommerceOrder, "lines" | "totals" | "payment" | "status">, refunds: readonly RefundRecord[], input: RefundInput): RefundPlan {
  const issues: RefundIssue[] = [];
  const remaining = refundRemaining(order, refunds);
  const empty: RefundPlan = { ok: false, amount: 0, issues, picks: [], shipping: false, restock: [], perLine: [], record: null };
  if (UNPAID.includes(order.payment)) return { ...empty, issues: [{ code: "unpaid" }] };

  if (input.mode === "amount") {
    const amount = input.amount ?? 0;
    if (!Number.isInteger(amount) || amount <= 0) issues.push({ code: "amount-invalid" });
    else if (amount > remaining) issues.push({ code: "amount-over", max: remaining });
    const ok = issues.length === 0;
    return { ...empty, ok, amount: ok ? amount : whole(amount), issues, record: ok ? { amount, ...(input.note ? { note: input.note } : {}) } : null };
  }

  const paid = linePaidValues(order);
  const picks: LinePick[] = [];
  const perLine: RefundPlan["perLine"] = [];
  let amount = 0;
  for (const pick of input.picks ?? []) {
    const quantity = whole(pick.quantity);
    if (!quantity) continue;
    const index = order.lines.findIndex((l) => l.id === pick.lineId);
    if (index < 0) {
      issues.push({ code: "unknown-line", lineId: pick.lineId });
      continue;
    }
    const line = order.lines[index]!;
    const max = lineRefundable(line);
    if (quantity > max) {
      issues.push({ code: "line-over", lineId: line.id, max });
      continue;
    }
    const value = unitsValue(paid[index]!, line.quantity, lineRefunded(line), quantity);
    picks.push({ lineId: line.id, quantity });
    perLine.push({ lineId: line.id, amount: value });
    amount += value;
  }
  let shipping = false;
  if (input.includeShipping) {
    if (shippingRefunded(refunds) || order.totals.shipping <= 0) issues.push({ code: "shipping-done" });
    else {
      shipping = true;
      amount += order.totals.shipping;
    }
  }
  if (!picks.length && !shipping && !issues.length) issues.push({ code: "empty" });
  if (amount > remaining && !issues.some((i) => i.code === "line-over")) issues.push({ code: "amount-over", max: remaining });
  const restock = input.restock ? restockFor(order.lines, picks) : [];
  const ok = issues.length === 0;
  return {
    ok,
    amount,
    issues,
    picks,
    shipping,
    restock,
    perLine,
    record: ok ? { amount, picks, shipping, restock: !!input.restock, ...(input.note ? { note: input.note } : {}) } : null,
  };
}

/** Units going back on the shelf, merged per variant. */
export function restockFor(lines: readonly OrderLine[], picks: readonly LinePick[]): Restock[] {
  const merged = new Map<string, Restock>();
  for (const pick of picks) {
    const line = lines.find((l) => l.id === pick.lineId);
    if (!line || pick.quantity <= 0) continue;
    const row = merged.get(line.variantId);
    if (row) row.quantity += pick.quantity;
    else merged.set(line.variantId, { variantId: line.variantId, productId: line.productId, quantity: pick.quantity });
  }
  return [...merged.values()];
}

/** Payment status once `refunded` minor units have gone back on an order paid `total`. */
export function paymentAfterRefund(current: CommercePaymentStatus, total: number, refunded: number): CommercePaymentStatus {
  if (refunded <= 0) return current;
  return refunded >= total ? "refunded" : "partially-refunded";
}

export function paymentSummary(order: Pick<CommerceOrder, "totals" | "payment">, refunds: readonly RefundRecord[]) {
  const refunded = refundedTotal(refunds);
  const unpaid = UNPAID.includes(order.payment);
  const paid = unpaid ? 0 : order.totals.total;
  return { total: order.totals.total, paid, refunded, net: Math.max(0, paid - refunded), due: unpaid ? order.totals.total : 0 };
}

/* ------------------------------------------------------------------ fulfilment */

export type FulfilmentState = CommerceFulfilmentState;

/** "none" means every unit was cancelled, so there is nothing to ship. */
export function fulfilmentState(lines: readonly OrderLine[]): FulfilmentState {
  const shipped = lines.reduce((s, l) => s + lineFulfilled(l), 0);
  const outstanding = lines.reduce((s, l) => s + lineOutstanding(l), 0);
  if (outstanding === 0) return shipped > 0 ? "fulfilled" : "none";
  return shipped > 0 ? "partial" : "unfulfilled";
}

export function fulfilmentProgress(lines: readonly OrderLine[]) {
  const shipped = lines.reduce((s, l) => s + lineFulfilled(l), 0);
  const outstanding = lines.reduce((s, l) => s + lineOutstanding(l), 0);
  return { shipped, outstanding, total: shipped + outstanding };
}

/** Everything still to ship, as picks. */
export const outstandingPicks = (lines: readonly OrderLine[]): LinePick[] =>
  lines.map((l) => ({ lineId: l.id, quantity: lineOutstanding(l) })).filter((p) => p.quantity > 0);

export type FulfilmentIssue = { code: "empty" } | { code: "blocked" } | { code: "line-over"; lineId: string; max: number } | { code: "unknown-line"; lineId: string } | { code: "tracking-number" };

export interface FulfilmentInput {
  picks: readonly LinePick[];
  carrier?: string;
  trackingNumber?: string;
}

export interface FulfilmentPlan {
  ok: boolean;
  issues: FulfilmentIssue[];
  picks: LinePick[];
  /** True when this shipment leaves nothing outstanding. */
  completes: boolean;
  state: FulfilmentState;
}

export function planFulfilment(order: Pick<CommerceOrder, "lines" | "payment" | "status">, input: FulfilmentInput): FulfilmentPlan {
  const issues: FulfilmentIssue[] = [];
  const picks: LinePick[] = [];
  if (order.status === "cancelled" || order.payment === "failed" || order.payment === "refunded") issues.push({ code: "blocked" });
  for (const pick of input.picks) {
    const quantity = whole(pick.quantity);
    if (!quantity) continue;
    const line = order.lines.find((l) => l.id === pick.lineId);
    if (!line) {
      issues.push({ code: "unknown-line", lineId: pick.lineId });
      continue;
    }
    const max = lineOutstanding(line);
    if (quantity > max) issues.push({ code: "line-over", lineId: line.id, max });
    else picks.push({ lineId: line.id, quantity });
  }
  if (!picks.length && !issues.length) issues.push({ code: "empty" });
  if (input.carrier && !input.trackingNumber?.trim()) issues.push({ code: "tracking-number" });
  const after = order.lines.map((l) => ({ ...l, fulfilled: lineFulfilled(l) + (picks.find((p) => p.lineId === l.id)?.quantity ?? 0) }));
  return { ok: issues.length === 0, issues, picks, completes: fulfilmentState(after) === "fulfilled", state: fulfilmentState(after) };
}

/* ------------------------------------------------------------------ status */

export type DeliveryStage = "shipped" | "out-for-delivery" | "delivered";

export interface StatusInput {
  status: CommerceOrderStatus;
  payment: CommercePaymentStatus;
  lines: readonly OrderLine[];
  /** Where the carrier has got to, once everything shipped. */
  delivery?: DeliveryStage;
}

const DELIVERY: readonly CommerceOrderStatus[] = ["shipped", "out-for-delivery", "delivered"];

/**
 * The order status that follows from its lines and payment. Cancelled stays cancelled. Full refund wins, then
 * partial refund, then payment, then fulfilment.
 */
export function deriveOrderStatus(input: StatusInput): CommerceOrderStatus {
  if (input.status === "cancelled") return "cancelled";
  const units = input.lines.reduce((s, l) => s + l.quantity, 0);
  const refunded = input.lines.reduce((s, l) => s + lineRefunded(l), 0);
  const returned = input.lines.reduce((s, l) => s + lineReturned(l), 0);
  if (input.payment === "refunded" || (units > 0 && refunded >= units)) return returned > 0 && returned >= refunded ? "returned" : "refunded";
  if (refunded > 0 || input.payment === "partially-refunded") return "partially-refunded";
  if (input.payment === "pending" || input.payment === "failed") return "pending";
  const state = fulfilmentState(input.lines);
  if (state === "partial") return "partially-fulfilled";
  if (state === "fulfilled") return input.delivery ?? (DELIVERY.includes(input.status) ? input.status : "fulfilled");
  // Nothing shipped yet: cash on delivery has no payment to wait for, so it goes straight to processing.
  return input.status === "processing" || input.payment === "cod" ? "processing" : "paid";
}

/* ------------------------------------------------------------------ cancel */

export function canCancel(order: Pick<CommerceOrder, "lines" | "status">): boolean {
  if (["cancelled", "refunded", "returned", "delivered", "shipped", "out-for-delivery", "fulfilled"].includes(order.status)) return false;
  return order.lines.every((l) => lineFulfilled(l) === 0);
}

export interface CancelPlan {
  ok: boolean;
  /** Paid money that goes back, in minor units. */
  refundAmount: number;
  restock: Restock[];
}

export function planCancel(order: Pick<CommerceOrder, "lines" | "status" | "payment" | "totals">, refunds: readonly RefundRecord[]): CancelPlan {
  if (!canCancel(order)) return { ok: false, refundAmount: 0, restock: [] };
  const paid = !UNPAID.includes(order.payment);
  return {
    ok: true,
    refundAmount: paid ? refundRemaining(order, refunds) : 0,
    restock: restockFor(order.lines, outstandingPicks(order.lines)),
  };
}

/* ------------------------------------------------------------------ apply */

export interface ApplyMeta {
  at: string;
  by?: string;
  label: string;
  note?: string;
}

const withEvent = (order: CommerceOrder, kind: string, meta: ApplyMeta): NonNullable<CommerceOrder["events"]> => [
  ...(order.events ?? []),
  { at: meta.at, kind, label: meta.label, ...(meta.by ? { by: meta.by } : {}), ...(meta.note ? { note: meta.note } : {}) },
];

/** The order after a refund: lines, payment, status and timeline. Returns the new refunds list too. */
export function applyRefund(order: CommerceOrder, refunds: readonly RefundRecord[], plan: RefundPlan, meta: ApplyMeta): { order: CommerceOrder; refunds: RefundRecord[] } {
  if (!plan.ok || !plan.record) return { order, refunds: [...refunds] };
  const nextRefunds = [...refunds, { ...plan.record, at: meta.at, ...(meta.by ? { by: meta.by } : {}) }];
  const lines = order.lines.map((l) => {
    const pick = plan.picks.find((p) => p.lineId === l.id);
    return pick ? { ...l, refunded: lineRefunded(l) + pick.quantity } : l;
  });
  const payment = paymentAfterRefund(order.payment, order.totals.total, refundedTotal(nextRefunds));
  const status = deriveOrderStatus({ status: order.status, payment, lines });
  return { order: { ...order, lines, payment, status, events: withEvent(order, "refund", meta) }, refunds: nextRefunds };
}

/** The order after a shipment: lines, tracking, status and timeline. */
export function applyFulfilment(order: CommerceOrder, plan: FulfilmentPlan, meta: ApplyMeta, tracking?: { carrier: string; number: string; url?: string }): CommerceOrder {
  if (!plan.ok) return order;
  const lines = order.lines.map((l) => {
    const pick = plan.picks.find((p) => p.lineId === l.id);
    return pick ? { ...l, fulfilled: lineFulfilled(l) + pick.quantity } : l;
  });
  const status = deriveOrderStatus({ status: order.status, payment: order.payment, lines, delivery: "shipped" });
  return { ...order, lines, status, ...(tracking ? { tracking } : {}), events: withEvent(order, plan.completes ? "shipped" : "fulfilled", meta) };
}

/** The order after cancelling it, with any refund recorded. */
export function applyCancel(order: CommerceOrder, refunds: readonly RefundRecord[], meta: ApplyMeta): { order: CommerceOrder; refunds: RefundRecord[] } {
  const plan = planCancel(order, refunds);
  if (!plan.ok) return { order, refunds: [...refunds] };
  const nextRefunds = plan.refundAmount > 0 ? [...refunds, { amount: plan.refundAmount, at: meta.at, restock: true, note: "cancel", ...(meta.by ? { by: meta.by } : {}) }] : [...refunds];
  const payment = plan.refundAmount > 0 ? paymentAfterRefund(order.payment, order.totals.total, refundedTotal(nextRefunds)) : order.payment;
  return { order: { ...order, status: "cancelled", payment, events: withEvent(order, "cancelled", meta) }, refunds: nextRefunds };
}

/** Adds a note to the order timeline. */
export function applyNote(order: CommerceOrder, meta: ApplyMeta): CommerceOrder {
  return { ...order, events: withEvent(order, "note", meta) };
}
/*
 * The order list's pure logic: search, filters, saved views, counts and CSV export. Same rules as the table's own
 * search and facet filters, so a view's badge count always matches what the table shows.
 */

/** Fulfilment as the list shows it. Orders that will never ship (cancelled, refunded, returned) read as "none". */
export function orderFulfilment(order: Pick<CommerceOrder, "lines" | "status">): FulfilmentState {
  if (order.status === "cancelled" || order.status === "refunded" || order.status === "returned") return "none";
  return fulfilmentState(order.lines);
}

/** Column id → allowed values. Empty or missing means no filter on that column. */
export type OrderFilters = Record<string, string[]>;

export interface OrderView {
  id: string;
  name: string;
  filters: OrderFilters;
  query?: string;
}

/** Lower-case, strip accents and Arabic diacritics, and fold the letters people type interchangeably. */
export function foldText(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ًͯ-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLowerCase()
    .trim();
}

/** The text a search matches: number, customer, contact, products and tracking number. */
export function orderSearchText(order: CommerceOrder): string {
  return foldText(
    [order.number, order.customer.name, order.customer.email, order.customer.phone, order.tracking?.number, ...order.lines.map((l) => l.name)].filter(Boolean).join(" "),
  );
}

/** Column values a filter compares against. */
export function orderFilterValue(order: CommerceOrder, column: string): string {
  if (column === "status") return order.status;
  if (column === "payment") return order.payment;
  if (column === "fulfilment") return orderFulfilment(order);
  return "";
}

export function matchesOrder(order: CommerceOrder, state: { filters?: OrderFilters; query?: string }): boolean {
  for (const [column, values] of Object.entries(state.filters ?? {})) {
    if (values.length && !values.includes(orderFilterValue(order, column))) return false;
  }
  const query = foldText(state.query ?? "");
  return !query || query.split(/\s+/).every((word) => orderSearchText(order).includes(word));
}

export const filterOrders = (orders: readonly CommerceOrder[], state: { filters?: OrderFilters; query?: string }) => orders.filter((o) => matchesOrder(o, state));

const norm = (filters: OrderFilters = {}) =>
  Object.entries(filters)
    .filter(([, v]) => v.length)
    .map(([k, v]) => `${k}=${[...v].sort().join(",")}`)
    .sort()
    .join("&");

export const sameFilters = (a: OrderFilters = {}, b: OrderFilters = {}) => norm(a) === norm(b);

/** The saved view whose filters and search equal the current state, if any. */
export function activeView(views: readonly OrderView[], state: { filters?: OrderFilters; query?: string }): OrderView | undefined {
  return views.find((v) => sameFilters(v.filters, state.filters) && foldText(v.query ?? "") === foldText(state.query ?? ""));
}

export function viewCounts(orders: readonly CommerceOrder[], views: readonly OrderView[]): Record<string, number> {
  return Object.fromEntries(views.map((v) => [v.id, filterOrders(orders, v).length]));
}

/** Adds a view, or replaces the one with the same id. A blank name is refused. */
export function upsertView(views: readonly OrderView[], view: OrderView): OrderView[] {
  const name = view.name.trim();
  if (!name) return [...views];
  const next = { ...view, name, filters: Object.fromEntries(Object.entries(view.filters).filter(([, v]) => v.length)) };
  return views.some((v) => v.id === view.id) ? views.map((v) => (v.id === view.id ? next : v)) : [...views, next];
}

export const removeView = (views: readonly OrderView[], id: string) => views.filter((v) => v.id !== id);

/* ------------------------------------------------------------------ CSV */

/** 12345 → "123.45". Integer maths, so no float drift. `digits` is the currency's minor-unit exponent. */
export function storeFormatMinor(amount: number, digits = 2): string {
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(Math.trunc(amount));
  if (digits <= 0) return `${sign}${abs}`;
  const base = 10 ** digits;
  return `${sign}${Math.floor(abs / base)}.${String(abs % base).padStart(digits, "0")}`;
}

/** One CSV cell: quoted when needed, and a leading = + - @ is defused so a spreadsheet never runs it as a formula. */
export function csvCell(value: string | number | undefined): string {
  let text = value === undefined ? "" : String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export const ORDER_CSV_COLUMNS = ["number", "date", "customer", "email", "status", "payment", "fulfilment", "items", "subtotal", "discount", "shipping", "tax", "total", "currency", "tracking"] as const;

export function ordersToCsv(orders: readonly CommerceOrder[], options: { currency?: string; digits?: number } = {}): string {
  const { currency = "", digits = 2 } = options;
  const rows = orders.map((o) => [
    o.number,
    o.placedAt.slice(0, 10),
    o.customer.name,
    o.customer.email,
    o.status,
    o.payment,
    orderFulfilment(o),
    o.totals.itemCount,
    storeFormatMinor(o.totals.subtotal, digits),
    storeFormatMinor(o.totals.discount, digits),
    storeFormatMinor(o.totals.shipping, digits),
    storeFormatMinor(o.totals.tax, digits),
    storeFormatMinor(o.totals.total, digits),
    currency,
    o.tracking?.number,
  ]);
  return [ORDER_CSV_COLUMNS.join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");
}
/*
 * Abandoned carts: value, age, recovery status and whether another recovery email may go out. Pure, no React.
 * Time comes in as an argument (`now`), never from the clock, so it is testable.
 */

/** A cart left behind. Lives in the shared model as `CommerceAbandonedCart`. */
export type AbandonedCart = CommerceAbandonedCart;

export type RecoveryStatus = "new" | "emailed" | "recovered" | "lost" | "no-email";

export interface RecoveryRules {
  /** A cart is only "abandoned" after this many idle minutes. Default 60. */
  minIdleMinutes?: number;
  /** Minimum hours between two emails. Default 24. */
  cooldownHours?: number;
  /** Most recovery emails per cart. Default 3. */
  maxEmails?: number;
  /** After this many idle days the cart counts as lost. Default 14. */
  lostAfterDays?: number;
}

const DEFAULTS = { minIdleMinutes: 60, cooldownHours: 24, maxEmails: 3, lostAfterDays: 14 } as const;
const MINUTE = 60_000;

export const cartValue = (cart: Pick<AbandonedCart, "lines">): number => cart.lines.filter((l) => !l.savedForLater).reduce((s, l) => s + l.unitPrice * l.quantity, 0);
export const cartItemCount = (cart: Pick<AbandonedCart, "lines">): number => cart.lines.filter((l) => !l.savedForLater).reduce((s, l) => s + l.quantity, 0);

/** Idle minutes since the last activity, never negative. */
export const cartIdleMinutes = (cart: Pick<AbandonedCart, "lastActivityAt">, now: number | Date): number =>
  Math.max(0, Math.floor((new Date(now).getTime() - new Date(cart.lastActivityAt).getTime()) / MINUTE));

export function recoveryStatus(cart: AbandonedCart, now: number | Date, rules: RecoveryRules = {}): RecoveryStatus {
  const r = { ...DEFAULTS, ...rules };
  if (cart.recoveredOrderId) return "recovered";
  if (cartIdleMinutes(cart, now) >= r.lostAfterDays * 24 * 60) return "lost";
  if (!cart.customer?.email) return "no-email";
  return cart.emailsSent > 0 ? "emailed" : "new";
}

export type RecoveryBlock = "recovered" | "lost" | "no-email" | "too-soon" | "cooldown" | "limit";

/** Whether another recovery email may go out now, and if not, why. `waitMinutes` says how long a cooldown has left. */
export function canSendRecovery(cart: AbandonedCart, now: number | Date, rules: RecoveryRules = {}): { ok: boolean; reason?: RecoveryBlock; waitMinutes?: number } {
  const r = { ...DEFAULTS, ...rules };
  const status = recoveryStatus(cart, now, rules);
  if (status === "recovered" || status === "lost" || status === "no-email") return { ok: false, reason: status };
  const idle = cartIdleMinutes(cart, now);
  if (idle < r.minIdleMinutes) return { ok: false, reason: "too-soon", waitMinutes: r.minIdleMinutes - idle };
  if (cart.emailsSent >= r.maxEmails) return { ok: false, reason: "limit" };
  if (cart.lastEmailAt) {
    const since = Math.floor((new Date(now).getTime() - new Date(cart.lastEmailAt).getTime()) / MINUTE);
    const wait = r.cooldownHours * 60 - since;
    if (wait > 0) return { ok: false, reason: "cooldown", waitMinutes: wait };
  }
  return { ok: true };
}

export interface RecoveryStats {
  carts: number;
  /** Value of carts that could still come back (new or emailed), minor units. */
  atRisk: number;
  recovered: number;
  recoveredValue: number;
  lost: number;
  /** Recovered share of carts that were emailed or recovered, in basis points (2500 = 25%). */
  rateBps: number;
}

export function recoveryStats(carts: readonly AbandonedCart[], now: number | Date, rules: RecoveryRules = {}): RecoveryStats {
  const stats: RecoveryStats = { carts: carts.length, atRisk: 0, recovered: 0, recoveredValue: 0, lost: 0, rateBps: 0 };
  let emailedOrRecovered = 0;
  for (const cart of carts) {
    const status = recoveryStatus(cart, now, rules);
    if (status === "recovered") {
      stats.recovered += 1;
      stats.recoveredValue += cartValue(cart);
      emailedOrRecovered += 1;
    } else if (status === "lost") stats.lost += 1;
    else {
      stats.atRisk += cartValue(cart);
      if (status === "emailed") emailedOrRecovered += 1;
    }
  }
  stats.rateBps = emailedOrRecovered ? Math.round((stats.recovered * 10000) / emailedOrRecovered) : 0;
  return stats;
}

/** A recovery discount: `percent` of the cart value, rounded down, capped at `cap` when given. */
export function recoveryDiscount(value: number, percent: number, cap?: number): number {
  const off = Math.floor((Math.max(value, 0) * Math.min(Math.max(percent, 0), 100)) / 100);
  return cap !== undefined ? Math.min(off, cap) : off;
}

/** Whether "mark fulfilled" can do anything for this order: something is outstanding and the order is not blocked. */
export const canMarkFulfilled = (order: CommerceOrder) => planFulfilment(order, { picks: outstandingPicks(order.lines) }).ok;
