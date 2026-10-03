const currencyDecimals = (currency: string) => new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;

/* Cash-drawer and tender maths for the register. Everything is an integer in minor units. */

export type PosPaymentMethod = "cash" | "card" | "wallet";

export interface PosDrawerSale {
  method: PosPaymentMethod;
  /** What the sale came to (not what the customer handed over). */
  total: number;
  /** Set for a refund: the drawer pays it out. */
  refund?: boolean;
  /** What each method actually took for a split sale (change already taken off the cash). When set, `method` is ignored. */
  parts?: readonly { method: PosPaymentMethod; amount: number }[];
}

export interface PosDrawerSummary {
  openingFloat: number;
  cash: number;
  card: number;
  wallet: number;
  sales: number;
  /** What should be in the drawer: the float plus cash taken, minus cash refunded. */
  expectedCash: number;
}

/** The change owed. Never negative. */
export function posChange(due: number, tendered: number): number {
  return Math.max(0, tendered - due);
}

/** What is still to pay. Never negative. */
export function posRemaining(due: number, tendered: number): number {
  return Math.max(0, due - tendered);
}

const NOTES = [5, 10, 20, 50, 100, 200, 500, 1000];

/** The exact amount, then the next banknotes above it, so a cashier taps instead of types. At most `count`, ascending. */
export function posQuickTenders(due: number, currency: string, count = 4): number[] {
  const unit = 10 ** currencyDecimals(currency);
  const out = new Set<number>([due]);
  for (const note of NOTES) {
    const step = note * unit;
    const up = Math.ceil(due / step) * step;
    if (up > due) out.add(up);
    if (out.size >= count + 2) break;
  }
  for (const note of NOTES) {
    const v = note * unit;
    if (v > due) out.add(v);
  }
  return [...out].sort((a, b) => a - b).slice(0, count);
}

/** Sums a session's sales by method and works out the cash that should be in the drawer. */
export function posDrawerSummary(openingFloat: number, sales: readonly PosDrawerSale[]): PosDrawerSummary {
  const s: PosDrawerSummary = { openingFloat, cash: 0, card: 0, wallet: 0, sales: 0, expectedCash: openingFloat };
  for (const sale of sales) {
    if (sale.parts) for (const part of sale.parts) s[part.method] += sale.refund ? -part.amount : part.amount;
    else s[sale.method] += sale.refund ? -sale.total : sale.total;
    s.sales += sale.refund ? 0 : 1;
  }
  s.expectedCash = openingFloat + s.cash;
  return s;
}

/** Counted minus expected: negative is short, positive is over. */
export function posVariance(expected: number, counted: number): number {
  return counted - expected;
}

/* ------------------------------------------------------------------ split payment */

/** One payment towards a sale. `amount` is what the customer handed over for this tender, in minor units. */
export interface PosTender {
  id: string;
  method: PosPaymentMethod;
  amount: number;
}

export interface PosSettlement {
  /** Everything handed over, all methods. */
  paid: number;
  /** What is still to pay. Never negative. */
  remaining: number;
  /** Change owed. Only ever comes out of cash, and only when cash overpays the remainder. */
  change: number;
  /** What each method took, change already taken off the cash. */
  cash: number;
  card: number;
  wallet: number;
  /** False when card and wallet together take more than the sale: they cannot be given change. */
  valid: boolean;
  /** True when the sale is fully paid and valid, so it can be charged. */
  settled: boolean;
}

type TenderLike = Pick<PosTender, "method" | "amount">;

/** A whole number of minor units. A fraction rounds half up, and anything that is not a positive finite number is 0. */
export function posRoundMinor(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.round(amount);
}

/** Works out the remaining balance and the change for a set of tenders against a sale total. */
export function posSettle(due: number, tenders: readonly TenderLike[]): PosSettlement {
  const total = posRoundMinor(due);
  let cashIn = 0;
  let card = 0;
  let wallet = 0;
  for (const t of tenders) {
    const a = posRoundMinor(t.amount);
    if (t.method === "cash") cashIn += a;
    else if (t.method === "card") card += a;
    else wallet += a;
  }
  const paid = cashIn + card + wallet;
  const valid = card + wallet <= total;
  const change = valid ? Math.min(cashIn, Math.max(0, paid - total)) : 0;
  return {
    paid,
    remaining: Math.max(0, total - paid),
    change,
    cash: cashIn - change,
    card,
    wallet,
    valid,
    settled: valid && total > 0 && paid >= total,
  };
}

/** The most a new tender of `method` may be. Cash is unlimited (the overpay comes back as change); card and wallet stop at the remaining amount. */
export function posTenderLimit(due: number, tenders: readonly TenderLike[], method: PosPaymentMethod): number {
  if (method === "cash") return Number.POSITIVE_INFINITY;
  return posSettle(due, tenders).remaining;
}

/** Whether `amount` can be added as another tender of `method`. */
export function posCanAddTender(due: number, tenders: readonly TenderLike[], method: PosPaymentMethod, amount: number): boolean {
  const a = posRoundMinor(amount);
  if (a <= 0) return false;
  if (posSettle(due, tenders).remaining <= 0) return false;
  return a <= posTenderLimit(due, tenders, method);
}

/** What each method took in a sale, for the drawer: change is already off the cash, and empty methods are left out. */
export function posSaleParts(due: number, tenders: readonly TenderLike[]): { method: PosPaymentMethod; amount: number }[] {
  const s = posSettle(due, tenders);
  return (["cash", "card", "wallet"] as const).map((method) => ({ method, amount: s[method] })).filter((p) => p.amount > 0);
}
