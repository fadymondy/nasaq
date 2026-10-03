/*
 * The order status timeline model, shared by the customer's tracking view and the admin activity log.
 * Pure: takes an order status and events, returns steps. Copy of the React model.
 */
import type { CommerceOrderEvent, CommerceOrderStatus, CommercePaymentStatus } from "./order-labels";

export const TRACKING_STEPS = ["placed", "paid", "shipped", "out-for-delivery", "delivered"] as const;
export type TrackingStepKey = (typeof TRACKING_STEPS)[number];

export type TrackingStepState = "done" | "current" | "upcoming" | "skipped";

export interface TrackingStep {
  key: TrackingStepKey;
  state: TrackingStepState;
  /** ISO time the step happened, when the events say so. */
  at?: string;
}

export type TrackingTerminal = "cancelled" | "refunded" | "returned" | "partially-refunded";

export interface TrackingModel {
  steps: TrackingStep[];
  /** Index in TRACKING_STEPS of the furthest step reached. */
  reached: number;
  /** Set when the order ended some other way than delivery, or was refunded after it. */
  terminal?: { kind: TrackingTerminal; at?: string };
  /** True while some, not all, of the order has shipped. */
  partial: boolean;
  /** Share of the journey done, 0..100, whole percent. */
  percent: number;
}

export interface TrackingInput {
  status: CommerceOrderStatus;
  payment?: CommercePaymentStatus;
  placedAt?: string;
  events?: readonly CommerceOrderEvent[];
  /** A carrier tracking number was given, so it has shipped even if the status was set by hand. */
  hasTracking?: boolean;
}

/** Event kind → the step it stands for. */
const KIND_STEP: Record<string, TrackingStepKey> = {
  placed: "placed",
  paid: "paid",
  payment: "paid",
  confirmed: "paid",
  fulfilled: "shipped",
  shipped: "shipped",
  "out-for-delivery": "out-for-delivery",
  delivered: "delivered",
};

const STATUS_STEP: Partial<Record<CommerceOrderStatus, number>> = {
  pending: 0,
  paid: 1,
  processing: 1,
  "partially-fulfilled": 1,
  fulfilled: 2,
  shipped: 2,
  "out-for-delivery": 3,
  delivered: 4,
};

const TERMINAL: readonly CommerceOrderStatus[] = ["cancelled", "refunded", "returned", "partially-refunded"];

/** Newest first, stable for equal times. Does not change the input. */
export function sortEventsNewestFirst<T extends { at: string }>(events: readonly T[]): T[] {
  return events
    .map((e, i) => [e, i] as const)
    .sort((a, b) => (a[0].at < b[0].at ? 1 : a[0].at > b[0].at ? -1 : b[1] - a[1]))
    .map(([e]) => e);
}

/** The step reached and when each step happened. */
export function trackingModel(input: TrackingInput): TrackingModel {
  const stamps = new Map<TrackingStepKey, string>();
  let evidence = -1;
  for (const event of input.events ?? []) {
    const key = KIND_STEP[event.kind];
    if (!key) continue;
    const index = TRACKING_STEPS.indexOf(key);
    evidence = Math.max(evidence, index);
    const seen = stamps.get(key);
    if (!seen || event.at < seen) stamps.set(key, event.at);
  }
  if (input.placedAt && !stamps.has("placed")) stamps.set("placed", input.placedAt);

  const ended = TERMINAL.includes(input.status);
  let reached: number;
  if (ended) reached = Math.max(evidence, input.hasTracking ? 2 : -1, input.status === "cancelled" ? 0 : 1);
  else reached = STATUS_STEP[input.status] ?? 0;
  // Cash on delivery has no payment to wait for: an order that is confirmed counts as paid.
  if (!ended && input.payment === "cod" && reached === 0 && input.status !== "pending") reached = 1;

  const terminalKind = ended ? (input.status as TrackingTerminal) : undefined;
  const cancelled = terminalKind === "cancelled";
  const steps: TrackingStep[] = TRACKING_STEPS.map((key, i) => {
    const at = stamps.get(key);
    let state: TrackingStepState;
    if (i < reached) state = "done";
    else if (i === reached) state = ended || i === TRACKING_STEPS.length - 1 ? "done" : "current";
    else state = cancelled ? "skipped" : "upcoming";
    return { key, state, ...(at ? { at } : {}) };
  });

  const terminalEvent = terminalKind ? [...(input.events ?? [])].reverse().find((e) => e.kind === terminalKind || (terminalKind === "returned" && e.kind === "refund") || (terminalKind === "partially-refunded" && e.kind === "refund")) : undefined;
  const partial = !ended && input.status === "partially-fulfilled";
  const done = steps.filter((s) => s.state === "done").length;
  const current = steps.some((s) => s.state === "current") ? 0.5 : 0;
  return {
    steps,
    reached,
    ...(terminalKind ? { terminal: { kind: terminalKind, ...(terminalEvent ? { at: terminalEvent.at } : {}) } } : {}),
    partial,
    percent: Math.round(((done + current) / TRACKING_STEPS.length) * 100),
  };
}

/** The label of a carrier's tracking page, or a link built from a URL template with `{number}` in it. */
export function trackingUrl(tracking: { number: string; url?: string } | undefined, template?: string): string | undefined {
  if (!tracking) return undefined;
  if (tracking.url) return tracking.url;
  return template ? template.replace("{number}", encodeURIComponent(tracking.number)) : undefined;
}

export type StoreActivityKind = "placed" | "payment" | "shipment" | "delivery" | "refund" | "cancel" | "note" | "other";

/** Groups the free-form event kinds into the few the log draws an icon for. */
export function activityKind(kind: string): StoreActivityKind {
  if (kind === "placed") return "placed";
  if (kind === "paid" || kind === "payment" || kind === "confirmed") return "payment";
  if (kind === "shipped" || kind === "fulfilled" || kind === "out-for-delivery") return "shipment";
  if (kind === "delivered") return "delivery";
  if (kind === "refund" || kind === "refunded" || kind === "returned" || kind === "return") return "refund";
  if (kind === "cancelled" || kind === "cancel") return "cancel";
  if (kind === "note") return "note";
  return "other";
}
