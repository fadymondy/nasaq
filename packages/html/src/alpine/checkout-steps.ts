// nqCheckoutSteps: subscription checkout in five steps (plan, billing, payment, review, success). The markup is
// <x-nq::checkout-steps> (see packages/php); the step machine, validation, card formatting and the pay flow live here.
//
//   <div x-data="nqCheckoutSteps({ plans: [...], currency: 'USD', taxRate: 0.15, taxLabel: 'VAT' })" data-slot="checkout-steps" data-step="plan">…</div>
//
// Config: plans, currency, taxRate, taxLabel, defaultPlanId, defaultInterval, defaultBilling, countries, paymentMethods,
// defaultStep, done (show the button on the success step), labels (string overrides, {0} {1} are the arguments).
//
// React's onComplete Promise becomes events, because HTML has no callback props:
//   nq-checkout-step      { step }                    after every step change
//   nq-checkout-complete  { order, resolve, reject }  cancelable, when the pay button is pressed
//   nq-checkout-done      { reference }               the success-step button
// A page that does nothing is treated as success. To charge the order, call preventDefault() on nq-checkout-complete and
// later detail.resolve({ reference }), detail.resolve({ error }) (stay on review, show the message) or detail.reject(error):
//
//   <div @nq-checkout-complete.prevent="charge($event.detail)"> … </div>
//   charge({ order, resolve, reject }) { fetch('/api/subscribe', { method: 'POST', body: JSON.stringify(order) }).then(() => resolve({ reference: 'SUB-1042' }), reject) }
//
// A function config.onComplete(order) returning a Promise (like React) works too when the page builds the config in JS.
// Only the last four digits, brand and holder of the card are ever in the order; the number and code never leave the form.
//
// nqPaymentMethodForm is the payment step on its own: x-modelable="payment" (method, number, holder, expiry, cvc).
// Both share one mixin, so the payment markup is the same inside the checkout and standalone.

import type { Magics, Register } from "./types";

import { defaultCurrency, formatMoney } from "../core/money";

/* ------------------------------------------------------------------ strings */

export const STRINGS = {
  en: {
    steps: "Checkout steps",
    plan: "Plan",
    billing: "Billing details",
    payment: "Payment method",
    review: "Review",
    success: "Done",
    stepOf: (n: string, total: string) => `Step ${n} of ${total}`,
    planTitle: "Choose your plan",
    planDescription: "You can change or cancel it at any time.",
    interval: "Billing period",
    monthly: "Monthly",
    yearly: "Yearly",
    save: (pct: string) => `Save ${pct}`,
    billedYearly: (total: string) => `Billed ${total} yearly`,
    billedMonthly: "Billed monthly",
    choose: "Choose plan",
    selected: "Selected",
    continue: "Continue",
    back: "Back",
    billingTitle: "Billing details",
    billingDescription: "Shown on your invoices.",
    name: "Full name",
    email: "Billing email",
    company: "Company (optional)",
    taxId: "Tax number (optional)",
    country: "Country",
    address: "Street address",
    city: "City",
    postalCode: "Postal code",
    required: "This field is required.",
    invalidEmail: "Enter a valid email address.",
    paymentTitle: "Payment method",
    paymentDescription: "You are not charged until you confirm on the next step.",
    reviewTitle: "Review and confirm",
    reviewDescription: "Check everything before you pay.",
    edit: "Edit",
    terms: "I agree to the terms of service and the billing policy.",
    termsRequired: "Accept the terms to continue.",
    pay: (total: string) => `Pay ${total}`,
    paying: "Processing payment",
    failed: "The payment could not be completed. Check your details and try again.",
    summary: "Order summary",
    subtotal: "Subtotal",
    tax: "Tax",
    total: "Total due today",
    perMonth: "per month",
    perYear: "per year",
    successTitle: "You are all set",
    successDescription: (plan: string) => `Your ${plan} subscription is active. A receipt is on its way to your email.`,
    reference: "Reference",
    done: "Go to dashboard",
    cardEnding: (brand: string, last4: string) => `${brand} ending in ${last4}`,
    bankTransfer: "Bank transfer",
    card: "Credit or debit card",
    cardDescription: "Visa, Mastercard, American Express and mada.",
    bankDescription: "We email the bank details and activate the plan when the transfer lands.",
    bankNote: "Your plan starts as soon as the transfer is received, usually within one working day.",
    cardNumber: "Card number",
    cardHolder: "Name on card",
    expiry: "Expiry (MM/YY)",
    cvc: "Security code",
    invalidCard: "Enter a valid card number.",
    invalidExpiry: "Enter a valid expiry date.",
    invalidCvc: "Enter the security code.",
    secure: "Card details are entered here for display only. Nasaq never stores or sends them.",
    unknownBrand: "Card",
    method: "Payment method",
  },
  ar: {
    steps: "خطوات الدفع",
    plan: "الخطة",
    billing: "بيانات الفوترة",
    payment: "طريقة الدفع",
    review: "المراجعة",
    success: "تم",
    stepOf: (n: string, total: string) => `الخطوة ${n} من ${total}`,
    planTitle: "اختر خطتك",
    planDescription: "يمكنك تغييرها أو إلغاؤها في أي وقت.",
    interval: "فترة الفوترة",
    monthly: "شهري",
    yearly: "سنوي",
    save: (pct: string) => `وفّر ${pct}`,
    billedYearly: (total: string) => `تُحاسَب ${total} سنويًا`,
    billedMonthly: "تُحاسَب شهريًا",
    choose: "اختر الخطة",
    selected: "الخطة المختارة",
    continue: "متابعة",
    back: "رجوع",
    billingTitle: "بيانات الفوترة",
    billingDescription: "تظهر في فواتيرك.",
    name: "الاسم الكامل",
    email: "بريد الفوترة",
    company: "الشركة (اختياري)",
    taxId: "الرقم الضريبي (اختياري)",
    country: "الدولة",
    address: "العنوان",
    city: "المدينة",
    postalCode: "الرمز البريدي",
    required: "هذا الحقل مطلوب.",
    invalidEmail: "أدخل بريدًا إلكترونيًا صحيحًا.",
    paymentTitle: "طريقة الدفع",
    paymentDescription: "لن يُخصم منك شيء إلا بعد التأكيد في الخطوة التالية.",
    reviewTitle: "راجع وأكّد",
    reviewDescription: "تأكد من كل شيء قبل الدفع.",
    edit: "تعديل",
    terms: "أوافق على شروط الخدمة وسياسة الفوترة.",
    termsRequired: "وافق على الشروط للمتابعة.",
    pay: (total: string) => `ادفع ${total}`,
    paying: "جارٍ معالجة الدفع",
    failed: "تعذّر إتمام الدفع. تحقق من بياناتك وحاول مرة أخرى.",
    summary: "ملخص الطلب",
    subtotal: "المجموع الفرعي",
    tax: "الضريبة",
    total: "المستحق اليوم",
    perMonth: "شهريًا",
    perYear: "سنويًا",
    successTitle: "تم تفعيل اشتراكك",
    successDescription: (plan: string) => `اشتراكك في خطة ${plan} فعّال. أرسلنا الإيصال إلى بريدك.`,
    reference: "المرجع",
    done: "الذهاب إلى لوحة التحكم",
    cardEnding: (brand: string, last4: string) => `${brand} تنتهي بـ ${last4}`,
    bankTransfer: "تحويل بنكي",
    card: "بطاقة ائتمان أو خصم",
    cardDescription: "فيزا وماستركارد وأمريكان إكسبرس ومدى.",
    bankDescription: "نرسل بيانات الحساب البنكي ونفعّل الخطة عند وصول التحويل.",
    bankNote: "تبدأ خطتك فور استلام التحويل، عادةً خلال يوم عمل واحد.",
    cardNumber: "رقم البطاقة",
    cardHolder: "الاسم على البطاقة",
    expiry: "تاريخ الانتهاء (شهر/سنة)",
    cvc: "رمز الأمان",
    invalidCard: "أدخل رقم بطاقة صحيحًا.",
    invalidExpiry: "أدخل تاريخ انتهاء صحيحًا.",
    invalidCvc: "أدخل رمز الأمان.",
    secure: "تُدخَل بيانات البطاقة هنا للعرض فقط. لا يخزّنها نسق ولا يرسلها.",
    unknownBrand: "بطاقة",
    method: "طريقة الدفع",
  },
};

const BRAND_NAME: Record<CardBrand, [string, string]> = {
  visa: ["Visa", "Visa"],
  mastercard: ["Mastercard", "Mastercard"],
  amex: ["American Express", "American Express"],
  mada: ["mada", "مدى"],
  unknown: ["Card", "بطاقة"],
};

type StringKey = keyof typeof STRINGS.en;
type Labels = Partial<Record<StringKey, string>>;

/** One string for the locale, with config.labels laid over it. Overrides are templates: {0}, {1} are the arguments. */
export function checkoutText(locale: string, labels: Labels | undefined, key: StringKey, ...args: string[]): string {
  const override = labels?.[key];
  if (typeof override === "string") return override.replace(/\{(\d+)\}/g, (_, i: string) => args[Number(i)] ?? "");
  const entry = STRINGS[/^ar\b/i.test(locale) ? "ar" : "en"][key] as string | ((...a: string[]) => string);
  return typeof entry === "function" ? entry(...args) : entry;
}

/* ------------------------------------------------------------------ card format */

/*
 * Pure helpers for the presentational card fields. Nothing here validates a card with a processor: the
 * checks (length, Luhn, expiry) only catch typos before the caller's own payment provider takes over.
 */

export type CardBrand = "visa" | "mastercard" | "amex" | "mada" | "unknown";

/** Digits only, at most 19. Accepts Arabic-Indic and Persian digits so a pasted "٤٢٤٢" works. */
export function cardDigits(input: string): string {
  return input
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/\D/g, "")
    .slice(0, 19);
}

/** The brand from the leading digits. Text only: Nasaq does not ship card brand artwork. */
export function detectBrand(input: string): CardBrand {
  const n = cardDigits(input);
  if (/^(4026|417500|4508|4844|4913|4917|446404|588845|636120|968)/.test(n)) return "mada";
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  return "unknown";
}

/** "4242424242424242" -> "4242 4242 4242 4242"; American Express groups 4-6-5. */
export function formatCardNumber(input: string): string {
  const n = cardDigits(input);
  if (detectBrand(n) === "amex") return [n.slice(0, 4), n.slice(4, 10), n.slice(10, 15)].filter(Boolean).join(" ");
  return (n.match(/.{1,4}/g) ?? []).join(" ");
}

/** The Luhn checksum every real card number satisfies. */
export function luhn(input: string): boolean {
  const n = cardDigits(input);
  if (n.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = n.length - 1; i >= 0; i--) {
    let d = Number(n[i]);
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

export function isCardNumberValid(input: string): boolean {
  const n = cardDigits(input);
  const brand = detectBrand(n);
  const lengthOk = brand === "amex" ? n.length === 15 : n.length >= 13 && n.length <= 19;
  return lengthOk && luhn(n);
}

/** "1226" -> "12/26", "3" -> "03/", "13" -> "1/3": the month is padded and clamped as the user types. */
export function formatExpiry(input: string): string {
  let d = cardDigits(input).slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = `0${d}`;
  if (d.length >= 2 && Number(d.slice(0, 2)) > 12) d = `1${d.slice(1)}`.slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d.length === 2 && input.endsWith("/") ? `${d}/` : d;
}

/** True when "MM/YY" is a real month that is not before `now`'s month. */
export function isExpiryValid(value: string, now: Date = new Date()): boolean {
  const m = /^(\d{2})\/(\d{2})$/.exec(value);
  if (!m) return false;
  const month = Number(m[1]);
  const year = 2000 + Number(m[2]);
  if (month < 1 || month > 12) return false;
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

export function isCvcValid(value: string, brand: CardBrand): boolean {
  const digits = value.replace(/\s/g, "");
  return /^\d+$/.test(digits) && digits.length === (brand === "amex" ? 4 : 3);
}

/** The last four digits, for the review step and the receipt. Never keep more than this. */
export const lastFour = (input: string) => cardDigits(input).slice(-4);


/* ------------------------------------------------------------------ types and pure helpers */

export type CheckoutInterval = "month" | "year";
export type CheckoutStep = "plan" | "billing" | "payment" | "review" | "success";
export type PaymentMethodKind = "card" | "bank";

export interface CheckoutPlan {
  id: string;
  name: string;
  description?: string;
  /** Price for one month when billed monthly. */
  monthlyPrice: number;
  /** Price for a whole year when billed yearly. Default `monthlyPrice * 12`. */
  yearlyPrice?: number;
  features?: string[];
  badge?: string;
  highlighted?: boolean;
}

export interface CheckoutBilling {
  name: string;
  email: string;
  company: string;
  taxId: string;
  country: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface CheckoutCountry {
  value: string;
  label: string;
}

export interface CheckoutPaymentSummary {
  method: PaymentMethodKind;
  brand?: CardBrand;
  last4?: string;
  holder?: string;
  expiry?: string;
}

export interface CheckoutOrder {
  planId: string;
  interval: CheckoutInterval;
  billing: CheckoutBilling;
  payment: CheckoutPaymentSummary;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
}

export interface CheckoutResult {
  error?: string;
  reference?: string;
}

export interface PaymentFormValue {
  method: PaymentMethodKind;
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
}

export type PaymentFormErrors = Partial<Record<"number" | "holder" | "expiry" | "cvc", string>>;

export interface CheckoutConfig {
  plans: CheckoutPlan[];
  currency?: string;
  taxRate?: number;
  taxLabel?: string;
  defaultPlanId?: string;
  defaultInterval?: CheckoutInterval;
  defaultBilling?: Partial<CheckoutBilling>;
  countries?: CheckoutCountry[];
  paymentMethods?: PaymentMethodKind[];
  defaultStep?: Exclude<CheckoutStep, "success">;
  /** Show the button on the success step (it dispatches nq-checkout-done). */
  done?: boolean;
  labels?: Labels;
  onComplete?: (order: CheckoutOrder) => Promise<void | CheckoutResult> | void | CheckoutResult;
}

export const STEP_ORDER: CheckoutStep[] = ["plan", "billing", "payment", "review", "success"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const round2 = (n: number) => Math.round(n * 100) / 100;

export const emptyPaymentForm: PaymentFormValue = { method: "card", number: "", holder: "", expiry: "", cvc: "" };

const DEFAULT_COUNTRIES: Record<"en" | "ar", CheckoutCountry[]> = {
  en: [
    { value: "SA", label: "Saudi Arabia" },
    { value: "AE", label: "United Arab Emirates" },
    { value: "EG", label: "Egypt" },
    { value: "KW", label: "Kuwait" },
    { value: "US", label: "United States" },
    { value: "GB", label: "United Kingdom" },
  ],
  ar: [
    { value: "SA", label: "المملكة العربية السعودية" },
    { value: "AE", label: "الإمارات العربية المتحدة" },
    { value: "EG", label: "مصر" },
    { value: "KW", label: "الكويت" },
    { value: "US", label: "الولايات المتحدة" },
    { value: "GB", label: "المملكة المتحدة" },
  ],
};

/** The price of a plan for an interval. */
export function planTotal(plan: CheckoutPlan, interval: CheckoutInterval): number {
  return interval === "year" ? (plan.yearlyPrice ?? plan.monthlyPrice * 12) : plan.monthlyPrice;
}

/** Validates the card fields. An empty result means the form can continue. Bank transfer has nothing to check. */
export function validatePaymentForm(
  value: PaymentFormValue,
  t: { required: string; invalidCard: string; invalidExpiry: string; invalidCvc: string },
  now = new Date(),
): PaymentFormErrors {
  if (value.method !== "card") return {};
  const errors: PaymentFormErrors = {};
  if (!isCardNumberValid(value.number)) errors.number = value.number.trim() ? t.invalidCard : t.required;
  if (!value.holder.trim()) errors.holder = t.required;
  if (!isExpiryValid(value.expiry, now)) errors.expiry = value.expiry.trim() ? t.invalidExpiry : t.required;
  if (!isCvcValid(value.cvc, detectBrand(value.number))) errors.cvc = value.cvc.trim() ? t.invalidCvc : t.required;
  return errors;
}

/* ------------------------------------------------------------------ state */

interface NqStore {
  locale: string;
  currency?: string;
  t(en: string, ar: string): string;
}

const blankPaymentErrors = () => ({ number: "", holder: "", expiry: "", cvc: "" });
const blankBillingErrors = (): Record<keyof CheckoutBilling, string> => ({
  name: "",
  email: "",
  company: "",
  taxId: "",
  country: "",
  address: "",
  city: "",
  postalCode: "",
});

interface PaymentHost extends Magics {
  $store: { nq: NqStore };
  labels: Labels;
  payment: PaymentFormValue;
  paymentErrors: Record<"number" | "holder" | "expiry" | "cvc", string>;
  brand: CardBrand;
  text(key: StringKey, ...args: string[]): string;
  clearPaymentErrors(): void;
}

/** Everything the payment fields need. Spread (with descriptors, so getters survive) into the checkout and the standalone form. */
function paymentMixin(): Record<string, unknown> & ThisType<PaymentHost> {
  return {
    text(key: StringKey, ...args: string[]) {
      return checkoutText(this.$store.nq.locale, this.labels, key, ...args);
    },
    get brand(): CardBrand {
      return detectBrand(this.payment.number);
    },
    get brandName(): string {
      return BRAND_NAME[this.brand][/^ar\b/i.test(this.$store.nq.locale) ? 1 : 0];
    },
    get cvcPlaceholder(): string {
      return this.brand === "amex" ? "1234" : "123";
    },
    clearPaymentErrors() {
      this.paymentErrors = blankPaymentErrors();
    },
    // The handlers write the formatted text back, so a rejected character (a letter) does not linger in the box.
    onNumber(e: Event) {
      const el = e.target as HTMLInputElement;
      const next = formatCardNumber(el.value);
      if (el.value !== next) el.value = next;
      this.payment.number = next;
      this.clearPaymentErrors();
    },
    onHolder(e: Event) {
      this.payment.holder = (e.target as HTMLInputElement).value;
      this.clearPaymentErrors();
    },
    onExpiry(e: Event) {
      const el = e.target as HTMLInputElement;
      const next = formatExpiry(el.value);
      if (el.value !== next) el.value = next;
      this.payment.expiry = next;
      this.clearPaymentErrors();
    },
    onCvc(e: Event) {
      const el = e.target as HTMLInputElement;
      const next = cardDigits(el.value).slice(0, 4);
      if (el.value !== next) el.value = next;
      this.payment.cvc = next;
      this.clearPaymentErrors();
    },
    /** Runs the card checks and fills paymentErrors. True when the form can continue. */
    validatePayment(): boolean {
      const errors = validatePaymentForm(this.payment, {
        required: this.text("required"),
        invalidCard: this.text("invalidCard"),
        invalidExpiry: this.text("invalidExpiry"),
        invalidCvc: this.text("invalidCvc"),
      });
      this.paymentErrors = { ...blankPaymentErrors(), ...errors };
      return Object.keys(errors).length === 0;
    },
  };
}

function withMixin<T extends object>(data: T, mixin: object): T {
  Object.defineProperties(data, Object.getOwnPropertyDescriptors(mixin));
  return data;
}

interface CheckoutHost extends PaymentHost {
  config: CheckoutConfig;
  plans: CheckoutPlan[];
  methods: PaymentMethodKind[];
  step: CheckoutStep;
  planId: string;
  interval: CheckoutInterval;
  intervalValue: string[];
  billing: CheckoutBilling;
  billingErrors: Record<keyof CheckoutBilling, string>;
  accepted: boolean;
  termsError: string;
  busy: boolean;
  error: string;
  reference: string;
  plan: CheckoutPlan | undefined;
  index: number;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  last4: string;
  money(amount: number): string;
  setStep(next: CheckoutStep): void;
  validateBilling(): boolean;
  order(): CheckoutOrder;
  runComplete(order: CheckoutOrder): Promise<void | CheckoutResult>;
}

export const checkoutSteps: Register = (Alpine) => {
  Alpine.data("nqCheckoutSteps", (config: CheckoutConfig) => {
    const plans = config.plans ?? [];
    const methods = config.paymentMethods?.length ? [...config.paymentMethods] : (["card", "bank"] as PaymentMethodKind[]);
    const interval: CheckoutInterval = config.defaultInterval === "year" ? "year" : "month";
    const data = {
      config,
      plans,
      methods,
      labels: config.labels ?? {},
      step: (config.defaultStep ?? "plan") as CheckoutStep,
      planId: config.defaultPlanId ?? plans.find((p) => p.highlighted)?.id ?? plans[0]?.id ?? "",
      interval,
      intervalValue: [interval],
      billing: { name: "", email: "", company: "", taxId: "", country: "SA", address: "", city: "", postalCode: "", ...config.defaultBilling } as CheckoutBilling,
      // Errors are strings, "" meaning none: they feed nqField's x-modelable invalid and x-text.
      billingErrors: blankBillingErrors(),
      payment: { ...emptyPaymentForm, method: methods[0] ?? "card" } as PaymentFormValue,
      paymentErrors: blankPaymentErrors(),
      accepted: false,
      termsError: "",
      busy: false,
      error: "",
      reference: "",

      init(this: CheckoutHost) {
        this.$watch<string[]>("intervalValue", (v) => {
          if (!v.length) this.intervalValue = [this.interval];
          else if (v[0] !== this.interval) this.interval = v[0] as CheckoutInterval;
        });
        this.$watch("payment.method", () => this.clearPaymentErrors());
        this.$watch<boolean>("accepted", (v) => {
          if (v) this.termsError = "";
        });
        this.$watch<string>("billing.country", () => {
          this.billingErrors.country = "";
        });
        // Move focus to the new step's heading so keyboard and screen reader users land on the content.
        this.$watch<CheckoutStep>("step", (s) => {
          this.$nextTick(() => (s === "success" ? this.$refs.successHeading : this.$refs.heading)?.focus());
        });
      },

      /* derived */
      get currency(): string {
        const nq = (this as unknown as CheckoutHost).$store.nq;
        return (this as unknown as CheckoutHost).config.currency ?? nq.currency ?? defaultCurrency(nq.locale);
      },
      get ar(): boolean {
        return /^ar\b/i.test((this as unknown as CheckoutHost).$store.nq.locale);
      },
      get plan(): CheckoutPlan | undefined {
        const h = this as unknown as CheckoutHost;
        return h.plans.find((p) => p.id === h.planId) ?? h.plans[0];
      },
      get index(): number {
        return STEP_ORDER.indexOf((this as unknown as CheckoutHost).step);
      },
      get subtotal(): number {
        const h = this as unknown as CheckoutHost;
        return h.plan ? planTotal(h.plan, h.interval) : 0;
      },
      get tax(): number {
        const h = this as unknown as CheckoutHost;
        return round2(h.subtotal * (h.config.taxRate ?? 0));
      },
      get total(): number {
        const h = this as unknown as CheckoutHost;
        return round2(h.subtotal + h.tax);
      },
      get yearlySaving(): number {
        const p = (this as unknown as CheckoutHost).plan;
        return p && p.yearlyPrice !== undefined ? 1 - p.yearlyPrice / (p.monthlyPrice * 12) : 0;
      },
      /** "Save 17%" or "" when the yearly price saves nothing. */
      get saveText(): string {
        const h = this as unknown as CheckoutHost & { yearlySaving: number };
        if (h.yearlySaving <= 0.005) return "";
        const pct = new Intl.NumberFormat(`${h.$store.nq.locale}-u-nu-latn`, { style: "percent", maximumFractionDigits: 0 }).format(h.yearlySaving);
        return h.text("save", pct);
      },
      get countryList(): CheckoutCountry[] {
        const h = this as unknown as CheckoutHost & { ar: boolean };
        return h.config.countries ?? DEFAULT_COUNTRIES[h.ar ? "ar" : "en"];
      },
      get countryLabel(): string {
        const h = this as unknown as CheckoutHost & { countryList: CheckoutCountry[] };
        return h.countryList.find((c) => c.value === h.billing.country)?.label ?? h.billing.country;
      },
      get last4(): string {
        return lastFour((this as unknown as CheckoutHost).payment.number);
      },
      get taxLabel(): string {
        const h = this as unknown as CheckoutHost;
        return h.config.taxLabel ?? h.text("tax");
      },
      get heading(): string {
        const h = this as unknown as CheckoutHost;
        return h.text(`${h.step}Title` as StringKey);
      },
      get description(): string {
        const h = this as unknown as CheckoutHost;
        return h.step === "success" ? "" : h.text(`${h.step}Description` as StringKey);
      },
      get billingLine(): string {
        const h = this as unknown as CheckoutHost & { countryLabel: string; ar: boolean };
        return [h.billing.address, h.billing.city, h.billing.postalCode, h.countryLabel].filter(Boolean).join(h.ar ? "، " : ", ");
      },
      get paymentLine(): string {
        const h = this as unknown as CheckoutHost & { brandName: string };
        return h.payment.method === "card" ? h.text("cardEnding", h.brandName, `⁦${h.last4}⁩`) : h.text("bankTransfer");
      },

      /* helpers for the markup */
      money(this: CheckoutHost, amount: number): string {
        return formatMoney(amount, { locale: this.$store.nq.locale, currency: this.currency });
      },
      /** The monthly figure shown on a plan card: the yearly price over twelve while billing yearly. */
      planAmount(this: CheckoutHost, id: string): number {
        const p = this.plans.find((x) => x.id === id);
        if (!p) return 0;
        return this.interval === "year" && p.yearlyPrice !== undefined ? round2(p.yearlyPrice / 12) : p.monthlyPrice;
      },
      planNote(this: CheckoutHost, id: string): string {
        const p = this.plans.find((x) => x.id === id);
        return this.interval === "year" && p?.yearlyPrice !== undefined ? this.text("billedYearly", this.money(p.yearlyPrice)) : this.text("billedMonthly");
      },
      choose(this: CheckoutHost, id: string) {
        this.planId = id;
      },
      stepTitle(this: CheckoutHost, id: CheckoutStep): string {
        return this.text(id);
      },
      /** "complete" | "current" | "upcoming", for the stepper (success completes every step). */
      status(this: CheckoutHost, i: number): "complete" | "current" | "upcoming" {
        const current = this.step === "success" ? STEP_ORDER.length : this.index;
        return i < current ? "complete" : i === current ? "current" : "upcoming";
      },
      statusText(this: CheckoutHost & { status(i: number): string }, i: number): string {
        const s = this.status(i);
        return this.$store.nq.t(
          s === "complete" ? "Completed" : s === "current" ? "Current step" : "Upcoming",
          s === "complete" ? "مكتملة" : s === "current" ? "الخطوة الحالية" : "قادمة",
        );
      },
      canGo(this: CheckoutHost, i: number): boolean {
        return this.step !== "success" && i < this.index && !this.busy;
      },
      goTo(this: CheckoutHost, i: number) {
        const id = STEP_ORDER[i];
        if (id && (this as unknown as { canGo(i: number): boolean }).canGo(i)) this.setStep(id);
      },
      stepOfText(this: CheckoutHost): string {
        return `${this.text("stepOf", String(this.index + 1), String(STEP_ORDER.length - 1))} · ${this.text(this.step as StringKey)}`;
      },

      /* flow */
      setStep(this: CheckoutHost, next: CheckoutStep) {
        this.step = next;
        this.$root.dispatchEvent(new CustomEvent("nq-checkout-step", { bubbles: true, detail: { step: next } }));
      },
      clearBilling(this: CheckoutHost, key: keyof CheckoutBilling) {
        if (this.billingErrors[key]) this.billingErrors[key] = "";
      },
      validateBilling(this: CheckoutHost): boolean {
        const errors = blankBillingErrors();
        for (const key of ["name", "country", "address", "city"] as const) if (!this.billing[key].trim()) errors[key] = this.text("required");
        if (!this.billing.email.trim()) errors.email = this.text("required");
        else if (!EMAIL.test(this.billing.email.trim())) errors.email = this.text("invalidEmail");
        this.billingErrors = errors;
        return Object.values(errors).every((e) => !e);
      },
      next(this: CheckoutHost) {
        if (this.step === "billing" && !this.validateBilling()) return;
        if (this.step === "payment" && !(this as unknown as { validatePayment(): boolean }).validatePayment()) return;
        this.setStep(STEP_ORDER[this.index + 1] ?? "success");
      },
      back(this: CheckoutHost) {
        this.setStep(STEP_ORDER[Math.max(0, this.index - 1)] ?? "plan");
      },
      order(this: CheckoutHost): CheckoutOrder {
        const card = this.payment.method === "card";
        return {
          planId: this.plan?.id ?? "",
          interval: this.interval,
          billing: { ...this.billing },
          payment: card
            ? { method: "card", brand: this.brand, last4: this.last4, holder: this.payment.holder.trim(), expiry: this.payment.expiry }
            : { method: "bank" },
          currency: this.currency,
          subtotal: this.subtotal,
          tax: this.tax,
          total: this.total,
        };
      },
      /** Confirms the order: config.onComplete, else the cancelable nq-checkout-complete event (see the header). */
      runComplete(this: CheckoutHost, order: CheckoutOrder): Promise<void | CheckoutResult> {
        if (typeof this.config.onComplete === "function") return Promise.resolve().then(() => this.config.onComplete?.(order));
        return new Promise((resolve, reject) => {
          const event = new CustomEvent("nq-checkout-complete", { bubbles: true, cancelable: true, detail: { order, resolve, reject } });
          this.$root.dispatchEvent(event);
          if (!event.defaultPrevented) resolve();
        });
      },
      async pay(this: CheckoutHost) {
        if (this.busy) return;
        if (!this.accepted) {
          this.termsError = this.text("termsRequired");
          return;
        }
        this.busy = true;
        this.error = "";
        try {
          const result = await this.runComplete(this.order());
          if (result && result.error) {
            this.error = result.error;
            return;
          }
          this.reference = (result && result.reference) || "";
          this.setStep("success");
        } catch (e) {
          this.error = e instanceof Error && e.message ? e.message : typeof e === "string" && e ? e : this.text("failed");
        } finally {
          this.busy = false;
        }
      },
      done(this: CheckoutHost) {
        this.$root.dispatchEvent(new CustomEvent("nq-checkout-done", { bubbles: true, detail: { reference: this.reference } }));
      },
    };
    return withMixin(data, paymentMixin());
  });

  Alpine.data("nqPaymentMethodForm", (config: { methods?: PaymentMethodKind[]; labels?: Labels; value?: Partial<PaymentFormValue> } = {}) => {
    const methods = config.methods?.length ? config.methods : (["card", "bank"] as PaymentMethodKind[]);
    const data = {
      labels: config.labels ?? {},
      payment: { ...emptyPaymentForm, method: methods[0] ?? "card", ...config.value } as PaymentFormValue,
      paymentErrors: blankPaymentErrors(),
      init(this: PaymentHost) {
        this.$watch("payment.method", () => this.clearPaymentErrors());
      },
    };
    return withMixin(data, paymentMixin());
  });
};
