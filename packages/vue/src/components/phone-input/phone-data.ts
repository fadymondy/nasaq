// Phone data and helpers, the same API as the React package's phone-data.ts. libphonenumber-js is not a dependency of
// this package: the calling codes, number patterns and grouping rules it ships are generated into phone-metadata.ts,
// and the few functions the field needs are written against that table.

import { PHONE_FORMAT_SETS, PHONE_MAIN, PHONE_ROWS, type PhoneRow } from "./phone-metadata";

/** One dialling country. */
export interface PhoneCountry {
  /** ISO 3166-1 alpha-2, upper case. */
  iso: string;
  /** Country calling code without the plus: "966". */
  dial: string;
  /** English name. */
  en: string;
  /** Arabic name. */
  ar: string;
}

/** Digits only, with Arabic-Indic (٠-٩) and Persian (۰-۹) digits read as 0-9. */
export function toDigits(text: string) {
  return text.replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf)).replace(/\D/g, "");
}

// Where the region names in Intl fall short of what Arabic and English readers expect.
const NAME_OVERRIDES: Record<string, { en: string; ar: string }> = {
  PS: { en: "Palestine", ar: "فلسطين" },
};

const regionNames = (locale: string) => {
  try {
    return new Intl.DisplayNames([locale], { type: "region" });
  } catch {
    return null;
  }
};

/** A country's name in any locale: the Intl region name, with a few overrides. Falls back to the ISO code. */
export function phoneCountryName(iso: string, locale = "en") {
  const code = iso.toUpperCase();
  const override = NAME_OVERRIDES[code];
  if (override) return locale.split("-")[0] === "ar" ? override.ar : override.en;
  return regionNames(locale)?.of(code) ?? code;
}

const buildCountries = (): PhoneCountry[] => {
  const en = regionNames("en");
  const ar = regionNames("ar");
  const name = (iso: string, names: Intl.DisplayNames | null, locale: string) => (NAME_OVERRIDES[iso] ? phoneCountryName(iso, locale) : (names?.of(iso) ?? iso));
  return PHONE_ROWS.map((row) => ({ iso: row[0], dial: row[1], en: name(row[0], en, "en"), ar: name(row[0], ar, "ar") }));
};

/** Every country and territory with a calling code (about 245), named in English and Arabic. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = buildCountries();

/** Listed first in the country list, in this order. */
export const PHONE_PREFERRED = ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"] as const;

/** Flag emoji from an ISO code, for plain text (a title, a notification). In UI use `NqCountryFlag`: Windows does not draw flag emoji. */
export function countryFlag(iso: string) {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

const rowOf = new Map<string, PhoneRow>(PHONE_ROWS.map((r) => [r[0], r]));
const rowsByDial = new Map<string, PhoneRow[]>();
for (const r of PHONE_ROWS) rowsByDial.set(r[1], [...(rowsByDial.get(r[1]) ?? []), r]);
const compiled = new Map<string, RegExp>();
const re = (source: string) => {
  let r = compiled.get(source);
  if (!r) compiled.set(source, (r = new RegExp(source)));
  return r;
};
const whole = (pattern: string, text: string) => re(`^(?:${pattern})$`).test(text);

// The country libphonenumber lists first for a shared calling code: US for +1, RU for +7, GB for +44.
const mainCountry = (dial: string) => PHONE_MAIN[dial];

/** The calling code a run of digits starts with (codes are prefix-free), or null. */
function dialOf(digits: string): string | null {
  for (let n = 1; n <= 3; n++) if (PHONE_MAIN[digits.slice(0, n)]) return digits.slice(0, n);
  return null;
}

/** The country of a complete number under a shared calling code, by area code or number range; undefined when unsure. */
function detectCountry(dial: string, national: string): string | undefined {
  const rows = rowsByDial.get(dial) ?? [];
  if (rows.length === 1) return rows[0]![0];
  for (const r of rows) if (r[6] && re(r[6]).test(national)) return r[0];
  return undefined;
}

/**
 * Splits an E.164 string into its country and national digits. Codes shared by several countries (`+1`, `+7`, `+44`)
 * resolve by number range: `+1 416…` is Canada. Null when the value does not start with `+` or no code matches.
 */
export function parsePhone(value: string, countries: readonly PhoneCountry[] = PHONE_COUNTRIES): { country: PhoneCountry; national: string } | null {
  const digits = toDigits(value);
  if (!value.trim().startsWith("+") || !digits) return null;
  const dial = dialOf(digits);
  if (dial && digits.length - dial.length >= 2) {
    const detected = detectCountry(dial, digits.slice(dial.length));
    const exact = detected && countries.find((c) => c.iso === detected);
    const byCode = countries.find((c) => c.dial === dial && c.iso === mainCountry(dial));
    const country = exact || byCode || countries.find((c) => c.dial === dial);
    if (country) return { country, national: digits.slice(country.dial.length) };
  }
  // A partial number that cannot be placed yet: the longest matching code, its main country first.
  let best: PhoneCountry | null = null;
  for (const country of countries) {
    if (!digits.startsWith(country.dial)) continue;
    if (!best || country.dial.length > best.dial.length || (country.dial === best.dial && country.iso === mainCountry(country.dial))) best = country;
  }
  return best ? { country: best, national: digits.slice(best.dial.length) } : null;
}

/** The national number without its trunk prefix (the leading 0), the way libphonenumber reads a local number. */
function stripTrunk(row: PhoneRow, digits: string): string {
  const [, , pattern, trunk, parsing, transform] = row;
  const source = parsing || trunk;
  if (!source) return digits;
  const prefix = re(`^(?:${source})`);
  const m = prefix.exec(digits);
  if (!m) return digits;
  const captured = m.length > 1 ? m[m.length - 1] : undefined;
  const stripped = transform && captured ? digits.replace(prefix, transform) : digits.slice(m[0].length);
  if (whole(pattern, digits) && !whole(pattern, stripped)) return digits;
  return stripped;
}

/** Country plus typed national digits as E.164 (`+9665…`), or "" when there are no digits. A trunk prefix (the leading 0) is dropped where the country uses one. */
export function formatE164(country: PhoneCountry, national: string) {
  const digits = toDigits(national);
  if (!digits) return "";
  const row = rowOf.get(country.iso);
  if (row && digits.length >= 2 && row[1] === country.dial) return `+${country.dial}${stripTrunk(row, digits)}`;
  return `+${country.dial}${digits.replace(/^0+/, "")}`;
}

/** True when an E.164 value is a complete number that fits its country's numbering plan. */
export function isValidE164(value: string) {
  const digits = toDigits(value);
  if (!value || !value.trim().startsWith("+") || !digits) return false;
  const dial = dialOf(digits);
  if (!dial) return false;
  const national = digits.slice(dial.length);
  const iso = detectCountry(dial, national);
  const row = iso ? rowOf.get(iso) : undefined;
  return !!row && whole(row[2], national);
}

type Widths = [number, number?][];
/** [min, max] width of each group of a format. */
const widthsOf = (spec: string): Widths => spec.split(",").map((w) => w.split("-").map(Number) as [number, number?]);

/** Splits national digits into groups: the first format whose leading digits match and whose lengths fit. */
function group(row: PhoneRow, digits: string): string {
  const len = digits.length;
  let widths: Widths | null = null;
  let loose: Widths | null = null;
  for (const [leading, spec] of PHONE_FORMAT_SETS[row[7]] ?? []) {
    if (leading.length) {
      if (len < 3) continue;
      const lead = leading[Math.min(len - 3, leading.length - 1)]!;
      if (!re(`^(?:${lead})`).test(digits)) continue;
    }
    const w = widthsOf(spec);
    const min = w.reduce((n, [lo]) => n + lo, 0);
    const max = w.reduce((n, [lo, hi]) => n + (hi ?? lo), 0);
    if (len <= max || len < min) {
      widths = w;
      break;
    }
    loose ??= w;
  }
  widths ??= loose;
  if (!widths) return digits;
  const parts: string[] = [];
  let at = 0;
  const count = widths.length;
  widths.forEach(([lo, hi], i) => {
    if (at >= len) return;
    const take = i === count - 1 ? len - at : (hi ?? lo);
    parts.push(digits.slice(at, at + take));
    at += take;
  });
  if (at < len) parts[parts.length - 1] += digits.slice(at);
  return parts.join(" ");
}

/** The national number grouped as it is written after the calling code: `50 123 4567` for Saudi Arabia. */
export function formatNational(country: PhoneCountry, national: string) {
  const digits = toDigits(national);
  const row = rowOf.get(country.iso);
  return digits ? (row ? group(row, digits) : digits) : "";
}

/** An example mobile number for the country, grouped the same way, for placeholders: `50 123 4567`. */
export function phoneExample(country: PhoneCountry) {
  const row = rowOf.get(country.iso);
  return row?.[8] ? group(row, row[8]) : "";
}

/**
 * Like `parsePhone`, but also accepts what is not E.164: `00966…` is read as `+966…`, and local numbers such as
 * `0591234567` are kept as the national digits of `fallbackIso` (or the first country) instead of being dropped.
 * Returns null only when there are no digits.
 */
export function parsePhoneLenient(value: string, countries: readonly PhoneCountry[] = PHONE_COUNTRIES, fallbackIso?: string): { country: PhoneCountry; national: string } | null {
  const exact = parsePhone(value, countries);
  if (exact) return exact;
  const digits = toDigits(value);
  if (!digits) return null;
  if (/^00[1-9]/.test(digits)) {
    const international = parsePhone(`+${digits.slice(2)}`, countries);
    if (international) return international;
  }
  const country = countries.find((c) => c.iso === fallbackIso) ?? countries[0];
  return country ? { country, national: digits } : null;
}
