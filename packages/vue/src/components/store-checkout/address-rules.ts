/*
 * Country-aware address rules for checkout: which fields a country needs, how its postal code and phone number look,
 * normalising what people type (Arabic digits, spacing, case) and validating an address. Problems are codes, never
 * sentences, so the form can show them in any language. Plain TypeScript.
 */
import type { CommerceAddress } from "./commerce";

export type StoreAddressField = "name" | "phone" | "line1" | "line2" | "city" | "region" | "postalCode";
export type AddressProblem = "required" | "tooShort" | "tooLong" | "postalCode" | "phone" | "region";
export type AddressErrors = Partial<Record<StoreAddressField, AddressProblem>>;

/** What the region field is called and whether it is a fixed list. */
export type RegionKind = "district" | "emirate" | "state" | "province" | "county" | "governorate" | "none";

export interface CountryRule {
  /** ISO 3166-1 alpha-2. */
  code: string;
  name: { en: string; ar: string };
  /** International dialling code without "+". */
  dial: string;
  regionKind: RegionKind;
  regionRequired: boolean;
  /** A closed list (stored value is `id`, the English name). Empty means free text. */
  regions?: readonly { id: string; en: string; ar: string }[];
  /** No postal code at all (hidden in the form). */
  noPostal?: boolean;
  postalRequired: boolean;
  /** Tested against the normalised postal code. */
  postalPattern?: RegExp;
  postalExample?: string;
  /** Tested against the national number: digits after the dial code and any trunk "0". */
  phonePattern: RegExp;
  phoneExample: string;
  /** Postal code goes before the city ("12345 Berlin") rather than after ("Cairo 11765"). */
  postalFirst?: boolean;
}

const UAE_EMIRATES = [
  { id: "Abu Dhabi", en: "Abu Dhabi", ar: "أبوظبي" },
  { id: "Dubai", en: "Dubai", ar: "دبي" },
  { id: "Sharjah", en: "Sharjah", ar: "الشارقة" },
  { id: "Ajman", en: "Ajman", ar: "عجمان" },
  { id: "Umm Al Quwain", en: "Umm Al Quwain", ar: "أم القيوين" },
  { id: "Ras Al Khaimah", en: "Ras Al Khaimah", ar: "رأس الخيمة" },
  { id: "Fujairah", en: "Fujairah", ar: "الفجيرة" },
] as const;

export const COUNTRY_RULES: Readonly<Record<string, CountryRule>> = {
  EG: { code: "EG", name: { en: "Egypt", ar: "مصر" }, dial: "20", regionKind: "district", regionRequired: false, postalRequired: false, postalPattern: /^\d{5}$/, postalExample: "11765", phonePattern: /^1[0125]\d{8}$/, phoneExample: "100 123 4567" },
  SA: { code: "SA", name: { en: "Saudi Arabia", ar: "السعودية" }, dial: "966", regionKind: "district", regionRequired: true, postalRequired: true, postalPattern: /^\d{5}$/, postalExample: "12211", phonePattern: /^5\d{8}$/, phoneExample: "50 123 4567" },
  AE: { code: "AE", name: { en: "United Arab Emirates", ar: "الإمارات" }, dial: "971", regionKind: "emirate", regionRequired: true, regions: UAE_EMIRATES, noPostal: true, postalRequired: false, phonePattern: /^5\d{8}$/, phoneExample: "50 123 4567" },
  KW: { code: "KW", name: { en: "Kuwait", ar: "الكويت" }, dial: "965", regionKind: "governorate", regionRequired: false, postalRequired: true, postalPattern: /^\d{5}$/, postalExample: "13001", phonePattern: /^[569]\d{7}$/, phoneExample: "5012 3456" },
  QA: { code: "QA", name: { en: "Qatar", ar: "قطر" }, dial: "974", regionKind: "none", regionRequired: false, noPostal: true, postalRequired: false, phonePattern: /^[3567]\d{7}$/, phoneExample: "3312 3456" },
  BH: { code: "BH", name: { en: "Bahrain", ar: "البحرين" }, dial: "973", regionKind: "governorate", regionRequired: false, postalRequired: false, postalPattern: /^\d{3,4}$/, postalExample: "317", phonePattern: /^[36]\d{7}$/, phoneExample: "3600 1234" },
  OM: { code: "OM", name: { en: "Oman", ar: "عُمان" }, dial: "968", regionKind: "governorate", regionRequired: false, postalRequired: true, postalPattern: /^\d{3}$/, postalExample: "112", phonePattern: /^[79]\d{7}$/, phoneExample: "9212 3456" },
  JO: { code: "JO", name: { en: "Jordan", ar: "الأردن" }, dial: "962", regionKind: "governorate", regionRequired: false, postalRequired: false, postalPattern: /^\d{5}$/, postalExample: "11118", phonePattern: /^7[789]\d{7}$/, phoneExample: "79 123 4567" },
  US: { code: "US", name: { en: "United States", ar: "الولايات المتحدة" }, dial: "1", regionKind: "state", regionRequired: true, postalRequired: true, postalPattern: /^\d{5}(-\d{4})?$/, postalExample: "94105", phonePattern: /^[2-9]\d{9}$/, phoneExample: "415 555 0132" },
  CA: { code: "CA", name: { en: "Canada", ar: "كندا" }, dial: "1", regionKind: "province", regionRequired: true, postalRequired: true, postalPattern: /^[A-Z]\d[A-Z] \d[A-Z]\d$/, postalExample: "K1A 0B1", phonePattern: /^[2-9]\d{9}$/, phoneExample: "613 555 0132" },
  GB: { code: "GB", name: { en: "United Kingdom", ar: "المملكة المتحدة" }, dial: "44", regionKind: "county", regionRequired: false, postalRequired: true, postalPattern: /^[A-Z]{1,2}\d[A-Z\d]? \d[A-Z]{2}$/, postalExample: "SW1A 1AA", phonePattern: /^[1-9]\d{9}$/, phoneExample: "7911 123456", postalFirst: false },
  DE: { code: "DE", name: { en: "Germany", ar: "ألمانيا" }, dial: "49", regionKind: "none", regionRequired: false, postalRequired: true, postalPattern: /^\d{5}$/, postalExample: "10115", phonePattern: /^1\d{9,10}$/, phoneExample: "1512 3456789", postalFirst: true },
  FR: { code: "FR", name: { en: "France", ar: "فرنسا" }, dial: "33", regionKind: "none", regionRequired: false, postalRequired: true, postalPattern: /^\d{5}$/, postalExample: "75001", phonePattern: /^[67]\d{8}$/, phoneExample: "6 12 34 56 78", postalFirst: true },
};

/** Used for any country without its own entry: postal code optional, phone 7 to 14 digits. */
const GENERIC: CountryRule = { code: "", name: { en: "Other", ar: "أخرى" }, dial: "", regionKind: "province", regionRequired: false, postalRequired: false, postalPattern: /^[A-Z0-9][A-Z0-9 -]{1,9}$/, phonePattern: /^\d{7,14}$/, phoneExample: "" };

export const countryRule = (code: string | undefined): CountryRule => (code ? COUNTRY_RULES[code.toUpperCase()] : undefined) ?? { ...GENERIC, code: (code ?? "").toUpperCase() };

/** Country codes the store ships to, Middle East first. */
export const STORE_COUNTRY_CODES = Object.keys(COUNTRY_RULES);

/** Arabic-Indic and Persian digits to Latin, so "٠١٠٠" and "0100" are the same number. */
export const normalizeStoreDigits = (value: string): string =>
  value.replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660)).replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));

/** Upper case, Latin digits, and the country's spacing: "sw1a1aa" becomes "SW1A 1AA", "k1a0b1" becomes "K1A 0B1". */
export function normalizePostalCode(country: string, value: string): string {
  const raw = normalizeStoreDigits(value).toUpperCase().replace(/[\s-]+/g, "");
  const code = country.toUpperCase();
  if (code === "GB" && raw.length >= 5) return `${raw.slice(0, -3)} ${raw.slice(-3)}`;
  if (code === "CA" && raw.length === 6) return `${raw.slice(0, 3)} ${raw.slice(3)}`;
  if (code === "US" && raw.length === 9) return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  return raw;
}

/**
 * The national number: Latin digits with the dial code ("+20", "0020", "20") and the trunk "0" removed.
 * "+20 100 123 4567", "0100 123 4567" and "١٠٠١٢٣٤٥٦٧" all give "1001234567" for Egypt.
 */
export function nationalPhone(country: string, value: string): string {
  const rule = countryRule(country);
  let digits = normalizeStoreDigits(value).replace(/[^\d+]/g, "");
  const international = digits.startsWith("+") || digits.startsWith("00");
  digits = digits.replace(/^\+|^00/, "").replace(/\+/g, "");
  if (rule.dial && (international || digits.length > (rule.phoneExample.replace(/\s/g, "").length || 10))) {
    if (digits.startsWith(rule.dial)) digits = digits.slice(rule.dial.length);
  }
  return digits.replace(/^0+/, "");
}

/** "+201001234567" for a valid number, so the order carries one canonical form. Invalid input comes back cleaned but unchanged in shape. */
export function formatPhoneE164(country: string, value: string): string {
  const rule = countryRule(country);
  const national = nationalPhone(country, value);
  return rule.dial ? `+${rule.dial}${national}` : national ? `+${national}` : "";
}

export const isValidPhone = (country: string, value: string): boolean => countryRule(country).phonePattern.test(nationalPhone(country, value));

export const isValidEmail = (value: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());

export interface ValidateAddressOptions {
  /** Fields to skip, e.g. `["phone"]` for a billing address. */
  skip?: readonly StoreAddressField[];
}

/**
 * Checks an address against its country's rules. Empty result means valid. Required: name, line 1, city; the phone
 * number (unless skipped); the region when the country needs one; the postal code when the country uses one.
 */
export function validateStoreAddress(address: Partial<CommerceAddress>, { skip = [] }: ValidateAddressOptions = {}): AddressErrors {
  const errors: AddressErrors = {};
  const country = address.country ?? "";
  const rule = countryRule(country);
  const trimmed = (v: string | undefined) => (v ?? "").trim();
  const check = (field: StoreAddressField, fn: () => AddressProblem | undefined) => {
    if (skip.includes(field)) return;
    const problem = fn();
    if (problem) errors[field] = problem;
  };
  check("name", () => (!trimmed(address.name) ? "required" : trimmed(address.name).length < 2 ? "tooShort" : trimmed(address.name).length > 80 ? "tooLong" : undefined));
  check("phone", () => (!trimmed(address.phone) ? "required" : isValidPhone(country, address.phone ?? "") ? undefined : "phone"));
  check("line1", () => (!trimmed(address.line1) ? "required" : trimmed(address.line1).length < 3 ? "tooShort" : trimmed(address.line1).length > 120 ? "tooLong" : undefined));
  check("line2", () => (trimmed(address.line2).length > 120 ? "tooLong" : undefined));
  check("city", () => (!trimmed(address.city) ? "required" : trimmed(address.city).length > 60 ? "tooLong" : undefined));
  check("region", () => {
    if (rule.regionKind === "none") return undefined;
    const region = trimmed(address.region);
    if (!region) return rule.regionRequired ? "required" : undefined;
    if (rule.regions && !rule.regions.some((r) => r.id === region)) return "region";
    return region.length > 60 ? "tooLong" : undefined;
  });
  check("postalCode", () => {
    if (rule.noPostal) return undefined;
    const postal = normalizePostalCode(country, address.postalCode ?? "");
    if (!postal) return rule.postalRequired ? "required" : undefined;
    return rule.postalPattern && !rule.postalPattern.test(postal) ? "postalCode" : undefined;
  });
  return errors;
}

export const isAddressValid = (address: Partial<CommerceAddress>, options?: ValidateAddressOptions): boolean => Object.keys(validateStoreAddress(address, options)).length === 0;

/** The address with its fields normalised (trimmed, Latin-digit postal code, E.164 phone), ready to send. */
export function normalizeAddress(address: Partial<CommerceAddress>): Partial<CommerceAddress> {
  const country = (address.country ?? "").toUpperCase();
  const out: Partial<CommerceAddress> = { ...address, country };
  for (const key of ["name", "line1", "line2", "city", "region"] as const) if (typeof out[key] === "string") out[key] = out[key]!.trim().replace(/\s+/g, " ");
  if (address.postalCode !== undefined) out.postalCode = normalizePostalCode(country, address.postalCode);
  if (address.phone) out.phone = formatPhoneE164(country, address.phone);
  return out;
}

/** The lines to print for an address, in the country's order (postal code before the city where that is the custom). `separator` joins city, region and postal code: pass "، " in Arabic. */
export function storeAddressLines(address: Partial<CommerceAddress>, separator = ", "): string[] {
  const rule = countryRule(address.country);
  const postal = address.postalCode ? normalizePostalCode(address.country ?? "", address.postalCode) : "";
  const cityLine = (rule.postalFirst ? [postal, address.city] : [address.city, address.region, postal]).filter(Boolean).join(rule.postalFirst ? " " : separator);
  return [address.line1, address.line2, cityLine].filter((l): l is string => !!l && !!l.trim());
}
