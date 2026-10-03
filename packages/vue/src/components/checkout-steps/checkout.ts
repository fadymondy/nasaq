import { computed, type ComputedRef } from "vue";
import { useNasaq } from "../../provider";
import { type CardBrand, detectBrand, isCardNumberValid, isCvcValid, isExpiryValid } from "./card-format";

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

export type CheckoutStrings = typeof STRINGS.en;
export type CheckoutLabels = Partial<CheckoutStrings>;

/** The built-in strings for the active locale with `labels` laid over them. */
export function useCheckoutStrings(labels?: () => CheckoutLabels | undefined): {
  t: ComputedRef<CheckoutStrings>;
  ar: ComputedRef<boolean>;
  locale: ComputedRef<string>;
} {
  const nq = useNasaq();
  const ar = computed(() => nq.locale.value.startsWith("ar"));
  const t = computed(() => ({ ...STRINGS[ar.value ? "ar" : "en"], ...labels?.() }) as CheckoutStrings);
  return { t, ar, locale: nq.locale };
}

/** Card brands are shown as plain text: Nasaq ships no card artwork, and official marks must never be redrawn. */
export const BRAND_NAME: Record<CardBrand, { en: string; ar: string }> = {
  visa: { en: "Visa", ar: "Visa" },
  mastercard: { en: "Mastercard", ar: "Mastercard" },
  amex: { en: "American Express", ar: "American Express" },
  mada: { en: "mada", ar: "مدى" },
  unknown: { en: "Card", ar: "بطاقة" },
};

/* ------------------------------------------------------------------ types */

export type CheckoutInterval = "month" | "year";
export type CheckoutStep = "plan" | "billing" | "payment" | "review" | "success";
export type PaymentMethodKind = "card" | "bank";

export interface CheckoutPlan {
  id: string;
  name: string;
  description?: string;
  /** Price for one month when billed monthly. */
  monthlyPrice: number;
  /** Price for a whole year when billed yearly. Omit to hide the yearly option for this plan. Default `monthlyPrice * 12`. */
  yearlyPrice?: number;
  features?: string[];
  /** "Most popular". */
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

/** What the review step and the order carry about the payment. The full card number and security code never leave the form. */
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
  /** Order or receipt number shown on the success step. */
  reference?: string;
}

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** The price of a plan for an interval, and the monthly equivalent. */
export function planTotal(plan: CheckoutPlan, interval: CheckoutInterval): number {
  return interval === "year" ? (plan.yearlyPrice ?? plan.monthlyPrice * 12) : plan.monthlyPrice;
}

/* ------------------------------------------------------------------ payment form */

export interface PaymentFormValue {
  method: PaymentMethodKind;
  number: string;
  holder: string;
  expiry: string;
  cvc: string;
}

export const emptyPaymentForm: PaymentFormValue = { method: "card", number: "", holder: "", expiry: "", cvc: "" };

export type PaymentFormErrors = Partial<Record<"number" | "holder" | "expiry" | "cvc", string>>;

/** Validates the card fields. Empty result means the form can continue. Bank transfer has nothing to check. */
export function validatePaymentForm(
  value: PaymentFormValue,
  t: Pick<CheckoutStrings, "required" | "invalidCard" | "invalidExpiry" | "invalidCvc">,
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

export const DEFAULT_COUNTRIES: Record<"en" | "ar", CheckoutCountry[]> = {
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

export const EMPTY_BILLING: CheckoutBilling = { name: "", email: "", company: "", taxId: "", country: "SA", address: "", city: "", postalCode: "" };
export const STEP_ORDER: CheckoutStep[] = ["plan", "billing", "payment", "review", "success"];
export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
