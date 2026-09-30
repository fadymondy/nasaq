/*
 * Gift cards: a ledger of signed amounts, the balance it adds up to, redeeming at checkout, and codes.
 * Pure: no React, no runtime imports. Money is integer minor units. The balance is never stored, it is the ledger's sum.
 */
import type { CommerceGiftCard, CommerceGiftCardEntry, CommerceGiftCardEntryKind, CommerceGiftCardStatus } from "../../lib/commerce";

/* The ledger shapes live in the shared model (lib/commerce.ts). */
export type GiftCardEntryKind = CommerceGiftCardEntryKind;
export type GiftCardEntry = CommerceGiftCardEntry;
export type GiftCard = CommerceGiftCard;
export type GiftCardStatus = CommerceGiftCardStatus;

const time = (v: string | number | Date) => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

export function isExpired(card: Pick<GiftCard, "expiresAt">, now: string | number | Date): boolean {
  return card.expiresAt !== undefined && time(now) > time(card.expiresAt);
}

/** What the ledger adds up to. Entries after `now` are not counted, so a future-dated entry does not change today's balance. */
export function ledgerBalance(ledger: readonly GiftCardEntry[], now?: string | number | Date): number {
  const t = now === undefined ? Infinity : time(now);
  return ledger.reduce((s, e) => (time(e.at) <= t ? s + e.amount : s), 0);
}

/** Money the customer can spend now: the balance, or nothing when the card is off or expired. */
export function giftCardBalance(card: GiftCard, now: string | number | Date): number {
  if (card.disabled || isExpired(card, now)) return 0;
  return Math.max(0, ledgerBalance(card.ledger, now));
}

export function giftCardStatus(card: GiftCard, now: string | number | Date): GiftCardStatus {
  if (card.disabled) return "disabled";
  if (isExpired(card, now)) return "expired";
  return ledgerBalance(card.ledger, now) > 0 ? "active" : "depleted";
}

/** The amount the card was issued for. */
export function initialValue(card: GiftCard): number {
  return card.ledger.filter((e) => e.kind === "issue").reduce((s, e) => s + e.amount, 0);
}

export type GiftCardError = "not-found" | "disabled" | "expired" | "empty" | "currency" | "invalid-amount" | "over-balance";

export type RedeemResult = { ok: true; card: GiftCard; redeemed: number; balance: number } | { ok: false; error: GiftCardError };

let seq = 0;
const entryId = (card: GiftCard) => `${card.id}-e${card.ledger.length + 1}-${(seq += 1).toString(36)}`;

/**
 * Takes money off a card. Asks for more than the balance and it takes the balance (`redeemed` says how much),
 * unless `exact` is set, which refuses instead.
 */
export function redeemGiftCard(card: GiftCard, amount: number, opts: { now: string | number | Date; currency?: string; orderId?: string; exact?: boolean; by?: string; makeId?: () => string }): RedeemResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "invalid-amount" };
  if (opts.currency && opts.currency !== card.currency) return { ok: false, error: "currency" };
  if (card.disabled) return { ok: false, error: "disabled" };
  if (isExpired(card, opts.now)) return { ok: false, error: "expired" };
  const balance = giftCardBalance(card, opts.now);
  if (balance <= 0) return { ok: false, error: "empty" };
  if (opts.exact && amount > balance) return { ok: false, error: "over-balance" };
  const redeemed = Math.min(amount, balance);
  const at = new Date(time(opts.now)).toISOString();
  const entry: GiftCardEntry = { id: opts.makeId ? opts.makeId() : entryId(card), kind: "redeem", amount: -redeemed, at, ...(opts.orderId ? { orderId: opts.orderId } : {}), ...(opts.by ? { by: opts.by } : {}) };
  const next = { ...card, ledger: [...card.ledger, entry] };
  return { ok: true, card: next, redeemed, balance: balance - redeemed };
}

/** Puts money back, for a cancelled or returned order. Never more than was redeemed against that order (or in total). */
export function refundToGiftCard(card: GiftCard, amount: number, opts: { now: string | number | Date; orderId?: string; note?: string; makeId?: () => string }): RedeemResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, error: "invalid-amount" };
  const redeemedFor = (id?: string) => -card.ledger.filter((e) => e.kind === "redeem" && (id === undefined || e.orderId === id)).reduce((s, e) => s + e.amount, 0);
  const refundedFor = (id?: string) => card.ledger.filter((e) => e.kind === "refund" && (id === undefined || e.orderId === id)).reduce((s, e) => s + e.amount, 0);
  const room = redeemedFor(opts.orderId) - refundedFor(opts.orderId);
  if (amount > room) return { ok: false, error: "over-balance" };
  const at = new Date(time(opts.now)).toISOString();
  const entry: GiftCardEntry = { id: opts.makeId ? opts.makeId() : entryId(card), kind: "refund", amount, at, ...(opts.orderId ? { orderId: opts.orderId } : {}), ...(opts.note ? { note: opts.note } : {}) };
  const next = { ...card, ledger: [...card.ledger, entry] };
  return { ok: true, card: next, redeemed: -amount, balance: giftCardBalance(next, opts.now) };
}

/** Adds or removes money by hand. Cannot take the balance below zero. */
export function adjustGiftCard(card: GiftCard, delta: number, opts: { now: string | number | Date; note?: string; by?: string; makeId?: () => string }): RedeemResult {
  if (!Number.isInteger(delta) || delta === 0) return { ok: false, error: "invalid-amount" };
  const bal = ledgerBalance(card.ledger, opts.now);
  if (bal + delta < 0) return { ok: false, error: "over-balance" };
  const at = new Date(time(opts.now)).toISOString();
  const entry: GiftCardEntry = { id: opts.makeId ? opts.makeId() : entryId(card), kind: "adjust", amount: delta, at, ...(opts.note ? { note: opts.note } : {}), ...(opts.by ? { by: opts.by } : {}) };
  const next = { ...card, ledger: [...card.ledger, entry] };
  return { ok: true, card: next, redeemed: 0, balance: giftCardBalance(next, opts.now) };
}

export interface IssueGiftCardInput {
  id: string;
  code: string;
  amount: number;
  currency: string;
  now: string | number | Date;
  expiresAt?: string;
  recipient?: GiftCard["recipient"];
  by?: string;
  note?: string;
}

export function issueGiftCard(input: IssueGiftCardInput): GiftCard | { error: GiftCardError } {
  if (!Number.isInteger(input.amount) || input.amount <= 0) return { error: "invalid-amount" };
  return {
    id: input.id,
    code: normalizeGiftCardCode(input.code),
    currency: input.currency,
    ...(input.expiresAt ? { expiresAt: input.expiresAt } : {}),
    ...(input.recipient ? { recipient: input.recipient } : {}),
    ledger: [{ id: `${input.id}-e1`, kind: "issue", amount: input.amount, at: new Date(time(input.now)).toISOString(), ...(input.by ? { by: input.by } : {}), ...(input.note ? { note: input.note } : {}) }],
  };
}

export interface GiftCardApplication {
  cardId: string;
  code: string;
  amount: number;
}

/**
 * Spreads a total over several cards. The card that expires soonest is spent first, then the smaller balance
 * (so small leftovers clear out), then the code. Cards that cannot be used are skipped. Never spends more than `total`.
 */
export function applyGiftCards(cards: readonly GiftCard[], total: number, opts: { now: string | number | Date; currency?: string }): { applied: GiftCardApplication[]; covered: number; remaining: number } {
  let remaining = Math.max(0, total);
  const applied: GiftCardApplication[] = [];
  const usable = cards
    .filter((c) => !(opts.currency && c.currency !== opts.currency) && giftCardBalance(c, opts.now) > 0)
    .sort((a, b) => (a.expiresAt ? time(a.expiresAt) : Infinity) - (b.expiresAt ? time(b.expiresAt) : Infinity) || giftCardBalance(a, opts.now) - giftCardBalance(b, opts.now) || a.code.localeCompare(b.code));
  for (const c of usable) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, giftCardBalance(c, opts.now));
    applied.push({ cardId: c.id, code: c.code, amount: take });
    remaining -= take;
  }
  return { applied, covered: Math.max(0, total) - remaining, remaining };
}

/* ------------------------------------------------------------------ codes */

/** No 0/O, 1/I/L or U, so a code read aloud or off a screenshot is not misread. 30 characters. */
export const GIFT_CARD_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const GROUP = 4;
const GROUPS = 4;

/** Check character over the body: catches a typo before the server is asked. */
export function checkChar(body: string): string {
  let sum = 0;
  for (let i = 0; i < body.length; i += 1) {
    const v = GIFT_CARD_ALPHABET.indexOf(body[i] as string);
    sum += (v < 0 ? 0 : v) * (i + 1);
  }
  return GIFT_CARD_ALPHABET[sum % GIFT_CARD_ALPHABET.length] as string;
}

/** Upper-case, strip separators, and read the look-alikes the way they were meant (O as 0 is not in the alphabet, so O becomes nothing to fix: it stays). */
export function normalizeGiftCardCode(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/(.{4})(?=.)/g, "$1-");
}

const bodyOf = (code: string) => code.replace(/-/g, "");

/** Generates a code like `K7QM-2XRD-9TWB-4HC6`, the last character being the check. `random` returns [0, 1). */
export function generateGiftCardCode(random: () => number = Math.random): string {
  const len = GROUP * GROUPS - 1;
  let body = "";
  for (let i = 0; i < len; i += 1) body += GIFT_CARD_ALPHABET[Math.min(GIFT_CARD_ALPHABET.length - 1, Math.floor(random() * GIFT_CARD_ALPHABET.length))];
  return normalizeGiftCardCode(body + checkChar(body));
}

/** True when the code has the right shape, alphabet and check character. */
export function isValidGiftCardCode(code: string): boolean {
  const flat = bodyOf(normalizeGiftCardCode(code));
  if (flat.length !== GROUP * GROUPS) return false;
  for (const ch of flat) if (!GIFT_CARD_ALPHABET.includes(ch)) return false;
  return checkChar(flat.slice(0, -1)) === flat.slice(-1);
}

/** Shows the last group only: `••••-••••-••••-4HC6`. */
export function maskGiftCardCode(code: string): string {
  const parts = normalizeGiftCardCode(code).split("-");
  return parts.map((p, i) => (i === parts.length - 1 ? p : "•".repeat(p.length))).join("-");
}

/* ------------------------------------------------------------------ integrity */

export type LedgerIssue = "no-issue" | "sign" | "negative-balance" | "duplicate-id" | "out-of-order";

/** Checks a ledger for signs that do not fit the entry kind, a balance that dips below zero, and repeated ids. */
export function ledgerIssues(ledger: readonly GiftCardEntry[]): LedgerIssue[] {
  const issues = new Set<LedgerIssue>();
  if (!ledger.some((e) => e.kind === "issue")) issues.add("no-issue");
  const ids = new Set<string>();
  let bal = 0;
  let last = -Infinity;
  for (const e of ledger) {
    if (ids.has(e.id)) issues.add("duplicate-id");
    ids.add(e.id);
    const positive = e.kind === "issue" || e.kind === "refund";
    const negative = e.kind === "redeem" || e.kind === "expire" || e.kind === "void";
    if ((positive && e.amount <= 0) || (negative && e.amount >= 0) || e.amount === 0) issues.add("sign");
    const t = time(e.at);
    if (t < last) issues.add("out-of-order");
    last = t;
    bal += e.amount;
    if (bal < 0) issues.add("negative-balance");
  }
  return [...issues];
}
