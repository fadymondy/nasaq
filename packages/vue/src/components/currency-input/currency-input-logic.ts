/*
 * Money entry, pure. Amounts are integers in minor units (cents, halalas, fils), never floats, so 19.99 is 1999
 * and nothing drifts. The number of decimals comes from the currency (JPY 0, USD 2, KWD 3). Text in any digit set
 * (0-9, ٠-٩, ۰-۹) and either decimal mark parses to the same amount.
 */

export type CurrencyOverflow = "round" | "truncate";
export type CurrencyDigits = "latn" | "arab";

const cache = new Map<string, number>();

/** How many decimals the currency uses: 2 for USD and SAR, 3 for KWD and BHD, 0 for JPY. Unknown codes use 2. */
export function currencyDecimals(currency: string): number {
  const code = currency.toUpperCase();
  const known = cache.get(code);
  if (known !== undefined) return known;
  let digits = 2;
  try {
    digits = new Intl.NumberFormat("en", { style: "currency", currency: code }).resolvedOptions().maximumFractionDigits ?? 2;
  } catch {
    digits = 2;
  }
  cache.set(code, digits);
  return digits;
}

const BIDI_MARK = /[‎‏؜⁦-⁩‪-‮]/;

/**
 * Maps Arabic-Indic (٠-٩) and Persian (۰-۹) digits to 0-9, the Arabic decimal and thousands marks to "." and ",",
 * the Arabic comma to ",", every minus look-alike to "-", and drops bidi marks and no-break spaces.
 */
export function normalizeMoneyDigits(text: string): string {
  let out = "";
  for (const ch of text) {
    const c = ch.codePointAt(0) as number;
    if (c >= 0x0660 && c <= 0x0669) out += String(c - 0x0660);
    else if (c >= 0x06f0 && c <= 0x06f9) out += String(c - 0x06f0);
    else if (ch === "٫") out += ".";
    else if (ch === "٬" || ch === "،") out += ",";
    else if (ch === "−" || ch === "‒" || ch === "–" || ch === "－") out += "-";
    else if (ch === " " || ch === " " || ch === " ") out += " ";
    else if (BIDI_MARK.test(ch)) continue;
    else out += ch;
  }
  return out;
}

/** The locale's decimal and grouping marks in plain ASCII ("." and "," for English, "," and "." for German). */
export function moneySeparators(locale: string): { decimal: string; group: string } {
  try {
    const parts = new Intl.NumberFormat(new Intl.Locale(locale, { numberingSystem: "latn" }).toString()).formatToParts(1234567.5);
    const pick = (type: string, fallback: string) => normalizeMoneyDigits(parts.find((p) => p.type === type)?.value ?? fallback);
    return { decimal: pick("decimal", "."), group: pick("group", ",") };
  } catch {
    return { decimal: ".", group: "," };
  }
}

export interface ParseMoneyOptions {
  locale?: string;
  /**
   * Read a pasted amount, where a lone "," or "." may be a thousands mark ("1,250" is 1250). Default false:
   * typing, where only "." and the locale's own decimal mark are decimals and every other mark is dropped.
   */
  paste?: boolean;
}

/**
 * Turns whatever was typed or pasted into a plain decimal string such as "-1234.5", or null when it holds no digit.
 * Currency symbols and codes ("SAR", "US$", "ر.س."), spaces and grouping marks are dropped. A trailing "." is kept so
 * the field can show "12." while someone types.
 */
export function toPlainDecimal(text: string, { locale = "en", paste = false }: ParseMoneyOptions = {}): string | null {
  // A currency symbol or code (with its own dots, as in "ر.س.") goes as one token, before the marks are read.
  const stripped = normalizeMoneyDigits(text).replace(/[\p{L}\p{Sc}][\p{L}\p{Sc}.]*/gu, "");
  const negative = /^\s*[-(]/.test(stripped) || /-\s*$/.test(stripped);
  const body = stripped.replace(/[^0-9.,]/g, "");
  if (!/[0-9]/.test(body)) return null;
  const { decimal: localeDecimal } = moneySeparators(locale);

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
        // Several of one mark is grouping. A single mark is a decimal when it is the locale's, or when three digits do not follow.
        if (count === 1 && (mark === localeDecimal || after !== 3)) decimalAt = body.lastIndexOf(mark);
      }
    }
  } else {
    decimalAt = [...body].findIndex((c) => c === "." || c === localeDecimal);
  }

  const digits = (s: string) => s.replace(/[^0-9]/g, "");
  const whole = digits(decimalAt >= 0 ? body.slice(0, decimalAt) : body).replace(/^0+(?=\d)/, "");
  const fraction = decimalAt >= 0 ? digits(body.slice(decimalAt + 1)) : "";
  return `${negative ? "-" : ""}${whole || "0"}${decimalAt >= 0 ? `.${fraction}` : ""}`;
}

/** Converts a plain decimal string to minor units. Extra decimals are rounded (half away from zero) or cut. Null when it is not a safe integer. */
export function plainToMinor(plain: string, decimals: number, overflow: CurrencyOverflow = "round"): number | null {
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

/** Text to minor units: `parseMoney("١٬٢٥٠٫٥٠", { currency: "SAR" })` is 125050. Null when there is no amount. */
export function parseMoney(text: string, options: ParseMoneyOptions & { currency: string; overflow?: CurrencyOverflow }): number | null {
  const plain = toPlainDecimal(text, options);
  return plain === null ? null : plainToMinor(plain, currencyDecimals(options.currency), options.overflow ?? "round");
}

/** Minor units as an exact plain decimal string: `minorToPlain(-1999, 2)` is "-19.99". */
export function minorToPlain(minor: number, decimals: number): string {
  const digits = String(Math.abs(Math.trunc(minor))).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? `.${digits.slice(digits.length - decimals)}` : "";
  return `${minor < 0 ? "-" : ""}${whole}${fraction}`;
}

/** Minor units as major units (a float, for display maths only). */
export function minorToMajor(minor: number, currency: string): number {
  return minor / 10 ** currencyDecimals(currency);
}

/** Major units to minor units, rounded: `majorToMinor(19.99, "USD")` is 1999, not 1998.99999. */
export function majorToMinor(major: number, currency: string): number {
  const decimals = currencyDecimals(currency);
  // The shortest decimal text of the number ("1.005"), not toFixed, which rounds the binary value ("1.00").
  const text = String(major);
  return (/^-?\d+(\.\d+)?$/.test(text) ? plainToMinor(text, decimals) : null) ?? Math.round(major * 10 ** decimals);
}

/** Keeps the same amount of money when the currency changes decimals: 12.50 is 1250 in USD-minor and 12500 in KWD-minor. */
export function convertMinorDecimals(minor: number, fromCurrency: string, toCurrency: string): number {
  const from = currencyDecimals(fromCurrency);
  const to = currencyDecimals(toCurrency);
  if (from === to) return minor;
  return plainToMinor(minorToPlain(minor, from), to, "round") ?? minor;
}

const ARAB = "٠١٢٣٤٥٦٧٨٩";

/** Latin digits to the chosen digit set. The length never changes, so a caret position stays valid. */
export function withMoneyDigits(text: string, digits: CurrencyDigits): string {
  return digits === "arab" ? text.replace(/[0-9]/g, (d) => ARAB[Number(d)] as string) : text;
}

/** What the field shows while editing: no grouping, the locale's decimal mark, the chosen digits. `plain` comes from `sanitizeMoneyText`. */
export function editableMoneyText(plain: string, locale: string, digits: CurrencyDigits): string {
  const decimal = digits === "arab" ? "٫" : moneySeparators(locale).decimal;
  return withMoneyDigits(plain.replace(".", decimal), digits);
}

export interface SanitizedMoney {
  /** Plain "-12.5" text with at most `decimals` fraction digits, or "" when there is nothing usable. */
  plain: string;
  /** Minor units, or null while the field is empty, "-" or ".". */
  minor: number | null;
}

/**
 * Cleans an edit: keeps digits of any set, one decimal mark and an optional leading minus, and stops at the
 * currency's decimals ("12.345" in USD becomes "12.34"). Returns null when the amount would not be a safe integer,
 * so the caller can refuse the keystroke.
 */
export function sanitizeMoneyText(text: string, decimals: number, { locale = "en", allowNegative = false }: { locale?: string; allowNegative?: boolean } = {}): SanitizedMoney | null {
  const plain = toPlainDecimal(text, { locale });
  // A lone "-" is a valid step on the way to "-5".
  if (plain === null) return { plain: allowNegative && /^\s*-\s*$/.test(normalizeMoneyDigits(text)) ? "-" : "", minor: null };
  const negative = allowNegative && plain.startsWith("-");
  const [whole = "0", fraction] = plain.replace("-", "").split(".");
  const cut = decimals > 0 && fraction !== undefined ? `${whole}.${fraction.slice(0, decimals)}` : whole;
  const magnitude = plainToMinor(cut, decimals, "truncate");
  if (magnitude === null) return null;
  return { plain: `${negative ? "-" : ""}${cut}`, minor: negative && magnitude !== 0 ? -magnitude : magnitude };
}

/** Locale text for a stored amount, without a symbol: "1,250.50", "1,250" (JPY), "١٬٢٥٠٫٥٠" with `arab`. `fixed: false` drops ".00". */
export function formatMinor(minor: number, currency: string, locale: string, { digits = "latn", fixed = true, grouping = true }: { digits?: CurrencyDigits; fixed?: boolean; grouping?: boolean } = {}): string {
  const decimals = currencyDecimals(currency);
  const format = new Intl.NumberFormat(new Intl.Locale(locale, { numberingSystem: digits }).toString(), {
    minimumFractionDigits: fixed || minor % 10 ** decimals !== 0 ? decimals : 0,
    maximumFractionDigits: decimals,
    useGrouping: grouping,
  });
  // A decimal string keeps the amount exact where the engine accepts one; older engines read it as a Number.
  return format.format(minorToPlain(minor, decimals) as unknown as number);
}

/** Where the locale puts the currency symbol relative to the figure: "start" (en "$1.00") or "end" (ar "1.00 US$"). */
export function symbolSide(currency: string, locale: string): "start" | "end" {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(1);
    return parts.findIndex((p) => p.type === "currency") < parts.findIndex((p) => p.type === "integer") ? "start" : "end";
  } catch {
    return "start";
  }
}

/** The short symbol for a currency in a locale ("$", "SAR", "ر.س."). */
export function currencySymbol(currency: string, locale: string, display: "narrowSymbol" | "symbol" | "code" | "name" = "narrowSymbol"): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: display }).formatToParts(1);
    return (parts.find((p) => p.type === "currency")?.value ?? currency).trim();
  } catch {
    return currency;
  }
}

/** Whether an amount falls inside `min` and `max` (minor units, both inclusive and optional). Empty is in range. */
export function moneyInRange(minor: number | null, min?: number, max?: number): boolean {
  if (minor === null) return true;
  return (min === undefined || minor >= min) && (max === undefined || minor <= max);
}

export function clampMoney(minor: number, min?: number, max?: number): number {
  const lo = min === undefined ? minor : Math.max(minor, min);
  return max === undefined ? lo : Math.min(lo, max);
}
