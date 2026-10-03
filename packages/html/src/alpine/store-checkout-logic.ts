// Pure logic of the store checkout (address rules per country, the checkout state machine, totals with COD and gift-wrap fees, delivery window). Copy of the React and Vue modules; kept in sync by hand.
// Includes the copies of the commerce types and helpers it needs. Money is integer minor units.
export type CommerceOrderStatus = string;
export type CommercePaymentStatus = string;
export interface CommerceOrderEvent { at: string; kind: string; label: string; by?: string; note?: string }

export type CommerceMoney = number;

export interface CommerceCartLine {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  variantLabel?: string;
  image?: string;
  unitPrice: CommerceMoney;
  compareAt?: CommerceMoney;
  quantity: number;
  maxQuantity?: number;
  savedForLater?: boolean;
}

export interface CommerceAddress {
  id?: string;
  name: string;
  phone?: string;
  line1: string;
  line2?: string;
  city: string;
  region?: string;
  postalCode?: string;
  /** ISO 3166-1 alpha-2 */
  country: string;
  isDefault?: boolean;
}

export interface CommerceShippingMethod {
  id: string;
  label: string;
  price: CommerceMoney;
  /** Free when the subtotal reaches this. */
  freeOver?: CommerceMoney;
  etaDays?: [number, number];
  kind?: "delivery" | "pickup" | "express";
}

export interface CommerceTotals {
  subtotal: CommerceMoney;
  discount: CommerceMoney;
  shipping: CommerceMoney;
  tax: CommerceMoney;
  total: CommerceMoney;
  itemCount: number;
  savings: CommerceMoney;
}

export interface CommerceOrder {
  id: string;
  number: string;
  placedAt: string;
  status: CommerceOrderStatus;
  payment: CommercePaymentStatus;
  customer: { name: string; email?: string; phone?: string };
  lines: (CommerceCartLine & { fulfilled?: number; refunded?: number; returned?: number })[];
  shippingAddress?: CommerceAddress;
  billingAddress?: CommerceAddress;
  shippingMethod?: CommerceShippingMethod;
  totals: CommerceTotals;
  tracking?: { carrier: string; number: string; url?: string };
  events?: CommerceOrderEvent[];
  notes?: string;
}

export type CommercePaymentKind = "card" | "cod" | "local" | "wallet";

export interface CommercePaymentPolicy {
  card?: boolean;
  cod?: {
    /** Largest order paid on delivery, minor units. */
    maxTotal?: CommerceMoney;
    /** Countries it is offered in. Default: everywhere. */
    countries?: readonly string[];
    /** Fee added to the order, minor units. */
    fee?: CommerceMoney;
  };
  /** The shopper's wallet balance, minor units. */
  wallet?: { balance: CommerceMoney };
  /** Local methods (bank transfer, mobile wallets) with their limits. */
  local?: readonly { id: string; min?: number; max?: number }[];
}

export interface CommerceTotalsInput {
  lines: readonly CommerceCartLine[];
  discount?: CommerceMoney;
  shipping?: CommerceShippingMethod;
  /** Basis points, e.g. 1400 = 14%. */
  taxBps?: number;
  taxInclusive?: boolean;
}

/** Cart/checkout totals. Saved-for-later lines are ignored. Tax rounds half up once on the order. */
export function commerceTotals({ lines, discount = 0, shipping, taxBps = 0, taxInclusive = false }: CommerceTotalsInput): CommerceTotals {
  const active = lines.filter((l) => !l.savedForLater);
  const subtotal = active.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const savings = active.reduce((s, l) => s + (l.compareAt && l.compareAt > l.unitPrice ? (l.compareAt - l.unitPrice) * l.quantity : 0), 0);
  const itemCount = active.reduce((s, l) => s + l.quantity, 0);
  const applied = Math.min(Math.max(discount, 0), subtotal);
  const shippingCost = shipping ? (shipping.freeOver !== undefined && subtotal - applied >= shipping.freeOver ? 0 : shipping.price) : 0;
  const base = subtotal - applied;
  const tax = taxBps
    ? taxInclusive
      ? base - Math.round((base * 10000) / (10000 + taxBps))
      : Math.round((base * taxBps) / 10000)
    : 0;
  const total = base + shippingCost + (taxInclusive ? 0 : tax);
  return { subtotal, discount: applied, shipping: shippingCost, tax, total, itemCount, savings: savings + applied };
}

export interface CommerceCheckoutSummaryInput {
  lines: readonly CommerceCartLine[];
  /** Promo and other discount, minor units. */
  discount?: CommerceMoney;
  shippingMethod?: CommerceShippingMethod;
  taxBps?: number;
  taxInclusive?: boolean;
  paymentKind?: CommercePaymentKind;
  policy?: CommercePaymentPolicy;
  giftWrap?: boolean;
  /** Price of gift wrapping, minor units. */
  giftWrapFee?: CommerceMoney;
}

export interface CommerceCheckoutSummary extends CommerceTotals {
  /** Cash-on-delivery fee, 0 unless paying on delivery. */
  codFee: CommerceMoney;
  giftWrapFee: CommerceMoney;
  /** What the shopper pays: `total` plus fees. */
  payable: CommerceMoney;
}

/** The order totals: `commerceTotals` plus the COD and gift-wrap fees. */
export function commerceCheckoutSummary({ lines, discount, shippingMethod, taxBps, taxInclusive, paymentKind, policy, giftWrap, giftWrapFee = 0 }: CommerceCheckoutSummaryInput): CommerceCheckoutSummary {
  const totals = commerceTotals({ lines, ...(discount !== undefined ? { discount } : {}), ...(shippingMethod ? { shipping: shippingMethod } : {}), ...(taxBps !== undefined ? { taxBps } : {}), ...(taxInclusive !== undefined ? { taxInclusive } : {}) });
  const codFee = paymentKind === "cod" ? (policy?.cod?.fee ?? 0) : 0;
  const wrap = giftWrap ? giftWrapFee : 0;
  return { ...totals, codFee, giftWrapFee: wrap, payable: totals.total + codFee + wrap };
}

export interface CommerceDeliveryWindow {
  /** ISO dates (YYYY-MM-DD). */
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

/**
 * Delivery window from an order time and a range of days. Works on UTC calendar days so results do not depend on the
 * machine's time zone. `skipWeekdays` (0 = Sunday to 6 = Saturday) are not counted as delivery days.
 */
export function commerceDeliveryWindow(
  now: Date | string | number,
  days: readonly [number, number],
  opts: { skipWeekdays?: readonly number[]; cutoffHour?: number } = {},
): CommerceDeliveryWindow {
  const skip = new Set(opts.skipWeekdays ?? []);
  const start = new Date(now);
  let day = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
  if (opts.cutoffHour !== undefined && start.getUTCHours() >= opts.cutoffHour) day += DAY_MS;
  const add = (n: number) => {
    let cursor = day;
    let left = Math.max(0, Math.floor(n));
    let guard = 0;
    while (left > 0 && guard++ < 400) {
      cursor += DAY_MS;
      if (!skip.has(new Date(cursor).getUTCDay())) left--;
    }
    while (skip.has(new Date(cursor).getUTCDay()) && skip.size < 7 && guard++ < 800) cursor += DAY_MS;
    return cursor;
  };
  const lo = Math.min(days[0], days[1]);
  const hi = Math.max(days[0], days[1]);
  const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
  return { from: iso(add(lo)), to: iso(add(hi)) };
}
/*
 * Country-aware address rules for checkout: which fields a country needs, how its postal code and phone number look,
 * normalising what people type (Arabic digits, spacing, case) and validating an address. Problems are codes, never
 * sentences, so the form can show them in any language. Plain TypeScript.
 */

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
/*
 * The checkout state machine, as pure functions: which section is open, which are done, what is wrong, and the
 * editing / submitting / failed / placed status of the order. Also payment availability, the payable total with
 * fees, delivery ETAs and the order a completed checkout produces. Money is integer minor units. Plain TypeScript, so it
 * runs under node --test. The component only renders this state and dispatches events.
 */

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
