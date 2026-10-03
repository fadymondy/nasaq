/*
 * The discount evaluator: automatic discounts and codes, percentage, fixed, buy X get Y and free shipping, with
 * minimums, customer eligibility, schedules, usage limits, stacking rules and caps.
 * Pure: no React, no runtime imports. Money is integer minor units, percentages are basis points (10000 = 100%).
 * Every share of a discount is rounded once and spread with the largest-remainder method, so line shares always add
 * up to the discount and a discount never takes more than the goods it applies to.
 */
import type { CommerceBuyXGetY, CommerceDiscount, CommerceDiscountClass, CommerceDiscountCustomers, CommerceDiscountKind, CommerceDiscountMethod, CommerceDiscountScope } from "./commerce";

/* The discount definition lives in the shared model (lib/commerce.ts) so the admin, the cart and the API share one shape. */
export type DiscountKind = CommerceDiscountKind;
/** Discounts that share a class compete for the same money; a class decides who may combine with whom. */
export type DiscountClass = CommerceDiscountClass;
export type DiscountMethod = CommerceDiscountMethod;
export type DiscountScope = CommerceDiscountScope;
export type BuyXGetY = CommerceBuyXGetY;
export type DiscountCustomers = CommerceDiscountCustomers;
export type Discount = CommerceDiscount;

export interface DiscountLine {
  id: string;
  productId: string;
  collectionIds?: string[];
  unitPrice: number;
  quantity: number;
  compareAt?: number;
}

export interface DiscountCustomer {
  id?: string;
  segments?: string[];
  /** Orders placed before this one. Missing counts as 0. */
  ordersCount?: number;
}

export interface DiscountContext {
  lines: readonly DiscountLine[];
  /** The shipping charge the customer picked, before any free-shipping discount. */
  shipping?: number;
  customer?: DiscountCustomer;
  /** Codes the customer typed. Case and spacing do not matter. */
  codes?: readonly string[];
  now: string | number | Date;
  usage?: { total?: Record<string, number>; byCustomer?: Record<string, number> };
}

export type DiscountRejection =
  | "inactive"
  | "not-started"
  | "ended"
  | "limit-total"
  | "limit-customer"
  | "code-required"
  | "customer"
  | "first-order"
  | "min-subtotal"
  | "min-quantity"
  | "no-match"
  | "no-shipping"
  | "no-benefit"
  | "not-combinable";

export interface AppliedDiscount {
  id: string;
  title: string;
  kind: DiscountKind;
  class: DiscountClass;
  /** Goods discounts take this off the goods; free-shipping takes it off shipping. */
  amount: number;
  /** Goods discounts: each line's share. */
  lines: Record<string, number>;
  /** Buy X get Y: how many times the offer ran and how many units were discounted. */
  sets?: number;
  freeUnits?: number;
  /** The cap cut the amount down. */
  capped?: boolean;
}

export interface RejectedDiscount {
  id: string;
  title: string;
  reason: DiscountRejection;
  /** not-combinable: the discount that won. */
  with?: string;
}

export interface DiscountResult {
  applied: AppliedDiscount[];
  rejected: RejectedDiscount[];
  /** Total taken off each line. */
  lineDiscounts: Record<string, number>;
  subtotal: number;
  /** All goods discounts together. Pass this to `commerceTotals({ discount })`. */
  goodsDiscount: number;
  goodsAfter: number;
  shippingDiscount: number;
  shippingAfter: number;
}

/* ------------------------------------------------------------------ helpers */

export function normalizeDiscountCode(code: string): string {
  return code.replace(/\s+/g, "").toUpperCase();
}

export function discountClass(d: Pick<Discount, "kind" | "scope">): DiscountClass {
  if (d.kind === "free-shipping") return "shipping";
  if (d.kind === "bxgy") return "product";
  const s = d.scope;
  return (s?.productIds?.length ?? 0) > 0 || (s?.collectionIds?.length ?? 0) > 0 ? "product" : "order";
}

/** Whether two discounts may apply together: each must allow the other's class. */
export function canCombine(a: Pick<Discount, "kind" | "scope" | "combinesWith">, b: Pick<Discount, "kind" | "scope" | "combinesWith">): boolean {
  return Boolean(a.combinesWith?.[discountClass(b)]) && Boolean(b.combinesWith?.[discountClass(a)]);
}

/** Adds `bps` of an amount, rounding half up. */
export function percentOf(amount: number, bps: number): number {
  return Math.floor((amount * bps + 5000) / 10000);
}

/**
 * Splits `total` across `weights` in proportion, in whole units, so the parts add up to `total` exactly.
 * The largest fractional remainders get the extra units; ties go to the earlier entry. BigInt keeps big carts exact.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const T = BigInt(total);
  const S = BigInt(sum);
  const parts = weights.map((w) => (T * BigInt(w)) / S);
  const rems = weights.map((w, i) => ({ i, r: (T * BigInt(w)) % S }));
  let left = Number(T - parts.reduce((s, p) => s + p, 0n));
  rems.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  const out = parts.map(Number);
  for (const { i, r } of rems) {
    if (left <= 0) break;
    if (r > 0n) {
      out[i] = (out[i] as number) + 1;
      left -= 1;
    }
  }
  return out;
}

const inScope = (line: DiscountLine, scope: DiscountScope | undefined) => {
  const p = scope?.productIds ?? [];
  const c = scope?.collectionIds ?? [];
  if (p.length === 0 && c.length === 0) return true;
  return p.includes(line.productId) || (line.collectionIds ?? []).some((id) => c.includes(id));
};

const onSale = (l: DiscountLine) => l.compareAt !== undefined && l.compareAt > l.unitPrice;
const lineTotal = (l: DiscountLine) => l.unitPrice * l.quantity;
const time = (v: string | number | Date) => (v instanceof Date ? v.getTime() : typeof v === "number" ? v : Date.parse(v));

/** Lines a percentage or fixed discount looks at. */
function targetLines(d: Discount, lines: readonly DiscountLine[]): DiscountLine[] {
  const scope = discountClass(d) === "order" ? undefined : d.scope;
  return lines.filter((l) => l.quantity > 0 && inScope(l, scope) && !(d.excludeOnSale && onSale(l)));
}

/* ------------------------------------------------------------------ amount of one discount */

interface Computed {
  amount: number;
  lines: Record<string, number>;
  sets?: number;
  freeUnits?: number;
  capped?: boolean;
}

/** What one discount would take off, given what is left on each line. Never more than what is left. */
function compute(d: Discount, ctx: DiscountContext, left: Readonly<Record<string, number>>, shippingLeft: number): Computed {
  if (d.kind === "free-shipping") {
    const cap = d.maxDiscount ?? Infinity;
    const amount = Math.max(0, Math.min(shippingLeft, cap));
    return { amount, lines: {}, capped: amount < shippingLeft };
  }

  if (d.kind === "bxgy") return computeBxgy(d, ctx, left);

  const targets = targetLines(d, ctx.lines);
  const weights = targets.map((l) => left[l.id] ?? 0);
  const base = weights.reduce((s, w) => s + w, 0);
  if (base <= 0) return { amount: 0, lines: {} };
  let raw: number;
  if (d.kind === "percentage") raw = percentOf(base, Math.min(Math.max(d.value ?? 0, 0), 10000));
  else raw = d.perItem ? (d.value ?? 0) * targets.reduce((s, l) => s + l.quantity, 0) : (d.value ?? 0);
  const cap = d.maxDiscount ?? Infinity;
  const amount = Math.max(0, Math.min(raw, base, cap));
  const shares = allocate(amount, weights);
  const lines: Record<string, number> = {};
  targets.forEach((l, i) => {
    if ((shares[i] as number) > 0) lines[l.id] = shares[i] as number;
  });
  return { amount, lines, capped: raw > amount && amount === cap };
}

interface Unit {
  key: string;
  lineId: string;
  price: number;
}

function computeBxgy(d: Discount, ctx: DiscountContext, left: Readonly<Record<string, number>>): Computed {
  const b = d.bxgy;
  if (!b || b.buyQty < 1 || b.getQty < 1) return { amount: 0, lines: {} };
  const eligible = ctx.lines.filter((l) => l.quantity > 0 && !(d.excludeOnSale && onSale(l)));
  const units: Unit[] = eligible.flatMap((l) => Array.from({ length: l.quantity }, (_, k) => ({ key: `${l.id}#${k}`, lineId: l.id, price: l.unitPrice })));
  const lineOf = new Map(eligible.map((l) => [l.id, l]));
  const inSide = (u: Unit, scope: DiscountScope | undefined) => inScope(lineOf.get(u.lineId) as DiscountLine, scope);
  const byPriceDesc = (a: Unit, c: Unit) => c.price - a.price;
  const free: Unit[] = [];
  let sets = 0;
  const maxSets = b.maxSets ?? Infinity;

  if (!b.getScope) {
    const pool = units.filter((u) => inSide(u, b.buyScope)).sort(byPriceDesc);
    sets = Math.min(Math.floor(pool.length / (b.buyQty + b.getQty)), maxSets);
    // Only the units of full sets count, the priciest first; the cheapest of those are the free ones.
    if (sets > 0) {
      const used = pool.slice(0, sets * (b.buyQty + b.getQty));
      free.push(...used.slice(used.length - sets * b.getQty));
    }
  } else {
    const used = new Set<string>();
    const buys = units.filter((u) => inSide(u, b.buyScope)).sort(byPriceDesc);
    const gets = units.filter((u) => inSide(u, b.getScope)).sort((x, y) => x.price - y.price);
    while (sets < maxSets) {
      const buy = buys.filter((u) => !used.has(u.key)).slice(0, b.buyQty);
      if (buy.length < b.buyQty) break;
      const buyKeys = new Set(buy.map((u) => u.key));
      const get = gets.filter((u) => !used.has(u.key) && !buyKeys.has(u.key)).slice(0, b.getQty);
      if (get.length < b.getQty) break;
      for (const u of [...buy, ...get]) used.add(u.key);
      free.push(...get);
      sets += 1;
    }
  }

  if (free.length === 0) return { amount: 0, lines: {}, sets: 0, freeUnits: 0 };
  const bps = Math.min(Math.max(b.getPercentBps ?? 10000, 0), 10000);
  const perLine = new Map<string, number>();
  for (const u of free) perLine.set(u.lineId, (perLine.get(u.lineId) ?? 0) + percentOf(u.price, bps));
  const ids = [...perLine.keys()];
  const clamped = ids.map((id) => Math.min(perLine.get(id) as number, left[id] ?? 0));
  const raw = clamped.reduce((s, v) => s + v, 0);
  const cap = d.maxDiscount ?? Infinity;
  const amount = Math.min(raw, cap);
  const shares = amount === raw ? clamped : allocate(amount, clamped);
  const lines: Record<string, number> = {};
  ids.forEach((id, i) => {
    if ((shares[i] as number) > 0) lines[id] = shares[i] as number;
  });
  return { amount, lines, sets, freeUnits: free.length, capped: amount < raw };
}

/* ------------------------------------------------------------------ eligibility */

/** Why a discount does not apply, before its amount is looked at. Null means it can be tried. */
export function discountRejection(d: Discount, ctx: DiscountContext): DiscountRejection | null {
  const now = time(ctx.now);
  if (d.active === false) return "inactive";
  if (d.startsAt && now < time(d.startsAt)) return "not-started";
  if (d.endsAt && now > time(d.endsAt)) return "ended";
  const lt = d.limits?.total;
  if (lt !== undefined && (ctx.usage?.total?.[d.id] ?? 0) >= lt) return "limit-total";
  const lc = d.limits?.perCustomer;
  const customerId = ctx.customer?.id;
  if (lc !== undefined && customerId && (ctx.usage?.byCustomer?.[`${d.id}:${customerId}`] ?? 0) >= lc) return "limit-customer";
  if (d.method === "code") {
    const want = normalizeDiscountCode(d.code ?? "");
    if (!want || !(ctx.codes ?? []).some((c) => normalizeDiscountCode(c) === want)) return "code-required";
  }
  const cu = d.customers;
  if (cu && cu.mode === "segments" && !(ctx.customer?.segments ?? []).some((s) => cu.segments?.includes(s))) return "customer";
  if (cu && cu.mode === "specific" && !(customerId && cu.customerIds?.includes(customerId))) return "customer";
  if (d.firstOrderOnly && (ctx.customer?.ordersCount ?? 0) > 0) return "first-order";

  const seen =
    d.kind === "free-shipping"
      ? ctx.lines.filter((l) => l.quantity > 0)
      : d.kind === "bxgy"
        ? ctx.lines.filter((l) => l.quantity > 0 && inScope(l, d.bxgy?.buyScope))
        : targetLines(d, ctx.lines);
  if (d.minSubtotal !== undefined && seen.reduce((s, l) => s + lineTotal(l), 0) < d.minSubtotal) return "min-subtotal";
  if (d.minQuantity !== undefined && seen.reduce((s, l) => s + l.quantity, 0) < d.minQuantity) return "min-quantity";
  if (d.kind === "free-shipping" && (ctx.shipping ?? 0) <= 0) return "no-shipping";
  if (seen.length === 0) return "no-match";
  return null;
}

/* ------------------------------------------------------------------ the evaluator */

const CLASS_ORDER: Record<DiscountClass, number> = { product: 0, order: 1, shipping: 2 };

/**
 * Works out which discounts apply to a cart and what each one takes off.
 *
 * 1. Every discount is checked: switched on, in its schedule, under its limits, its code typed, the customer
 *    eligible, the minimums met, something to apply to.
 * 2. The survivors are ranked by what each would take off the untouched cart (then by `priority`, then id).
 * 3. Going down the ranking, a discount is kept only if it can combine with every one already kept
 *    (`canCombine`); otherwise it is rejected as `not-combinable`. The best discount therefore always wins a clash.
 * 4. The kept ones are applied product discounts first, then order discounts on what is left, then shipping.
 *    Each discount is capped by `maxDiscount` and by what is left, and its share of each line is rounded once.
 */
export function evaluateDiscounts(discounts: readonly Discount[], ctx: DiscountContext): DiscountResult {
  const lines = ctx.lines.filter((l) => l.quantity > 0);
  const subtotal = lines.reduce((s, l) => s + lineTotal(l), 0);
  const shipping = Math.max(ctx.shipping ?? 0, 0);
  const fresh: Record<string, number> = Object.fromEntries(lines.map((l) => [l.id, lineTotal(l)]));
  const rejected: RejectedDiscount[] = [];

  const ranked: { d: Discount; benefit: number }[] = [];
  for (const d of discounts) {
    const why = discountRejection(d, { ...ctx, lines });
    if (why) {
      rejected.push({ id: d.id, title: d.title, reason: why });
      continue;
    }
    const benefit = compute(d, { ...ctx, lines }, fresh, shipping).amount;
    if (benefit <= 0) rejected.push({ id: d.id, title: d.title, reason: d.kind === "free-shipping" ? "no-shipping" : "no-benefit" });
    else ranked.push({ d, benefit });
  }
  ranked.sort((a, b) => b.benefit - a.benefit || (b.d.priority ?? 0) - (a.d.priority ?? 0) || a.d.id.localeCompare(b.d.id));

  const kept: Discount[] = [];
  for (const { d } of ranked) {
    const clash = kept.find((k) => !canCombine(k, d));
    if (clash) rejected.push({ id: d.id, title: d.title, reason: "not-combinable", with: clash.id });
    else kept.push(d);
  }

  const order = new Map(ranked.map(({ d }, i) => [d.id, i]));
  kept.sort((a, b) => CLASS_ORDER[discountClass(a)] - CLASS_ORDER[discountClass(b)] || (order.get(a.id) as number) - (order.get(b.id) as number));

  const left = { ...fresh };
  let shippingLeft = shipping;
  const applied: AppliedDiscount[] = [];
  const lineDiscounts: Record<string, number> = {};
  for (const d of kept) {
    const r = compute(d, { ...ctx, lines }, left, shippingLeft);
    if (r.amount <= 0) {
      rejected.push({ id: d.id, title: d.title, reason: "no-benefit" });
      continue;
    }
    if (d.kind === "free-shipping") shippingLeft -= r.amount;
    else
      for (const [id, v] of Object.entries(r.lines)) {
        left[id] = (left[id] as number) - v;
        lineDiscounts[id] = (lineDiscounts[id] ?? 0) + v;
      }
    applied.push({
      id: d.id,
      title: d.title,
      kind: d.kind,
      class: discountClass(d),
      amount: r.amount,
      lines: r.lines,
      ...(r.sets !== undefined ? { sets: r.sets, freeUnits: r.freeUnits ?? 0 } : {}),
      ...(r.capped ? { capped: true } : {}),
    });
  }
  const goodsDiscount = Object.values(lineDiscounts).reduce((s, v) => s + v, 0);
  return { applied, rejected, lineDiscounts, subtotal, goodsDiscount, goodsAfter: subtotal - goodsDiscount, shippingDiscount: shipping - shippingLeft, shippingAfter: shippingLeft };
}

/* ------------------------------------------------------------------ list helpers */

export type DiscountStanding = "live" | "scheduled" | "ended" | "off" | "used-up";

/** Where a discount stands today, for the list. */
export function discountStanding(d: Discount, now: string | number | Date, usedTotal = 0): DiscountStanding {
  const t = time(now);
  if (d.active === false) return "off";
  if (d.endsAt && t > time(d.endsAt)) return "ended";
  if (d.startsAt && t < time(d.startsAt)) return "scheduled";
  if (d.limits?.total !== undefined && usedTotal >= d.limits.total) return "used-up";
  return "live";
}

/** Codes used by more than one active discount, upper-cased. */
export function duplicateDiscountCodes(discounts: readonly Discount[]): string[] {
  const seen = new Map<string, number>();
  for (const d of discounts) {
    if (d.method !== "code" || !d.code) continue;
    const k = normalizeDiscountCode(d.code);
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  return [...seen].filter(([, n]) => n > 1).map(([c]) => c);
}
