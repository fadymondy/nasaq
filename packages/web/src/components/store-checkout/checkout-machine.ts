/*
 * The checkout state machine, as pure functions: which section is open, which are done, what is wrong, and the
 * editing / submitting / failed / placed status of the order. Also payment availability, the payable total with
 * fees, delivery ETAs and the order a completed checkout produces. Money is integer minor units. No React, so it
 * runs under node --test. The component only renders this state and dispatches events.
 */
import { commerceCheckoutSummary, commerceDeliveryWindow } from "../../lib/commerce";
import type { CommerceAddress, CommerceCartLine, CommerceCheckoutSummary, CommerceCheckoutSummaryInput, CommerceMoney, CommerceOrder, CommercePaymentKind, CommercePaymentPolicy, CommerceShippingMethod } from "../../lib/commerce";
import { type AddressErrors, isValidEmail, normalizeAddress, validateStoreAddress } from "./address-rules";

export type CheckoutSection = "contact" | "address" | "delivery" | "payment";
export const CHECKOUT_SECTIONS: readonly CheckoutSection[] = ["contact", "address", "delivery", "payment"];

export type CheckoutPaymentKind = CommercePaymentKind;
export const CHECKOUT_PAYMENT_KINDS: readonly CheckoutPaymentKind[] = ["card", "cod", "local", "wallet"];

export interface CheckoutContact {
  /** "guest" checks out with an email; "account" is a signed-in shopper. */
  mode: "guest" | "account";
  email: string;
  /** Opted in to news and offers. */
  marketing?: boolean;
}

export interface CheckoutGift {
  enabled: boolean;
  message: string;
  wrap: boolean;
  /** Leave prices off the packing slip. */
  hidePrices: boolean;
}

export interface CheckoutPayment {
  kind?: CheckoutPaymentKind;
  /** The local method picked (InstaPay, a wallet number...). */
  localMethodId?: string;
  /** Reference of a local payment already sent. */
  localReference?: string;
}

export interface CheckoutData {
  contact: CheckoutContact;
  shipping: Partial<CommerceAddress>;
  /** The saved address chosen in the picker; undefined when typing a new one. */
  savedAddressId?: string;
  billingSame: boolean;
  billing: Partial<CommerceAddress>;
  shippingMethodId?: string;
  payment: CheckoutPayment;
  notes: string;
  gift: CheckoutGift;
}

export const NOTES_MAX = 500;
export const GIFT_MESSAGE_MAX = 200;

export function emptyCheckoutData(patch: Partial<CheckoutData> = {}): CheckoutData {
  return {
    contact: { mode: "guest", email: "", marketing: false },
    shipping: { country: "EG" },
    billingSame: true,
    billing: { country: "EG" },
    payment: {},
    notes: "",
    gift: { enabled: false, message: "", wrap: false, hidePrices: true },
    ...patch,
  };
}

/** Errors are keyed "section.field" ("contact.email", "shipping.postalCode", "billing.city", "payment.kind") and hold a code. */
export type CheckoutErrors = Record<string, string>;

export type CheckoutStatus = "editing" | "submitting" | "failed" | "placed";

export interface CheckoutState {
  status: CheckoutStatus;
  data: CheckoutData;
  /** The section that is open. */
  section: CheckoutSection;
  /** Sections the shopper finished and that are still valid. */
  done: readonly CheckoutSection[];
  errors: CheckoutErrors;
  /** Why placing the order failed. */
  failure?: string;
  /** How many times "place order" was sent. */
  attempts: number;
  orderNumber?: string;
}

/** What the machine needs to know about the store and the shopper; recompute it on each render and pass it in. */
export interface CheckoutContext {
  /** Shipping methods on offer. */
  shippingMethodIds: readonly string[];
  /** Whether the shopper is signed in (needed for contact mode "account"). */
  signedIn?: boolean;
  /** The card fields are complete and valid. */
  cardValid?: boolean;
  /** A local payment method was chosen and its reference sent. */
  localReady?: boolean;
  /** Which payment kinds can be used for this order. */
  paymentAvailable: Partial<Record<CheckoutPaymentKind, boolean>>;
}

export function initialCheckout(data: CheckoutData = emptyCheckoutData(), section: CheckoutSection = "contact"): CheckoutState {
  return { status: "editing", data, section, done: [], errors: {}, attempts: 0 };
}

/* ------------------------------------------------------------------ validation */

const prefixed = (prefix: string, errors: AddressErrors): CheckoutErrors => Object.fromEntries(Object.entries(errors).map(([k, v]) => [`${prefix}.${k}`, v as string]));

export function validateSection(section: CheckoutSection, data: CheckoutData, ctx: CheckoutContext): CheckoutErrors {
  switch (section) {
    case "contact": {
      if (data.contact.mode === "account") return ctx.signedIn ? {} : { "contact.account": "signIn" };
      const email = data.contact.email.trim();
      return !email ? { "contact.email": "required" } : isValidEmail(email) ? {} : { "contact.email": "email" };
    }
    case "address": {
      const errors = prefixed("shipping", validateStoreAddress(data.shipping));
      // A billing address has no phone of its own.
      if (!data.billingSame) Object.assign(errors, prefixed("billing", validateStoreAddress(data.billing, { skip: ["phone"] })));
      return errors;
    }
    case "delivery": {
      const errors: CheckoutErrors = {};
      if (!data.shippingMethodId) errors["delivery.method"] = "required";
      else if (!ctx.shippingMethodIds.includes(data.shippingMethodId)) errors["delivery.method"] = "unavailable";
      if (data.gift.enabled && data.gift.message.length > GIFT_MESSAGE_MAX) errors["gift.message"] = "tooLong";
      if (data.notes.length > NOTES_MAX) errors["notes"] = "tooLong";
      return errors;
    }
    case "payment": {
      const kind = data.payment.kind;
      if (!kind) return { "payment.kind": "required" };
      if (!ctx.paymentAvailable[kind]) return { "payment.kind": "unavailable" };
      if (kind === "card" && !ctx.cardValid) return { "payment.card": "invalid" };
      if (kind === "local" && !ctx.localReady) return { "payment.local": "required" };
      return {};
    }
  }
}

/** Every section's problems together. */
export function validateCheckout(data: CheckoutData, ctx: CheckoutContext): CheckoutErrors {
  return CHECKOUT_SECTIONS.reduce<CheckoutErrors>((all, s) => Object.assign(all, validateSection(s, data, ctx)), {});
}

/** The first section that has a problem, if any. */
export function firstInvalidSection(data: CheckoutData, ctx: CheckoutContext): CheckoutSection | undefined {
  return CHECKOUT_SECTIONS.find((s) => Object.keys(validateSection(s, data, ctx)).length > 0);
}

export const canPlaceOrder = (state: CheckoutState, ctx: CheckoutContext): boolean =>
  (state.status === "editing" || state.status === "failed") && firstInvalidSection(state.data, ctx) === undefined;

/* ------------------------------------------------------------------ reducer */

export type CheckoutEvent =
  /** Merge changes into the data. */
  | { type: "update"; patch: Partial<CheckoutData> }
  /** Open a section. Only finished sections and the next unfinished one can be opened. */
  | { type: "open"; section: CheckoutSection }
  /** "Continue": validate the open section, mark it done and open the next one. */
  | { type: "continue" }
  /** "Place order": validate everything; on success the status becomes "submitting". */
  | { type: "submit" }
  | { type: "succeeded"; orderNumber: string }
  | { type: "failed"; reason: string }
  /** Close the failure message and go back to editing. */
  | { type: "dismiss" };

/** The first section not done yet, or the last section when all are. */
export function nextOpenSection(done: readonly CheckoutSection[]): CheckoutSection {
  return CHECKOUT_SECTIONS.find((s) => !done.includes(s)) ?? "payment";
}

export function checkoutReduce(state: CheckoutState, event: CheckoutEvent, ctx: CheckoutContext): CheckoutState {
  // Nothing edits an order that is being sent or is already placed.
  if (state.status === "placed") return state;
  if (state.status === "submitting" && event.type !== "succeeded" && event.type !== "failed") return state;

  switch (event.type) {
    case "update": {
      const data: CheckoutData = { ...state.data, ...event.patch };
      // A finished section that no longer holds up is reopened; errors that are fixed disappear.
      const done = state.done.filter((s) => Object.keys(validateSection(s, data, ctx)).length === 0);
      const live = validateCheckout(data, ctx);
      const errors = Object.fromEntries(Object.entries(state.errors).filter(([key]) => key in live));
      return { ...state, data, done, errors, status: state.status === "failed" ? "editing" : state.status };
    }
    case "open": {
      const limit = CHECKOUT_SECTIONS.indexOf(nextOpenSection(state.done));
      if (CHECKOUT_SECTIONS.indexOf(event.section) > limit) return state;
      return { ...state, section: event.section };
    }
    case "continue": {
      const found = validateSection(state.section, state.data, ctx);
      if (Object.keys(found).length) return { ...state, errors: { ...withoutSection(state.errors, state.section), ...found } };
      const done = state.done.includes(state.section) ? state.done : [...state.done, state.section];
      const last = state.section === "payment";
      return { ...state, done, errors: withoutSection(state.errors, state.section), section: last ? state.section : nextOpenSection(done) };
    }
    case "submit": {
      if (state.status === "submitting") return state;
      const errors = validateCheckout(state.data, ctx);
      const bad = firstInvalidSection(state.data, ctx);
      if (bad) return { ...state, errors, section: bad, done: state.done.filter((s) => s !== bad && Object.keys(validateSection(s, state.data, ctx)).length === 0) };
      return { ...state, errors: {}, done: [...CHECKOUT_SECTIONS], status: "submitting", attempts: state.attempts + 1, failure: undefined };
    }
    case "succeeded":
      return { ...state, status: "placed", orderNumber: event.orderNumber, failure: undefined };
    case "failed":
      return { ...state, status: "failed", failure: event.reason };
    case "dismiss":
      return state.status === "failed" ? { ...state, status: "editing", failure: undefined } : state;
  }
}

function withoutSection(errors: CheckoutErrors, section: CheckoutSection): CheckoutErrors {
  const prefixes: Record<CheckoutSection, string[]> = { contact: ["contact."], address: ["shipping.", "billing."], delivery: ["delivery.", "gift.", "notes"], payment: ["payment."] };
  return Object.fromEntries(Object.entries(errors).filter(([key]) => !prefixes[section].some((p) => key.startsWith(p))));
}

/* ------------------------------------------------------------------ payment availability and totals */

/** What the store offers for payment. Promoted to the shared model as `CommercePaymentPolicy`. */
export type PaymentPolicy = CommercePaymentPolicy;

export type PaymentUnavailable = "not-offered" | "cod-limit" | "cod-country" | "wallet-balance" | "local-limit";

export interface PaymentAvailability {
  available: boolean;
  reason?: PaymentUnavailable;
  /** For "cod-limit" and "wallet-balance": the limit or the shortfall, minor units. */
  amount?: number;
}

/** Which payment kinds the shopper can use for an order of `total` shipped to `country`. `total` is before the COD fee. */
export function paymentAvailability(policy: PaymentPolicy, { total, country }: { total: CommerceMoney; country: string }): Record<CheckoutPaymentKind, PaymentAvailability> {
  const ok: PaymentAvailability = { available: true };
  const no = (reason: PaymentUnavailable, amount?: number): PaymentAvailability => ({ available: false, reason, ...(amount !== undefined ? { amount } : {}) });
  const cod = policy.cod;
  const codResult = !cod
    ? no("not-offered")
    : cod.countries && !cod.countries.includes(country.toUpperCase())
      ? no("cod-country")
      : cod.maxTotal !== undefined && total > cod.maxTotal
        ? no("cod-limit", cod.maxTotal)
        : ok;
  const local = policy.local ?? [];
  const localOk = local.filter((m) => (m.min === undefined || total >= m.min) && (m.max === undefined || total <= m.max));
  return {
    card: policy.card === false ? no("not-offered") : ok,
    cod: codResult,
    wallet: !policy.wallet ? no("not-offered") : policy.wallet.balance < total ? no("wallet-balance", total - policy.wallet.balance) : ok,
    local: !local.length ? no("not-offered") : localOk.length ? ok : no("local-limit"),
  };
}

export type CheckoutSummaryInput = CommerceCheckoutSummaryInput;

/** Order totals with the COD and gift-wrap fees. Promoted to the shared model as `CommerceCheckoutSummary`. */
export type CheckoutSummary = CommerceCheckoutSummary;

/** The order totals: `commerceTotals` plus the COD and gift-wrap fees. Promoted to the shared model as `commerceCheckoutSummary`. */
export const checkoutSummary = commerceCheckoutSummary;

/* ------------------------------------------------------------------ delivery ETA */

/**
 * The dates a delivery of `etaDays` [min, max] days lands, counted from `from` in UTC calendar days. `weekend` lists
 * day numbers (0 Sunday to 6 Saturday) that do not count, e.g. `[5, 6]` in Egypt.
 */
export function etaWindow(etaDays: readonly [number, number], from: Date, weekend: readonly number[] = []): { start: Date; end: Date } {
  // Same calendar maths as the shared `commerceDeliveryWindow` (which also takes a cut-off hour and returns ISO dates).
  const w = commerceDeliveryWindow(from, etaDays, { skipWeekdays: weekend });
  return { start: new Date(`${w.from}T00:00:00Z`), end: new Date(`${w.to}T00:00:00Z`) };
}

/* ------------------------------------------------------------------ the order a finished checkout makes */

export interface BuildOrderInput {
  data: CheckoutData;
  lines: readonly CommerceCartLine[];
  summary: CheckoutSummary;
  shippingMethod?: CommerceShippingMethod;
  number: string;
  now: Date;
  customerName?: string;
}

/** Turns a validated checkout into a `CommerceOrder` (pending, or "cod" payment for cash on delivery). The host normally builds this on the server; the lab uses it. */
export function buildOrder({ data, lines, summary, shippingMethod, number, now, customerName }: BuildOrderInput): CommerceOrder {
  const shipping = normalizeAddress(data.shipping) as CommerceAddress;
  const billing = data.billingSame ? shipping : (normalizeAddress(data.billing) as CommerceAddress);
  const kind = data.payment.kind;
  const notes = [data.notes.trim(), data.gift.enabled && data.gift.message.trim() ? `Gift: ${data.gift.message.trim()}` : ""].filter(Boolean).join("\n");
  return {
    id: `ord-${number.replace(/\D/g, "")}`,
    number,
    placedAt: now.toISOString(),
    status: "pending",
    payment: kind === "cod" ? "cod" : kind === "card" ? "paid" : "pending",
    customer: { name: customerName ?? shipping.name, email: data.contact.email.trim(), ...(shipping.phone ? { phone: shipping.phone } : {}) },
    lines: lines.filter((l) => !l.savedForLater).map((l) => ({ ...l })),
    shippingAddress: shipping,
    billingAddress: billing,
    ...(shippingMethod ? { shippingMethod } : {}),
    totals: {
      subtotal: summary.subtotal,
      discount: summary.discount,
      shipping: summary.shipping,
      tax: summary.tax,
      total: summary.payable,
      itemCount: summary.itemCount,
      savings: summary.savings,
    },
    ...(notes ? { notes } : {}),
    events: [{ at: now.toISOString(), kind: "placed", label: "Order placed" }],
  };
}
