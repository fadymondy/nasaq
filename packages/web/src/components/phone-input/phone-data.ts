import {
  AsYouType,
  type CountryCode,
  getCountries,
  getCountryCallingCode,
  getExampleNumber,
  isValidPhoneNumber,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min";
import metadata from "libphonenumber-js/min/metadata";
import examples from "libphonenumber-js/mobile/examples";

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

const buildCountries = (): PhoneCountry[] =>
  getCountries().map((iso) => ({ iso, dial: getCountryCallingCode(iso), en: phoneCountryName(iso, "en"), ar: phoneCountryName(iso, "ar") }));

/** Every country and territory with a calling code (about 245), from libphonenumber's metadata, named in English and Arabic. */
export const PHONE_COUNTRIES: readonly PhoneCountry[] = buildCountries();

/** Listed first in the country list, in this order. */
export const PHONE_PREFERRED = ["SA", "AE", "EG", "KW", "QA", "BH", "OM", "JO"] as const;

/** Flag emoji from an ISO code, for plain text (a title, a notification). In UI use `CountryFlag`: Windows does not draw flag emoji. */
export function countryFlag(iso: string) {
  return String.fromCodePoint(...[...iso.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/**
 * Splits an E.164 string into its country and national digits. Codes shared by several countries (`+1`, `+7`, `+44`)
 * resolve by number range: `+1 416…` is Canada. Null when the value does not start with `+` or no code matches.
 */
export function parsePhone(value: string, countries: readonly PhoneCountry[] = PHONE_COUNTRIES): { country: PhoneCountry; national: string } | null {
  const digits = toDigits(value);
  if (!value.trim().startsWith("+") || !digits) return null;
  const parsed = parsePhoneNumberFromString(`+${digits}`);
  if (parsed) {
    const exact = parsed.country && countries.find((c) => c.iso === parsed.country);
    const byCode = countries.find((c) => c.dial === parsed.countryCallingCode && c.iso === mainCountry(c.dial));
    const country = exact || byCode || countries.find((c) => c.dial === parsed.countryCallingCode);
    if (country) return { country, national: digits.slice(country.dial.length) };
  }
  // A partial number libphonenumber cannot place yet: the longest matching code, its main country first.
  let best: PhoneCountry | null = null;
  for (const country of countries) {
    if (!digits.startsWith(country.dial)) continue;
    if (!best || country.dial.length > best.dial.length || (country.dial === best.dial && country.iso === mainCountry(country.dial))) best = country;
  }
  return best ? { country: best, national: digits.slice(best.dial.length) } : null;
}

// The country libphonenumber lists first for a shared calling code: US for +1, RU for +7, GB for +44.
const mainCountry = (dial: string) => (metadata.country_calling_codes as Record<string, string[]>)[dial]?.[0];

/** Country plus typed national digits as E.164 (`+9665…`), or "" when there are no digits. A trunk prefix (the leading 0) is dropped where the country uses one. */
export function formatE164(country: PhoneCountry, national: string) {
  const digits = toDigits(national);
  if (!digits) return "";
  const parsed = parsePhoneNumberFromString(digits, country.iso as CountryCode);
  if (parsed && parsed.countryCallingCode === country.dial) return parsed.number;
  return `+${country.dial}${digits.replace(/^0+/, "")}`;
}

/** True when an E.164 value is a complete, valid number for its country. */
export function isValidE164(value: string) {
  return !!value && isValidPhoneNumber(value);
}

// The international grouping without its "+966 " lead: what follows the code in the field.
const afterCode = (country: PhoneCountry, formatted: string) => {
  const lead = `+${country.dial}`;
  return formatted.startsWith(lead) ? formatted.slice(lead.length).trim() : formatted;
};

/** The national number grouped as it is written after the calling code: `50 123 4567` for Saudi Arabia. */
export function formatNational(country: PhoneCountry, national: string) {
  const digits = toDigits(national);
  return digits ? afterCode(country, new AsYouType().input(`+${country.dial}${digits}`)) : "";
}

/** An example mobile number for the country, grouped the same way, for placeholders: `50 123 4567`. */
export function phoneExample(country: PhoneCountry) {
  const example = getExampleNumber(country.iso as CountryCode, examples);
  return example ? afterCode(country, example.formatInternational()) : "";
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
