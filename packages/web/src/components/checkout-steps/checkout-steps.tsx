"use client";

import { CircleCheck, Landmark, Lock } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import { useOptionalNasaq } from "../../provider/nasaq-provider";
import { Badge } from "../badge";
import { Button } from "../button";
import { Card, CardContent, CardHeader, CardTitle } from "../card";
import { Checkbox } from "../checkbox";
import { Field, FieldError, FieldLabel, Input } from "../field";
import { type FormatNumberOptions, Num, useFormatNumber } from "../numeric";
import { PlanCard, PlanGrid } from "../plan-card";
import { Price } from "../price";
import { RadioCard, RadioGroup } from "../radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { Stepper, StepperItem } from "../stepper";
import { Toggle, ToggleGroup } from "../toggle-group";
import {
  type CardBrand,
  cardDigits,
  detectBrand,
  formatCardNumber,
  formatExpiry,
  isCardNumberValid,
  isCvcValid,
  isExpiryValid,
  lastFour,
} from "./card-format";

/* ------------------------------------------------------------------ strings */

const STRINGS = {
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

type Strings = typeof STRINGS.en;
export type CheckoutLabels = Partial<Strings>;

const useStrings = (labels?: CheckoutLabels): { t: Strings; ar: boolean; locale: string } => {
  const locale = useOptionalNasaq()?.locale ?? "en";
  const ar = locale.startsWith("ar");
  return { t: { ...STRINGS[ar ? "ar" : "en"], ...labels }, ar, locale };
};

/** Card brands are shown as plain text: Nasaq ships no card artwork, and official marks must never be redrawn. */
const BRAND_NAME: Record<CardBrand, { en: string; ar: string }> = {
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

/* ------------------------------------------------------------------ money */

function useMoney(currency: string) {
  const fmt = useFormatNumber();
  return (value: number, options?: FormatNumberOptions) => fmt(value, { style: "currency", currency, ...options });
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The price of a plan for an interval, and the monthly equivalent. */
export function planTotal(plan: CheckoutPlan, interval: CheckoutInterval): number {
  return interval === "year" ? (plan.yearlyPrice ?? plan.monthlyPrice * 12) : plan.monthlyPrice;
}

/* ------------------------------------------------------------------ PaymentMethodForm */

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
export function validatePaymentForm(value: PaymentFormValue, t: Pick<Strings, "required" | "invalidCard" | "invalidExpiry" | "invalidCvc">, now = new Date()): PaymentFormErrors {
  if (value.method !== "card") return {};
  const errors: PaymentFormErrors = {};
  if (!isCardNumberValid(value.number)) errors.number = value.number.trim() ? t.invalidCard : t.required;
  if (!value.holder.trim()) errors.holder = t.required;
  if (!isExpiryValid(value.expiry, now)) errors.expiry = value.expiry.trim() ? t.invalidExpiry : t.required;
  if (!isCvcValid(value.cvc, detectBrand(value.number))) errors.cvc = value.cvc.trim() ? t.invalidCvc : t.required;
  return errors;
}

export interface PaymentMethodFormProps extends Omit<ComponentProps<"div">, "onChange"> {
  value: PaymentFormValue;
  onChange: (value: PaymentFormValue) => void;
  /** Field errors, usually from `validatePaymentForm`. */
  errors?: PaymentFormErrors;
  /** Which methods to offer. Default both. */
  methods?: readonly PaymentMethodKind[];
  /** Shown under the bank transfer choice, for example the account details. */
  bankDetails?: ReactNode;
  disabled?: boolean;
  labels?: CheckoutLabels;
}

/**
 * Payment method picker plus card fields. Presentational: it formats what is typed (grouped number, MM/YY),
 * names the brand in text, and reports the value. It never sends or stores the card.
 */
export function PaymentMethodForm({ value, onChange, errors = {}, methods = ["card", "bank"], bankDetails, disabled, labels, className, ...props }: PaymentMethodFormProps) {
  const { t, ar } = useStrings(labels);
  const brand = detectBrand(value.number);
  const set = (patch: Partial<PaymentFormValue>) => onChange({ ...value, ...patch });
  return (
    <div data-slot="payment-method-form" className={cn("flex flex-col gap-5", className)} {...props}>
      {methods.length > 1 ? (
        <RadioGroup aria-label={t.method} value={value.method} onValueChange={(next) => set({ method: next as PaymentMethodKind })} disabled={disabled}>
          {methods.includes("card") ? <RadioCard value="card" title={t.card} description={t.cardDescription} /> : null}
          {methods.includes("bank") ? <RadioCard value="bank" title={t.bankTransfer} description={t.bankDescription} /> : null}
        </RadioGroup>
      ) : null}

      {value.method === "card" ? (
        <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
          <Field className="sm:col-span-2" invalid={Boolean(errors.number)}>
            <FieldLabel>{t.cardNumber}</FieldLabel>
            <div className="relative">
              <Input
                ltr
                name="cc-number"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="1234 5678 9012 3456"
                value={value.number}
                disabled={disabled}
                className="pe-28"
                onChange={(e) => set({ number: formatCardNumber(e.target.value) })}
              />
              {brand !== "unknown" ? (
                <Badge variant="outline" data-slot="payment-brand" className="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2">
                  {BRAND_NAME[brand][ar ? "ar" : "en"]}
                </Badge>
              ) : null}
            </div>
            {errors.number ? <FieldError match>{errors.number}</FieldError> : null}
          </Field>
          <Field className="sm:col-span-2" invalid={Boolean(errors.holder)}>
            <FieldLabel>{t.cardHolder}</FieldLabel>
            <Input name="cc-name" autoComplete="cc-name" value={value.holder} disabled={disabled} onChange={(e) => set({ holder: e.target.value })} />
            {errors.holder ? <FieldError match>{errors.holder}</FieldError> : null}
          </Field>
          <Field invalid={Boolean(errors.expiry)}>
            <FieldLabel>{t.expiry}</FieldLabel>
            <Input
              ltr
              name="cc-exp"
              inputMode="numeric"
              autoComplete="cc-exp"
              placeholder="MM/YY"
              maxLength={5}
              value={value.expiry}
              disabled={disabled}
              onChange={(e) => set({ expiry: formatExpiry(e.target.value) })}
            />
            {errors.expiry ? <FieldError match>{errors.expiry}</FieldError> : null}
          </Field>
          <Field invalid={Boolean(errors.cvc)}>
            <FieldLabel>{t.cvc}</FieldLabel>
            <Input
              ltr
              name="cc-csc"
              inputMode="numeric"
              autoComplete="cc-csc"
              placeholder={brand === "amex" ? "1234" : "123"}
              maxLength={4}
              value={value.cvc}
              disabled={disabled}
              onChange={(e) => set({ cvc: cardDigits(e.target.value).slice(0, 4) })}
            />
            {errors.cvc ? <FieldError match>{errors.cvc}</FieldError> : null}
          </Field>
          <p className="flex items-start gap-2 text-caption text-muted-foreground sm:col-span-2">
            <Lock aria-hidden className="mt-0.5 size-3.5 shrink-0" />
            {t.secure}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-card bg-nq-surface p-4">
          <p className="flex items-start gap-2 text-body-sm text-foreground">
            <Landmark aria-hidden className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            {t.bankNote}
          </p>
          {bankDetails}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ CheckoutSteps */

export interface CheckoutStepsProps extends Omit<ComponentProps<"div">, "onError"> {
  plans: readonly CheckoutPlan[];
  /** ISO 4217 code for every amount. Default "USD". */
  currency?: string;
  /** Tax as a fraction of the subtotal: 0.15 for 15% VAT. Default 0 (no tax line). */
  taxRate?: number;
  /** Name of the tax for the summary: "VAT". Default "Tax" / "الضريبة". */
  taxLabel?: string;
  defaultPlanId?: string;
  defaultInterval?: CheckoutInterval;
  defaultBilling?: Partial<CheckoutBilling>;
  /** Options of the country select. Default: a short Gulf and international list. */
  countries?: readonly CheckoutCountry[];
  /** Payment methods on offer. Default card and bank transfer. */
  paymentMethods?: readonly PaymentMethodKind[];
  /** Shown under the bank transfer choice. */
  bankDetails?: ReactNode;
  /** The step to start on. Default "plan". */
  defaultStep?: Exclude<CheckoutStep, "success">;
  onStepChange?: (step: CheckoutStep) => void;
  /**
   * Confirms the order. Resolve to finish (optionally with a `reference`); resolve `{ error }` or reject to stay on
   * the review step and show the message. Only `last4`, brand and holder of the card are passed, never the number.
   */
  onComplete: (order: CheckoutOrder) => Promise<void | CheckoutResult>;
  /** The button on the success step. Omit to hide it. */
  onDone?: () => void;
  labels?: CheckoutLabels;
}

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

const EMPTY_BILLING: CheckoutBilling = { name: "", email: "", company: "", taxId: "", country: "SA", address: "", city: "", postalCode: "" };
const STEP_ORDER: CheckoutStep[] = ["plan", "billing", "payment", "review", "success"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Subscription checkout in five steps: plan, billing details, payment method, review, success. The steps are a
 * `Stepper`; earlier steps can be revisited. It is presentational: `onComplete` gets the order and the caller
 * charges it. Amounts use Intl with `currency` and stay left-to-right inside Arabic text.
 */
export function CheckoutSteps({
  plans,
  currency = "USD",
  taxRate = 0,
  taxLabel,
  defaultPlanId,
  defaultInterval = "month",
  defaultBilling,
  countries,
  paymentMethods = ["card", "bank"],
  bankDetails,
  defaultStep = "plan",
  onStepChange,
  onComplete,
  onDone,
  labels,
  className,
  ...props
}: CheckoutStepsProps) {
  const { t, ar } = useStrings(labels);
  const money = useMoney(currency);
  const fmt = useFormatNumber();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const mounted = useRef(false);
  const termsId = useId();

  const [step, setStepState] = useState<CheckoutStep>(defaultStep);
  const [planId, setPlanId] = useState(defaultPlanId ?? plans.find((p) => p.highlighted)?.id ?? plans[0]?.id ?? "");
  const [interval, setInterval] = useState<CheckoutInterval>(defaultInterval);
  const [billing, setBilling] = useState<CheckoutBilling>({ ...EMPTY_BILLING, ...defaultBilling });
  const [billingErrors, setBillingErrors] = useState<Partial<Record<keyof CheckoutBilling, string>>>({});
  const [payment, setPayment] = useState<PaymentFormValue>({ ...emptyPaymentForm, method: paymentMethods[0] ?? "card" });
  const [paymentErrors, setPaymentErrors] = useState<PaymentFormErrors>({});
  const [accepted, setAccepted] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | undefined>();

  const plan = plans.find((p) => p.id === planId) ?? plans[0];
  const index = STEP_ORDER.indexOf(step);
  const countryList = countries ?? DEFAULT_COUNTRIES[ar ? "ar" : "en"];

  const setStep = (next: CheckoutStep) => {
    setStepState(next);
    onStepChange?.(next);
  };

  // Move focus to the new step's heading so keyboard and screen reader users land on the content.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs on step change only
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus();
  }, [step]);

  if (!plan) return null;

  const subtotal = planTotal(plan, interval);
  const tax = round2(subtotal * taxRate);
  const total = round2(subtotal + tax);
  const yearlySaving = plan.yearlyPrice !== undefined ? 1 - plan.yearlyPrice / (plan.monthlyPrice * 12) : 0;
  const countryLabel = countryList.find((c) => c.value === billing.country)?.label ?? billing.country;
  const brand = detectBrand(payment.number);
  const paymentSummary: CheckoutPaymentSummary =
    payment.method === "card"
      ? { method: "card", brand, last4: lastFour(payment.number), holder: payment.holder.trim(), expiry: payment.expiry }
      : { method: "bank" };

  const setField = (key: keyof CheckoutBilling, value: string) => {
    setBilling((b) => ({ ...b, [key]: value }));
    if (billingErrors[key]) setBillingErrors((e) => ({ ...e, [key]: undefined }));
  };

  const validateBilling = () => {
    const errors: Partial<Record<keyof CheckoutBilling, string>> = {};
    for (const key of ["name", "country", "address", "city"] as const) if (!billing[key].trim()) errors[key] = t.required;
    if (!billing.email.trim()) errors.email = t.required;
    else if (!EMAIL.test(billing.email.trim())) errors.email = t.invalidEmail;
    setBillingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const next = () => {
    if (step === "billing" && !validateBilling()) return;
    if (step === "payment") {
      const errors = validatePaymentForm(payment, t);
      setPaymentErrors(errors);
      if (Object.keys(errors).length) return;
    }
    setStep(STEP_ORDER[index + 1] ?? "success");
  };

  const back = () => setStep(STEP_ORDER[Math.max(0, index - 1)] ?? "plan");

  const pay = async () => {
    if (busy) return;
    if (!accepted) {
      setTermsError(true);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await onComplete({ planId: plan.id, interval, billing, payment: paymentSummary, currency, subtotal, tax, total });
      if (result?.error) {
        setError(result.error);
        return;
      }
      setReference(result?.reference);
      setStep("success");
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<CheckoutStep, string> = { plan: t.plan, billing: t.billing, payment: t.payment, review: t.review, success: t.success };
  const headings: Record<CheckoutStep, string> = { plan: t.planTitle, billing: t.billingTitle, payment: t.paymentTitle, review: t.reviewTitle, success: t.successTitle };
  const descriptions: Partial<Record<CheckoutStep, string>> = {
    plan: t.planDescription,
    billing: t.billingDescription,
    payment: t.paymentDescription,
    review: t.reviewDescription,
  };
  const paymentLine =
    payment.method === "card"
      ? t.cardEnding(BRAND_NAME[brand === "unknown" ? "unknown" : brand][ar ? "ar" : "en"], `⁦${lastFour(payment.number)}⁩`)
      : t.bankTransfer;

  const summary = (
    <Card data-slot="checkout-summary" className="h-fit gap-3">
      <CardHeader>
        <CardTitle as="h2">{t.summary}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-label text-foreground">{plan.name}</p>
            <p className="text-caption text-muted-foreground">{interval === "year" ? t.yearly : t.monthly}</p>
          </div>
          <Num value={subtotal} format={{ style: "currency", currency }} className="text-label text-foreground" />
        </div>
        <dl className="flex flex-col gap-2 border-t border-border pt-3 text-body-sm">
          {tax > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{taxLabel ?? t.tax}</dt>
              <dd>
                <Num value={tax} format={{ style: "currency", currency }} />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3 text-label text-foreground">
            <dt>{t.total}</dt>
            <dd>
              <Num value={total} format={{ style: "currency", currency }} />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );

  const nav = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
      {index > 0 ? (
        <Button variant="ghost" onClick={back} disabled={busy}>
          {t.back}
        </Button>
      ) : (
        <span />
      )}
      {step === "review" ? (
        <Button variant="primary" size="lg" loading={busy} onClick={() => void pay()}>
          {t.pay(money(total))}
        </Button>
      ) : (
        <Button variant="primary" onClick={next}>
          {t.continue}
        </Button>
      )}
    </div>
  );

  const editable = (target: CheckoutStep, body: ReactNode, title: string) => (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle as="h3">{title}</CardTitle>
        <div className="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
          <Button size="sm" variant="ghost" onClick={() => setStep(target)} disabled={busy}>
            {t.edit}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="text-body-sm text-foreground">{body}</CardContent>
    </Card>
  );

  return (
    <div data-slot="checkout-steps" data-step={step} className={cn("@container flex flex-col gap-6", className)} {...props}>
      <nav aria-label={t.steps} className="flex flex-col gap-2">
        <Stepper current={step === "success" ? STEP_ORDER.length : index}>
          {STEP_ORDER.map((id, i) => (
            <StepperItem
              key={id}
              title={<span className="max-sm:sr-only">{titles[id]}</span>}
              onClick={step !== "success" && i < index && !busy ? () => setStep(id) : undefined}
            />
          ))}
        </Stepper>
        {step !== "success" ? (
          <p className="text-caption text-muted-foreground sm:hidden">
            {t.stepOf(fmt(index + 1), fmt(STEP_ORDER.length - 1))} · {titles[step]}
          </p>
        ) : null}
      </nav>

      {step === "success" ? (
        <section aria-live="polite" className="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-card bg-nq-surface px-6 py-12 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <CircleCheck aria-hidden className="size-6" />
          </span>
          <h2 ref={headingRef} tabIndex={-1} className="text-h2 text-foreground outline-none">
            {headings.success}
          </h2>
          <p className="text-body text-muted-foreground">{t.successDescription(plan.name)}</p>
          {reference ? (
            <p className="text-body-sm text-muted-foreground">
              {t.reference}: <bdi dir="ltr" className="font-mono text-foreground">{reference}</bdi>
            </p>
          ) : null}
          <p className="text-body-sm text-foreground">
            <Num value={total} format={{ style: "currency", currency }} /> · {interval === "year" ? t.perYear : t.perMonth}
          </p>
          {onDone ? (
            <Button variant="primary" onClick={onDone}>
              {t.done}
            </Button>
          ) : null}
        </section>
      ) : (
        <div className="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_20rem]">
          <section className="flex min-w-0 flex-col gap-5" aria-labelledby={`${termsId}-h`}>
            <header className="flex flex-col gap-1">
              <h2 id={`${termsId}-h`} ref={headingRef} tabIndex={-1} className="text-h2 text-foreground outline-none">
                {headings[step]}
              </h2>
              {descriptions[step] ? <p className="text-body-sm text-muted-foreground">{descriptions[step]}</p> : null}
            </header>

            {step === "plan" ? (
              <>
                <ToggleGroup aria-label={t.interval} value={[interval]} onValueChange={(v) => v[0] && setInterval(v[0] as CheckoutInterval)}>
                  <Toggle value="month">{t.monthly}</Toggle>
                  <Toggle value="year">
                    {t.yearly}
                    {yearlySaving > 0.005 ? (
                      <Badge variant="success" className="ms-1">
                        {t.save(fmt(yearlySaving, { style: "percent", maximumFractionDigits: 0 }))}
                      </Badge>
                    ) : null}
                  </Toggle>
                </ToggleGroup>
                <PlanGrid>
                  {plans.map((p) => {
                    const yearly = interval === "year" && p.yearlyPrice !== undefined;
                    const chosen = p.id === planId;
                    return (
                      <PlanCard
                        key={p.id}
                        name={p.name}
                        description={p.description}
                        highlighted={p.highlighted}
                        badge={p.badge ? <Badge variant="brand">{p.badge}</Badge> : undefined}
                        price={<Price amount={yearly ? round2((p.yearlyPrice ?? 0) / 12) : p.monthlyPrice} currency={currency} period="month" size="lg" fractionDigits={2} />}
                        priceNote={yearly ? t.billedYearly(money(p.yearlyPrice ?? 0)) : t.billedMonthly}
                        features={p.features}
                        action={
                          <Button variant={chosen ? "primary" : "secondary"} aria-pressed={chosen} onClick={() => setPlanId(p.id)}>
                            {chosen ? t.selected : t.choose}
                          </Button>
                        }
                      />
                    );
                  })}
                </PlanGrid>
              </>
            ) : null}

            {step === "billing" ? (
              <form
                noValidate
                className="grid gap-x-4 gap-y-5 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                {(
                  [
                    ["name", t.name, { autoComplete: "name" }, false],
                    ["email", t.email, { autoComplete: "email", type: "email", inputMode: "email" }, true],
                    ["company", t.company, { autoComplete: "organization" }, false],
                    ["taxId", t.taxId, {}, true],
                  ] as const
                ).map(([key, label, inputProps, ltr]) => (
                  <Field key={key} invalid={Boolean(billingErrors[key])}>
                    <FieldLabel>{label}</FieldLabel>
                    <Input ltr={ltr} name={key} value={billing[key]} onChange={(e) => setField(key, e.target.value)} {...inputProps} />
                    {billingErrors[key] ? <FieldError match>{billingErrors[key]}</FieldError> : null}
                  </Field>
                ))}
                <Field className="sm:col-span-2" invalid={Boolean(billingErrors.country)}>
                  <FieldLabel>{t.country}</FieldLabel>
                  <Select items={countryList as CheckoutCountry[]} value={billing.country} onValueChange={(v) => v && setField("country", v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryList.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field className="sm:col-span-2" invalid={Boolean(billingErrors.address)}>
                  <FieldLabel>{t.address}</FieldLabel>
                  <Input name="address" autoComplete="street-address" value={billing.address} onChange={(e) => setField("address", e.target.value)} />
                  {billingErrors.address ? <FieldError match>{billingErrors.address}</FieldError> : null}
                </Field>
                <Field invalid={Boolean(billingErrors.city)}>
                  <FieldLabel>{t.city}</FieldLabel>
                  <Input name="city" autoComplete="address-level2" value={billing.city} onChange={(e) => setField("city", e.target.value)} />
                  {billingErrors.city ? <FieldError match>{billingErrors.city}</FieldError> : null}
                </Field>
                <Field>
                  <FieldLabel>{t.postalCode}</FieldLabel>
                  <Input ltr name="postalCode" autoComplete="postal-code" value={billing.postalCode} onChange={(e) => setField("postalCode", e.target.value)} />
                </Field>
                <button type="submit" hidden />
              </form>
            ) : null}

            {step === "payment" ? (
              <PaymentMethodForm
                value={payment}
                onChange={(v) => {
                  setPayment(v);
                  setPaymentErrors({});
                }}
                errors={paymentErrors}
                methods={paymentMethods}
                bankDetails={bankDetails}
                labels={labels}
              />
            ) : null}

            {step === "review" ? (
              <div className="flex flex-col gap-4">
                {editable(
                  "plan",
                  <div className="flex items-center justify-between gap-3">
                    <span>
                      {plan.name} · {interval === "year" ? t.yearly : t.monthly}
                    </span>
                    <Num value={subtotal} format={{ style: "currency", currency }} />
                  </div>,
                  t.plan,
                )}
                {editable(
                  "billing",
                  <address className="flex flex-col not-italic">
                    <span>{billing.name}</span>
                    {billing.company ? <span>{billing.company}</span> : null}
                    <bdi dir="ltr" className="text-start text-muted-foreground">
                      {billing.email}
                    </bdi>
                    <span className="text-muted-foreground">
                      {[billing.address, billing.city, billing.postalCode, countryLabel].filter(Boolean).join(ar ? "، " : ", ")}
                    </span>
                    {billing.taxId ? (
                      <bdi dir="ltr" className="text-start text-muted-foreground">
                        {billing.taxId}
                      </bdi>
                    ) : null}
                  </address>,
                  t.billing,
                )}
                {editable("payment", <span>{paymentLine}</span>, t.payment)}
                <Field invalid={termsError}>
                  <label htmlFor={termsId} className="flex items-start gap-2 text-body-sm text-foreground">
                    <Checkbox
                      id={termsId}
                      className="mt-0.5"
                      checked={accepted}
                      onCheckedChange={(checked) => {
                        setAccepted(checked);
                        if (checked) setTermsError(false);
                      }}
                    />
                    <span>{t.terms}</span>
                  </label>
                  {termsError ? <FieldError match>{t.termsRequired}</FieldError> : null}
                </Field>
                {error ? (
                  <p role="alert" className="rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">
                    {error}
                  </p>
                ) : null}
                <span role="status" className="sr-only">{busy ? t.paying : ""}</span>
              </div>
            ) : null}

            {nav}
          </section>
          <aside aria-label={t.summary}>{summary}</aside>
        </div>
      )}
    </div>
  );
}
