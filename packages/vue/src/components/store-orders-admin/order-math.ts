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
import type { CommerceFulfilmentState, CommerceLinePick, CommerceOrder, CommerceOrderStatus, CommercePaymentStatus, CommerceRefundRecord } from "./order-types";

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
