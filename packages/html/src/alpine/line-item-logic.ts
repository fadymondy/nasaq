/*
 * Line-item maths, pure. Every amount is an integer in minor units (halalas, cents), every rate is an integer in
 * basis points (1500 is 15%), and a quantity is read in thousandths. Products are taken with BigInt and rounded
 * half away from zero once per figure, so nothing drifts and the parts always add up to the whole.
 */

export type LineTaxMode = "exclusive" | "inclusive";
/** "line": tax is rounded on each line, then summed. "invoice": tax is rounded once per rate on the whole, then shared out. */
export type LineTaxRounding = "line" | "invoice";

export type LineOrderDiscount = { type: "percent"; bps: number } | { type: "amount"; minor: number };

export interface LineItemMathInput {
  id: string;
  /** Units sold. Up to three decimals (1.5 kg). */
  quantity: number;
  /** Price of one unit in minor units. */
  unitPrice: number;
  /** Line discount in basis points (1000 is 10%), 0 to 10000. */
  discountBps?: number;
  /** Tax rate in basis points. Falls back to `defaultTaxBps`. */
  taxBps?: number;
}

export interface LineItemMathOptions {
  /** "exclusive": prices are before tax and tax is added. "inclusive": prices already contain tax. Default "exclusive". */
  taxMode?: LineTaxMode;
  taxRounding?: LineTaxRounding;
  /** Rate for lines that have no `taxBps`. Default 0. */
  defaultTaxBps?: number;
  /** A discount on the whole basket, taken before tax and shared across lines by their value. */
  orderDiscount?: LineOrderDiscount | null;
}

export interface LineItemResult {
  id: string;
  /** Quantity times unit price. */
  gross: number;
  /** Line discount plus this line's share of the order discount. */
  discount: number;
  /** What the tax is charged on (without tax in either mode). */
  taxable: number;
  tax: number;
  /** What the customer pays for the line: taxable plus tax. */
  total: number;
  taxBps: number;
}

export interface LineTaxGroup {
  bps: number;
  taxable: number;
  tax: number;
}

export interface LineItemTotals {
  lines: LineItemResult[];
  /** Sum of `gross`. Includes tax when prices are tax-inclusive. */
  subtotal: number;
  discountTotal: number;
  taxableTotal: number;
  taxTotal: number;
  /** What is due. Always the sum of the line totals. */
  total: number;
  taxGroups: LineTaxGroup[];
}

const clampInt = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(Number.isFinite(n) ? n : 0)));

/** `round(a * b / d)` half away from zero, exact for any safe integers. */
export function mulDivRound(a: number, b: number, d: number): number {
  if (d === 0) return 0;
  const num = BigInt(Math.round(a)) * BigInt(Math.round(b));
  const den = BigInt(Math.round(d));
  const neg = num < 0n !== den < 0n;
  const absN = num < 0n ? -num : num;
  const absD = den < 0n ? -den : den;
  const q = (2n * absN + absD) / (2n * absD);
  return Number(neg ? -q : q);
}

/** Shares `total` across `weights` in proportion, in whole minor units: largest remainder, ties to the earlier line. The parts sum to `total`. */
export function allocateMinor(total: number, weights: readonly number[]): number[] {
  const out = weights.map(() => 0);
  const w = weights.map((x) => Math.max(0, Math.round(x)));
  const sum = w.reduce((a, b) => a + b, 0);
  if (!weights.length || sum === 0 || total === 0) return out;
  const sign = total < 0 ? -1 : 1;
  const abs = BigInt(Math.abs(Math.round(total)));
  const bigSum = BigInt(sum);
  const shares = w.map((x) => (abs * BigInt(x)) / bigSum);
  const rems = w.map((x, i) => ({ i, r: (abs * BigInt(x)) % bigSum }));
  const left = Number(abs - shares.reduce((a, b) => a + b, 0n));
  rems.sort((a, b) => (a.r === b.r ? a.i - b.i : a.r > b.r ? -1 : 1));
  const extra = new Set(rems.slice(0, left).map((r) => r.i));
  return shares.map((s, i) => sign * (Number(s) + (extra.has(i) ? 1 : 0)));
}

/** A quantity in thousandths, so 1.005 kg stays exact. */
export const quantityMilli = (quantity: number) => Math.round((Number.isFinite(quantity) ? quantity : 0) * 1000);

/** Quantity times unit price, rounded once to a minor unit. */
export function lineGross(quantity: number, unitPrice: number): number {
  return mulDivRound(unitPrice, quantityMilli(quantity), 1000);
}

/** Tax contained in a tax-inclusive amount. */
export const taxInside = (amount: number, bps: number) => amount - mulDivRound(amount, 10000, 10000 + bps);
/** Tax to add to a tax-exclusive amount. */
export const taxOn = (amount: number, bps: number) => mulDivRound(amount, bps, 10000);

/** Prices, discounts and tax for a basket. See the options for the tax and rounding modes. */
export function computeLineItems(items: readonly LineItemMathInput[], options: LineItemMathOptions = {}): LineItemTotals {
  const { taxMode = "exclusive", taxRounding = "line", defaultTaxBps = 0, orderDiscount = null } = options;
  const inclusive = taxMode === "inclusive";

  const base = items.map((item) => {
    const gross = lineGross(item.quantity, item.unitPrice);
    const lineDiscount = mulDivRound(gross, clampInt(item.discountBps ?? 0, 0, 10000), 10000);
    return { item, gross, lineDiscount, afterLine: gross - lineDiscount, taxBps: clampInt(item.taxBps ?? defaultTaxBps, 0, 100000) };
  });

  const basket = base.reduce((sum, b) => sum + b.afterLine, 0);
  let orderOff = 0;
  if (orderDiscount && basket > 0) {
    orderOff = orderDiscount.type === "percent" ? mulDivRound(basket, clampInt(orderDiscount.bps, 0, 10000), 10000) : clampInt(orderDiscount.minor, 0, basket);
  }
  const shares = allocateMinor(orderOff, base.map((b) => Math.max(0, b.afterLine)));
  const nets = base.map((b, i) => b.afterLine - (shares[i] ?? 0));

  let taxes: number[];
  if (taxRounding === "line") {
    taxes = base.map((b, i) => (inclusive ? taxInside(nets[i] ?? 0, b.taxBps) : taxOn(nets[i] ?? 0, b.taxBps)));
  } else {
    taxes = base.map(() => 0);
    for (const bps of new Set(base.map((b) => b.taxBps))) {
      const idx = base.flatMap((b, i) => (b.taxBps === bps ? [i] : []));
      const groupNet = idx.reduce((sum, i) => sum + (nets[i] ?? 0), 0);
      const groupTax = inclusive ? taxInside(groupNet, bps) : taxOn(groupNet, bps);
      const parts = allocateMinor(groupTax, idx.map((i) => Math.max(0, nets[i] ?? 0)));
      idx.forEach((i, k) => {
        taxes[i] = parts[k] ?? 0;
      });
    }
  }

  const lines: LineItemResult[] = base.map((b, i) => {
    const net = nets[i] ?? 0;
    const tax = taxes[i] ?? 0;
    const taxable = inclusive ? net - tax : net;
    return { id: b.item.id, gross: b.gross, discount: b.lineDiscount + (shares[i] ?? 0), taxable, tax, total: taxable + tax, taxBps: b.taxBps };
  });

  const groups = new Map<number, LineTaxGroup>();
  for (const l of lines) {
    const g = groups.get(l.taxBps) ?? { bps: l.taxBps, taxable: 0, tax: 0 };
    g.taxable += l.taxable;
    g.tax += l.tax;
    groups.set(l.taxBps, g);
  }
  const sum = (pick: (l: LineItemResult) => number) => lines.reduce((a, l) => a + pick(l), 0);
  return {
    lines,
    subtotal: sum((l) => l.gross),
    discountTotal: sum((l) => l.discount),
    taxableTotal: sum((l) => l.taxable),
    taxTotal: sum((l) => l.tax),
    total: sum((l) => l.total),
    taxGroups: [...groups.values()].filter((g) => g.bps > 0 || g.tax !== 0).sort((a, b) => a.bps - b.bps),
  };
}

/* ------------------------------------------------------------------ percent and quantity text */

/** Basis points as the percent people read: 1250 is "12.5", 1500 is "15". */
export function bpsToPercentText(bps: number): string {
  const whole = Math.trunc(bps / 100);
  const frac = Math.abs(bps % 100);
  if (!frac) return String(whole);
  return `${whole}.${String(frac).padStart(2, "0").replace(/0$/, "")}`;
}

/** A quantity as the text people read: 1.5 is "1.5", 2 is "2". */
export function quantityText(quantity: number): string {
  const milli = quantityMilli(quantity);
  const whole = Math.trunc(milli / 1000);
  const frac = Math.abs(milli % 1000);
  if (!frac) return String(whole);
  return `${milli < 0 && whole === 0 ? "-" : ""}${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

/* ------------------------------------------------------------------ decimal text (copied from currency-input) */

const decimalsCache = new Map<string, number>();
export function currencyDecimals(currency: string): number {
  const code = currency.toUpperCase();
  const known = decimalsCache.get(code);
  if (known !== undefined) return known;
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  decimalsCache.set(code, digits);
  return digits;
}

/** Arabic-Indic and Persian digits to 0-9, Arabic marks to "." and ",", minus look-alikes to "-"; bidi marks are dropped. */
export function normalizeDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c >= 0x0660 && c <= 0x0669) out += String(c - 0x0660);
    else if (c >= 0x06f0 && c <= 0x06f9) out += String(c - 0x06f0);
    else if (c === 0x066b) out += ".";
    else if (c === 0x066c || c === 0x060c) out += ",";
    else if (c === 0x2212 || c === 0x2012 || c === 0x2013 || c === 0xff0d) out += "-";
    else if (c === 0xa0 || c === 0x202f || c === 0x2009) out += " ";
    else if (c === 0x200e || c === 0x200f || c === 0x061c || (c >= 0x2066 && c <= 0x2069) || (c >= 0x202a && c <= 0x202e)) continue;
    else out += ch;
  }
  return out;
}

export function localeDecimal(locale: string): string {
  try {
    const parts = new Intl.NumberFormat(new Intl.Locale(locale, { numberingSystem: "latn" }).toString()).formatToParts(1234567.5);
    return normalizeDigits(parts.find((p) => p.type === "decimal")?.value ?? ".");
  } catch {
    return ".";
  }
}

/** Whatever was typed or pasted as a plain decimal string ("-1234.5"), or null when it holds no digit. */
export function toPlainDecimal(text: string, locale = "en", paste = false): string | null {
  const stripped = normalizeDigits(text).replace(/[\p{L}\p{Sc}][\p{L}\p{Sc}.]*/gu, "");
  const negative = /^\s*[-(]/.test(stripped) || /-\s*$/.test(stripped);
  const body = stripped.replace(/[^0-9.,]/g, "");
  if (!/[0-9]/.test(body)) return null;
  const local = localeDecimal(locale);
  let decimalAt = -1;
  if (paste) {
    const lastDot = body.lastIndexOf(".");
    const lastComma = body.lastIndexOf(",");
    if (lastDot >= 0 && lastComma >= 0) decimalAt = Math.max(lastDot, lastComma);
    else {
      const mark = lastDot >= 0 ? "." : lastComma >= 0 ? "," : "";
      if (mark) {
        const count = body.split(mark).length - 1;
        const after = body.length - body.lastIndexOf(mark) - 1;
        if (count === 1 && (mark === local || after !== 3)) decimalAt = body.lastIndexOf(mark);
      }
    }
  } else {
    decimalAt = [...body].findIndex((c) => c === "." || c === local);
  }
  const digits = (s: string) => s.replace(/[^0-9]/g, "");
  const whole = digits(decimalAt >= 0 ? body.slice(0, decimalAt) : body).replace(/^0+(?=\d)/, "");
  const fraction = decimalAt >= 0 ? digits(body.slice(decimalAt + 1)) : "";
  return `${negative ? "-" : ""}${whole || "0"}${decimalAt >= 0 ? `.${fraction}` : ""}`;
}

export function plainToMinor(plain: string, decimals: number, overflow: "round" | "truncate" = "round"): number | null {
  const m = /^(-?)(\d+)(?:\.(\d*))?$/.exec(plain);
  if (!m) return null;
  const sign = m[1] as string;
  const whole = m[2] as string;
  const fraction = (m[3] ?? "").padEnd(decimals, "0");
  let minor = Number(`${whole}${fraction.slice(0, decimals)}`);
  if (overflow === "round" && fraction.length > decimals && fraction.charCodeAt(decimals) >= 53) minor += 1;
  if (!Number.isSafeInteger(minor)) return null;
  return sign && minor !== 0 ? -minor : minor;
}

export function minorToPlain(minor: number, decimals: number): string {
  const digits = String(Math.abs(Math.trunc(minor))).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? `.${digits.slice(digits.length - decimals)}` : "";
  return `${minor < 0 ? "-" : ""}${whole}${fraction}`;
}


export const minorToMajor = (minor: number, currency: string): number => minor / 10 ** currencyDecimals(currency);
