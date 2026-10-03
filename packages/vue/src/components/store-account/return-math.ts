/*
 * Return (RMA) maths for the customer account: what can be sent back, the refund it is worth, whether the return
 * window is open, and the return request's status flow. Pure, integer minor units, no framework.
 */
import { COMMERCE_RETURN_REASONS, COMMERCE_RMA_FLOW, type CommerceOrder, type CommerceRefundMethod, type CommerceReturnReason, type CommerceReturnRequest, type CommerceRmaStatus, type LinePick, linePaidValues, lineRefunded, lineReturnable, unitsValue } from "./commerce";

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
