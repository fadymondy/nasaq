// nqCurrencyInput: a money field. The markup is the React CurrencyInput's (see the Blade component), the state lives here.
//
//   <div data-slot="currency-input" x-data="nqCurrencyInput(1999, { currency: 'USD', locale: 'en' })" x-modelable="minor">
//     <div role="group" data-slot="input-group" …>
//       <div data-slot="currency-symbol" x-bind="symbolAddon"><span data-slot="input-group-text"><bdi dir="ltr" x-text="mark()"></bdi></span></div>
//       <input data-slot="input-group-input" dir="ltr" x-bind="field" class="…">
//     </div>
//     <input type="hidden" name="fee" :value="minor === null ? '' : String(minor)">
//   </div>
//
// The value is an integer in minor units (1999 is 19.99 USD), so nothing rounds twice. The currency sets the decimals
// (JPY 0, USD 2, KWD 3). Digits typed or pasted in any set (1250.5, ١٢٥٠٫٥) give the same amount. While focused the
// field shows the plain number; on blur it groups and pads it. Arrow keys step by one major unit (Shift x10).
// `minor` is x-modelable (x-model="$wire.fee"); a picker (x-model="currency" on a nested nqSelect) converts the amount
// to the new decimals and dispatches "currency-change" ({ currency, minor }).
// Options: currency, currencies, locale, min, max, clampOnBlur, allowNegative, numberingSystem ("latn" | "arab"),
// overflow ("round" | "truncate"), symbol ("symbol" | "code" | "none"), fixedDecimals, step, invalid.
//
// The money maths below is the same as the React package's currency-input-logic.ts, inlined because an Alpine module
// cannot import a sibling helper (every file in this folder is a registered component).

import type { Magics, Register } from "./types";

type Digits = "latn" | "arab";
type Overflow = "round" | "truncate";

interface MoneyOptions {
  currency?: string;
  currencies?: readonly string[];
  locale?: string;
  min?: number;
  max?: number;
  clampOnBlur?: boolean;
  allowNegative?: boolean;
  numberingSystem?: Digits;
  overflow?: Overflow;
  symbol?: "symbol" | "code" | "none";
  fixedDecimals?: boolean;
  step?: number;
  invalid?: boolean;
}

const decimalsCache = new Map<string, number>();
function currencyDecimals(currency: string): number {
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
function normalizeDigits(text: string): string {
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

function localeDecimal(locale: string): string {
  try {
    const parts = new Intl.NumberFormat(new Intl.Locale(locale, { numberingSystem: "latn" }).toString()).formatToParts(1234567.5);
    return normalizeDigits(parts.find((p) => p.type === "decimal")?.value ?? ".");
  } catch {
    return ".";
  }
}

/** Whatever was typed or pasted as a plain decimal string ("-1234.5"), or null when it holds no digit. */
function toPlainDecimal(text: string, locale: string, paste = false): string | null {
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

function plainToMinor(plain: string, decimals: number, overflow: Overflow = "round"): number | null {
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

function minorToPlain(minor: number, decimals: number): string {
  const digits = String(Math.abs(Math.trunc(minor))).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const fraction = decimals ? `.${digits.slice(digits.length - decimals)}` : "";
  return `${minor < 0 ? "-" : ""}${whole}${fraction}`;
}

/** Plain decimal text for the focused field: no grouping, the locale's decimal mark, the chosen digits. */
function editableText(plain: string, locale: string, digits: Digits): string {
  const mark = digits === "arab" ? String.fromCodePoint(0x066b) : localeDecimal(locale);
  const swapped = plain.replace(".", mark);
  return digits === "arab" ? swapped.replace(/[0-9]/g, (d) => String.fromCodePoint(0x0660 + Number(d))) : swapped;
}

/** Cleans an edit; null when the amount would not be a safe integer (the keystroke is refused). */
function sanitize(text: string, decimals: number, locale: string, allowNegative: boolean): { plain: string; minor: number | null } | null {
  const plain = toPlainDecimal(text, locale);
  if (plain === null) return { plain: allowNegative && /^\s*-\s*$/.test(normalizeDigits(text)) ? "-" : "", minor: null };
  const negative = allowNegative && plain.startsWith("-");
  const [whole = "0", fraction] = plain.replace("-", "").split(".");
  const cut = decimals > 0 && fraction !== undefined ? `${whole}.${fraction.slice(0, decimals)}` : whole;
  const magnitude = plainToMinor(cut, decimals, "truncate");
  if (magnitude === null) return null;
  return { plain: `${negative ? "-" : ""}${cut}`, minor: negative && magnitude !== 0 ? -magnitude : magnitude };
}

function formatMinor(minor: number, currency: string, locale: string, digits: Digits, fixed: boolean): string {
  const decimals = currencyDecimals(currency);
  const format = new Intl.NumberFormat(new Intl.Locale(locale, { numberingSystem: digits }).toString(), {
    minimumFractionDigits: fixed || minor % 10 ** decimals !== 0 ? decimals : 0,
    maximumFractionDigits: decimals,
    useGrouping: true,
  });
  return format.format(minorToPlain(minor, decimals) as unknown as number);
}

function symbolSide(currency: string, locale: string): "start" | "end" {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency }).formatToParts(1);
    return parts.findIndex((p) => p.type === "currency") < parts.findIndex((p) => p.type === "integer") ? "start" : "end";
  } catch {
    return "start";
  }
}

function currencySymbol(currency: string, locale: string): string {
  try {
    const parts = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "narrowSymbol" }).formatToParts(1);
    return (parts.find((p) => p.type === "currency")?.value ?? currency).trim();
  } catch {
    return currency;
  }
}

const inRange = (minor: number | null, min?: number, max?: number) =>
  minor === null || ((min === undefined || minor >= min) && (max === undefined || minor <= max));
const clamp = (minor: number, min?: number, max?: number) => {
  const lo = min === undefined ? minor : Math.max(minor, min);
  return max === undefined ? lo : Math.min(lo, max);
};

interface MoneyState extends Magics {
  $nq: { t(en: string, ar: string): string };
  minor: number | null;
  currency: string;
  text: string;
  focused: boolean;
  opts: MoneyOptions;
  locale: string;
  decimals(): number;
  shown(): string;
  out(): boolean;
  invalid(): boolean;
  mark(): string | null;
  side(): "start" | "end";
  hint(): string;
  plainOf(m: number | null): string;
  commit(next: number | null): void;
  setAmount(next: number | null): void;
  edit(el: HTMLInputElement): void;
  resync(el: HTMLInputElement): void;
  rangeId(): string;
}

export const currencyInput: Register = (Alpine) => {
  Alpine.data("nqCurrencyInput", (initial: number | null = null, options: MoneyOptions = {}) => ({
    minor: initial ?? null,
    currency: (options.currency ?? "USD").toUpperCase(),
    text: "",
    focused: false,
    opts: options,
    locale: options.locale || document.documentElement.lang || "en",
    init(this: MoneyState) {
      // The picker changes `currency`: keep the same amount of money in the new decimals.
      (this.$watch as (key: string, fn: (next: string, prev: string) => void) => void)("currency", (next: string, prev: string) => {
        this.$root.dataset.currency = next;
        if (!prev || next === prev) return;
        const from = currencyDecimals(prev);
        const to = currencyDecimals(next);
        const converted = this.minor === null || from === to ? this.minor : (plainToMinor(minorToPlain(this.minor, from), to, "round") ?? this.minor);
        this.minor = converted;
        this.text = "";
        this.$dispatch("currency-change", { currency: next, minor: converted });
      });
    },
    decimals(this: MoneyState) {
      return currencyDecimals(this.currency);
    },
    plainOf(this: MoneyState, m: number | null) {
      return m === null ? "" : minorToPlain(m, this.decimals());
    },
    shown(this: MoneyState) {
      if (this.focused) return this.text;
      if (this.minor === null) return "";
      return formatMinor(this.minor, this.currency, this.locale, this.opts.numberingSystem ?? "latn", this.opts.fixedDecimals ?? true);
    },
    out(this: MoneyState) {
      return !inRange(this.minor, this.opts.min, this.opts.max);
    },
    invalid(this: MoneyState) {
      return Boolean(this.opts.invalid) || this.out();
    },
    mark(this: MoneyState) {
      const kind = this.opts.symbol ?? "symbol";
      return kind === "code" ? this.currency : kind === "symbol" ? currencySymbol(this.currency, this.locale) : null;
    },
    side(this: MoneyState) {
      return symbolSide(this.currency, this.locale);
    },
    hint(this: MoneyState) {
      const d = this.decimals();
      return formatMinor(0, d === 0 ? "JPY" : d === 3 ? "KWD" : "USD", this.locale, this.opts.numberingSystem ?? "latn", true);
    },
    rangeId(this: MoneyState) {
      return this.$id("nq-currency", "range");
    },
    commit(this: MoneyState, next: number | null) {
      this.minor = next;
    },
    setAmount(this: MoneyState, next: number | null) {
      this.text = next === null ? "" : editableText(this.plainOf(next), this.locale, this.opts.numberingSystem ?? "latn");
      this.commit(next);
    },
    /** A refused keystroke leaves shown() unchanged, so the DOM is not patched; put the old text back. */
    resync(this: MoneyState, el: HTMLInputElement) {
      void this.$nextTick(() => {
        if (el.value !== this.shown()) el.value = this.shown();
      });
    },
    edit(this: MoneyState, el: HTMLInputElement) {
      const clean = sanitize(el.value, this.decimals(), this.locale, Boolean(this.opts.allowNegative));
      if (clean) {
        this.text = editableText(clean.plain, this.locale, this.opts.numberingSystem ?? "latn");
        if (clean.minor !== this.minor) this.commit(clean.minor);
      }
      this.resync(el);
    },
    /** Bind on the symbol addon: it sits at the edge where the locale puts the symbol. */
    symbolAddon: {
      ":data-align"(this: MoneyState) {
        return this.side();
      },
      ":class"(this: MoneyState) {
        return this.side() === "start" ? "order-first ps-3 pe-1" : "order-last ps-1 pe-3";
      },
      "x-show"(this: MoneyState) {
        return this.mark() !== null;
      },
    },
    /** Bind on the group shell: invalid state. */
    group: {
      ":data-invalid"(this: MoneyState) {
        return this.invalid() ? "" : undefined;
      },
    },
    /** Bind on the text input. */
    field: {
      ":value"(this: MoneyState) {
        return this.shown();
      },
      ":placeholder"(this: MoneyState) {
        return this.hint();
      },
      ":inputmode"(this: MoneyState) {
        return this.decimals() > 0 ? "decimal" : "numeric";
      },
      ":aria-invalid"(this: MoneyState) {
        return this.invalid() ? "true" : undefined;
      },
      ":aria-describedby"(this: MoneyState) {
        return this.out() ? this.rangeId() : undefined;
      },
      "x-on:input"(this: MoneyState, event: Event) {
        this.edit(event.target as HTMLInputElement);
      },
      "x-on:focus"(this: MoneyState) {
        this.text = this.minor === null ? "" : editableText(this.plainOf(this.minor), this.locale, this.opts.numberingSystem ?? "latn");
        this.focused = true;
      },
      "x-on:blur"(this: MoneyState) {
        this.focused = false;
        const { min, max, clampOnBlur } = this.opts;
        if (clampOnBlur && this.minor !== null && !inRange(this.minor, min, max)) this.commit(clamp(this.minor, min, max));
      },
      "x-on:paste"(this: MoneyState, event: ClipboardEvent) {
        const pasted = event.clipboardData?.getData("text") ?? "";
        const plain = toPlainDecimal(pasted, this.locale, true);
        const parsed = plain === null ? null : plainToMinor(plain, this.decimals(), this.opts.overflow ?? "round");
        if (parsed === null && !/[0-9٠-٩۰-۹]/.test(pasted)) return;
        event.preventDefault();
        if (parsed !== null) this.setAmount(!this.opts.allowNegative && parsed < 0 ? -parsed : parsed);
        this.resync(event.target as HTMLInputElement);
      },
      "x-on:keydown"(this: MoneyState, event: KeyboardEvent) {
        if ((event.key !== "ArrowUp" && event.key !== "ArrowDown") || (event.target as HTMLInputElement).readOnly) return;
        event.preventDefault();
        const unit = (this.opts.step ?? 10 ** this.decimals()) * (event.shiftKey ? 10 : 1);
        const next = (this.minor ?? 0) + (event.key === "ArrowUp" ? unit : -unit);
        if (!Number.isSafeInteger(next) || (!this.opts.allowNegative && next < 0)) return;
        const { min, max } = this.opts;
        this.setAmount(min !== undefined || max !== undefined ? clamp(next, min, max) : next);
      },
    },
  }));
};
