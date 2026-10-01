"use client";

import { Check, CheckCircle2, ChevronDown, Lock, MapPin, ShoppingBag, Truck } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "../../lib/cn";
import type { CommerceAddress, CommerceCartLine, CommerceOrder, CommerceShippingMethod } from "../../lib/commerce";
import { Alert } from "../alert";
import { Badge } from "../badge";
import { Button } from "../button";
import { Checkbox } from "../checkbox";
import { emptyPaymentForm, type PaymentFormValue, PaymentMethodForm, validatePaymentForm } from "../checkout-steps";
import { Field, FieldDescription, FieldError, FieldLabel, Input, Textarea } from "../field";
import { type LocalPaymentInput, type LocalPaymentMethod, LocalPayments } from "../local-payments";
import { DateTime, formatDateRange, Num } from "../numeric";
import { RadioCard, RadioGroup } from "../radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";
import { EmptyState } from "../states";
import { Switch } from "../switch";
import { Tabs, TabsList, TabsPanel, TabsTab } from "../tabs";
import { StoreImage } from "../store-cart/store-image";
import { StoreAmount, StoreCartMoney } from "../store-cart/store-money";
import { type AddressErrors, type StoreAddressField, storeAddressLines, countryRule, normalizePostalCode, STORE_COUNTRY_CODES } from "./address-rules";
import {
  buildOrder,
  CHECKOUT_SECTIONS,
  type CheckoutContext,
  type CheckoutData,
  type CheckoutPaymentKind,
  type CheckoutSection,
  type CheckoutState,
  type CheckoutSummary,
  checkoutReduce,
  checkoutSummary,
  emptyCheckoutData,
  etaWindow,
  GIFT_MESSAGE_MAX,
  initialCheckout,
  NOTES_MAX,
  type PaymentPolicy,
  paymentAvailability,
  validateSection,
} from "./checkout-machine";
import { type StoreCheckoutLabels, type StoreCheckoutStrings, useStoreCheckoutStrings } from "./checkout-strings";
import { useCurrency } from "../../provider/nasaq-provider";

type Strings = StoreCheckoutStrings;

/* ------------------------------------------------------------------ address form */

export interface StoreAddressFormProps extends Omit<ComponentProps<"div">, "onChange"> {
  value: Partial<CommerceAddress>;
  onChange: (value: Partial<CommerceAddress>) => void;
  /** Problem codes from `validateStoreAddress`, keyed by field. */
  errors?: AddressErrors;
  /** Country codes on offer. Default: every country with rules. */
  countries?: readonly string[];
  /** A billing address has no phone. */
  hidePhone?: boolean;
  disabled?: boolean;
  /** Prefix for field ids and `name`s, e.g. "shipping". */
  name?: string;
  labels?: StoreCheckoutLabels;
}

function problemText(code: string | undefined, field: StoreAddressField, country: string, t: Strings): string | undefined {
  if (!code) return undefined;
  const rule = countryRule(country);
  if (code === "postalCode") return t.problems.postalCode(rule.postalExample ?? "");
  if (code === "phone") return t.problems.phone(`+${rule.dial} ${rule.phoneExample}`.trim());
  if (code === "required" || code === "tooShort" || code === "tooLong" || code === "region") return t.problems[code];
  return field ? t.problems.required : undefined;
}

/**
 * A country-aware address form. The country decides which fields show and how they are named: an emirate list for the
 * UAE, a required district and postal code for Saudi Arabia, no postal code in Qatar, state and ZIP in the US. Postal
 * codes are tidied on blur ("sw1a1aa" becomes "SW1A 1AA"); the phone field stays left to right in Arabic.
 */
export function StoreAddressForm({ value, onChange, errors = {}, countries = STORE_COUNTRY_CODES, hidePhone = false, disabled, name = "address", labels, className, ...props }: StoreAddressFormProps) {
  const { t, ar } = useStoreCheckoutStrings(labels);
  const country = (value.country ?? countries[0] ?? "EG").toUpperCase();
  const rule = countryRule(country);
  const set = (patch: Partial<CommerceAddress>) => onChange({ ...value, ...patch });
  const err = (field: StoreAddressField) => problemText(errors[field], field, country, t);
  const lang = ar ? "ar" : "en";
  const regionLabel = `${t.region[rule.regionKind]}${rule.regionRequired ? "" : ` ${t.optional}`}`;

  const text = (field: StoreAddressField, label: string, extra: ComponentProps<typeof Input> & { span?: boolean } = {}) => {
    const { span, ...inputProps } = extra;
    const message = err(field);
    return (
      <Field invalid={!!message} className={cn(span && "sm:col-span-2")}>
        <FieldLabel>{label}</FieldLabel>
        <Input name={`${name}.${field}`} value={(value[field as keyof CommerceAddress] as string | undefined) ?? ""} disabled={disabled} onChange={(event) => set({ [field]: event.target.value })} {...inputProps} />
        <FieldError match={!!message}>{message}</FieldError>
      </Field>
    );
  };

  return (
    <div data-slot="store-address-form" data-country={country} className={cn("grid gap-4 sm:grid-cols-2", className)} {...props}>
      <Field className="sm:col-span-2">
        <FieldLabel>{t.country}</FieldLabel>
        <Select
          items={countries.map((code) => ({ value: code, label: countryRule(code).name[lang] }))}
          value={country}
          disabled={disabled}
          onValueChange={(next) => next && onChange({ ...value, country: String(next), region: "", postalCode: "" })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((code) => (
              <SelectItem key={code} value={code}>
                {countryRule(code).name[lang]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      {text("name", t.fullName, { autoComplete: "name", span: hidePhone })}
      {hidePhone ? null : text("phone", t.phone, { ltr: true, type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: `+${rule.dial} ${rule.phoneExample}`.trim() })}
      {text("line1", t.line1, { autoComplete: "address-line1", span: true })}
      {text("line2", t.line2, { autoComplete: "address-line2", span: true })}
      {text("city", t.city, { autoComplete: "address-level2" })}
      {rule.regionKind === "none" ? null : rule.regions ? (
        <Field invalid={!!err("region")}>
          <FieldLabel>{regionLabel}</FieldLabel>
          <Select items={rule.regions.map((r) => ({ value: r.id, label: r[lang] }))} value={value.region || null} disabled={disabled} onValueChange={(next) => set({ region: next ? String(next) : "" })}>
            <SelectTrigger>
              <SelectValue placeholder={t.choose} />
            </SelectTrigger>
            <SelectContent>
              {rule.regions.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r[lang]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FieldError match={!!err("region")}>{err("region")}</FieldError>
        </Field>
      ) : (
        text("region", regionLabel, { autoComplete: "address-level1" })
      )}
      {rule.noPostal
        ? null
        : text("postalCode", `${t.postalCode}${rule.postalRequired ? "" : ` ${t.optional}`}`, {
            ltr: true,
            autoComplete: "postal-code",
            ...(rule.postalExample ? { placeholder: rule.postalExample } : {}),
            onBlur: () => value.postalCode && set({ postalCode: normalizePostalCode(country, value.postalCode) }),
          })}
    </div>
  );
}

/* ------------------------------------------------------------------ order summary */

export interface StoreOrderSummaryProps extends Omit<ComponentProps<"aside">, "children"> {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  summary: CheckoutSummary;
  /** Shows the chosen method's name next to Shipping. */
  shippingMethod?: CommerceShippingMethod | undefined;
  /** Start expanded on small screens. Default false: the total is shown and the lines are folded away. */
  defaultOpen?: boolean;
  onEditCart?: () => void;
  labels?: StoreCheckoutLabels;
}

/**
 * The order summary beside the checkout. On large screens it is always open; on small ones it folds behind a bar that
 * shows the total (a disclosure button with `aria-expanded`), so the form is not pushed down the page.
 */
export function StoreOrderSummary({ lines, currency: currencyProp, summary, shippingMethod, defaultOpen = false, onEditCart, labels, className, ...props }: StoreOrderSummaryProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, money } = useStoreCheckoutStrings(labels);
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const active = lines.filter((l) => !l.savedForLater);
  const Row = ({ label, children }: { label: ReactNode; children: ReactNode }) => (
    <div className="flex items-baseline justify-between gap-3 text-body-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
  return (
    <aside data-slot="store-order-summary" aria-label={t.summary} className={cn("flex flex-col rounded-card border border-border bg-card", className)} {...props}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-3 rounded-card p-4 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus lg:hidden"
      >
        <span className="flex items-center gap-2 text-label text-foreground">
          <ShoppingBag aria-hidden className="size-4" />
          {open ? t.hideSummary : t.showSummary}
          <ChevronDown aria-hidden className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
        </span>
        <StoreCartMoney amount={summary.payable} currency={currency} />
      </button>
      <div id={panelId} className={cn("flex-col gap-4 p-4 pt-0 lg:flex lg:pt-4", open ? "flex" : "hidden")}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="hidden text-h3 font-semibold text-foreground lg:block">{t.summary}</h2>
          {onEditCart ? (
            <Button variant="link" size="sm" onClick={onEditCart} className="ms-auto">
              {t.editCart}
            </Button>
          ) : null}
        </div>
        <ul className="flex flex-col gap-3">
          {active.map((line) => (
            <li key={line.id} className="flex items-center gap-3">
              <span className="relative shrink-0">
                <StoreImage src={line.image} alt={line.name} size={48} />
                <span aria-hidden className="absolute -end-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[0.6875rem] font-medium leading-5 text-background">
                  {n(line.quantity)}
                </span>
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]">{line.name}</span>
                <span className="text-caption text-muted-foreground">{[line.variantLabel, t.quantityShort(n(line.quantity))].filter(Boolean).join(" · ")}</span>
              </span>
              <StoreAmount amount={line.unitPrice * line.quantity} currency={currency} className="text-body-sm" />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-2 border-t border-border pt-3">
          <Row label={`${t.subtotal} · ${t.items(n(summary.itemCount), summary.itemCount)}`}>
            <StoreAmount amount={summary.subtotal} currency={currency} />
          </Row>
          {summary.discount > 0 ? (
            <Row label={t.discount}>
              <span className="text-nq-success-text">
                <bdi dir="ltr">−</bdi>
                <StoreAmount amount={summary.discount} currency={currency} className="text-nq-success-text" />
              </span>
            </Row>
          ) : null}
          <Row label={shippingMethod ? `${t.shipping} · ${shippingMethod.label}` : t.shipping}>
            {shippingMethod ? summary.shipping === 0 ? <span className="text-nq-success-text">{t.free}</span> : <StoreAmount amount={summary.shipping} currency={currency} /> : <span className="text-muted-foreground">{t.shippingPending}</span>}
          </Row>
          {summary.tax > 0 ? (
            <Row label={t.tax}>
              <StoreAmount amount={summary.tax} currency={currency} />
            </Row>
          ) : null}
          {summary.codFee > 0 ? (
            <Row label={t.codFee}>
              <StoreAmount amount={summary.codFee} currency={currency} />
            </Row>
          ) : null}
          {summary.giftWrapFee > 0 ? (
            <Row label={t.giftWrapRow}>
              <StoreAmount amount={summary.giftWrapFee} currency={currency} />
            </Row>
          ) : null}
        </dl>
        <div className="flex items-baseline justify-between gap-3 border-t border-border pt-3">
          <span className="text-label text-foreground">{t.total}</span>
          <StoreCartMoney amount={summary.payable} currency={currency} size="lg" />
        </div>
        {summary.savings > 0 ? (
          <Badge variant="success" className="w-fit">
            {t.saving(money(summary.savings, currency))}
          </Badge>
        ) : null}
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ checkout */

export interface StoreCheckoutDraft {
  /** Contact, addresses (normalised, phone in international form), shipping method id, payment choice, notes and gift. */
  data: CheckoutData;
  /** The lines being bought (saved-for-later ones left out). */
  lines: CommerceCartLine[];
  summary: CheckoutSummary;
  shippingMethod: CommerceShippingMethod | undefined;
  /** The card fields when paying by card. Send them to your payment provider; never log or store them. */
  card?: PaymentFormValue;
  /** The order this checkout produces, as a pending order without a number. */
  order: CommerceOrder;
  /** How many times this order was sent (1 on the first try). */
  attempt: number;
}

export type StorePlaceOrderResult = void | { error?: string; orderNumber?: string; order?: CommerceOrder };

export interface StoreCheckoutProps extends Omit<ComponentProps<"div">, "children" | "defaultValue"> {
  lines: readonly CommerceCartLine[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  shippingMethods: readonly CommerceShippingMethod[];
  /** Saved addresses of a signed-in shopper: picked from a list instead of typed. */
  savedAddresses?: readonly CommerceAddress[];
  /** Country codes the store ships to. Default: every country with rules. */
  countries?: readonly string[];
  /** A signed-in shopper. Without it the contact step offers Guest and Sign in. */
  account?: { name: string; email: string };
  onSignIn?: () => void;
  /** Which payment methods are on offer, with COD limits and the wallet balance. Default: card only. */
  paymentPolicy?: PaymentPolicy;
  /** Manual methods (bank transfer, wallets) for "local payments". */
  localMethods?: readonly LocalPaymentMethod[];
  /** Sends the local payment's reference and receipt for checking. Resolve `{ error }` to show it. */
  onLocalSubmit?: (input: LocalPaymentInput) => Promise<void | { error?: string }>;
  discount?: number;
  taxBps?: number;
  taxInclusive?: boolean;
  /** Price of gift wrapping, minor units. Leave out to hide the gift wrap switch. */
  giftWrapFee?: number;
  /** Day numbers that do not count for delivery (0 Sunday to 6 Saturday), e.g. [5, 6] in Egypt. */
  weekend?: readonly number[];
  /** The date delivery is counted from. Default: now. */
  now?: Date;
  defaultValues?: Partial<CheckoutData>;
  /** Sends the order. Resolve `{ error }` (or reject) to show the failure with a retry; resolve `{ orderNumber }` to finish. */
  onPlaceOrder: (draft: StoreCheckoutDraft) => Promise<StorePlaceOrderResult>;
  onPlaced?: (order: CommerceOrder) => void;
  onEditCart?: () => void;
  onTrackOrder?: (order: CommerceOrder) => void;
  onContinueShopping?: () => void;
  labels?: StoreCheckoutLabels;
}

const KIND_ORDER: CheckoutPaymentKind[] = ["card", "cod", "local", "wallet"];

function shippingEta(method: CommerceShippingMethod, now: Date, weekend: readonly number[], locale: string, t: Strings) {
  if (!method.etaDays) return undefined;
  if (method.etaDays[1] <= 1) return t.arrivesToday;
  const { start, end } = etaWindow(method.etaDays, now, weekend);
  return t.arrives(formatDateRange(start, end, locale, { month: "short", day: "numeric", timeZone: "UTC" }));
}

/**
 * Checkout for physical goods on one page, in four sections that open one after another: contact (guest or signed in),
 * delivery address (country-aware, with saved addresses and a separate billing address), shipping method with its
 * arrival dates plus gift options and notes, and payment (card, cash on delivery, local methods, wallet). The summary
 * sits beside it. All decisions live in the pure `checkout-machine` and `address-rules`; this renders them. Placing the
 * order shows a loading state, a retryable failure, and then the confirmation.
 */
export function StoreCheckout({
  lines,
  currency: currencyProp,
  shippingMethods,
  savedAddresses = [],
  countries = STORE_COUNTRY_CODES,
  account,
  onSignIn,
  paymentPolicy = { card: true },
  localMethods = [],
  onLocalSubmit,
  discount = 0,
  taxBps,
  taxInclusive,
  giftWrapFee,
  weekend = [],
  now,
  defaultValues,
  onPlaceOrder,
  onPlaced,
  onEditCart,
  onTrackOrder,
  onContinueShopping,
  labels,
  className,
  ...props
}: StoreCheckoutProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, money, locale, ar } = useStoreCheckoutStrings(labels);
  const active = useMemo(() => lines.filter((l) => !l.savedForLater), [lines]);
  const idBase = useId();

  const [state, setState] = useState<CheckoutState>(() => {
    const first = savedAddresses.find((a) => a.isDefault) ?? savedAddresses[0];
    const country = countries[0] ?? "EG";
    return initialCheckout(
      emptyCheckoutData({
        shipping: first ? { ...first } : { country },
        billing: { country: first?.country ?? country },
        ...(first?.id ? { savedAddressId: first.id } : {}),
        ...(account ? { contact: { mode: "account" as const, email: account.email, marketing: false } } : {}),
        ...defaultValues,
      }),
      "contact",
    );
  });
  const [card, setCard] = useState<PaymentFormValue>(emptyPaymentForm);
  const [placed, setPlaced] = useState<CommerceOrder | undefined>();
  const data = state.data;
  const busy = state.status === "submitting";

  const method = shippingMethods.find((m) => m.id === data.shippingMethodId);
  const giftWrap = data.gift.enabled && data.gift.wrap && giftWrapFee !== undefined;
  const base = checkoutSummary({ lines: active, discount, ...(method ? { shippingMethod: method } : {}), ...(taxBps ? { taxBps } : {}), ...(taxInclusive !== undefined ? { taxInclusive } : {}), giftWrap, ...(giftWrapFee !== undefined ? { giftWrapFee } : {}) });
  const availability = paymentAvailability(paymentPolicy, { total: base.payable, country: data.shipping.country ?? "" });
  const kind = data.payment.kind;
  const summary = checkoutSummary({ lines: active, discount, ...(method ? { shippingMethod: method } : {}), ...(taxBps ? { taxBps } : {}), ...(taxInclusive !== undefined ? { taxInclusive } : {}), ...(kind ? { paymentKind: kind } : {}), policy: paymentPolicy, giftWrap, ...(giftWrapFee !== undefined ? { giftWrapFee } : {}) });

  const cardText = { required: t.cardRequired, invalidCard: t.invalidCard, invalidExpiry: t.invalidExpiry, invalidCvc: t.invalidCvc };
  const cardErrors = validatePaymentForm(card, cardText);
  const ctx: CheckoutContext = {
    shippingMethodIds: shippingMethods.map((m) => m.id),
    signedIn: !!account,
    cardValid: Object.keys(cardErrors).length === 0,
    localReady: !!data.payment.localReference,
    paymentAvailable: Object.fromEntries(KIND_ORDER.map((k) => [k, availability[k].available])) as Partial<Record<CheckoutPaymentKind, boolean>>,
  };

  const send = (event: Parameters<typeof checkoutReduce>[1]) => setState((s) => checkoutReduce(s, event, ctx));
  const update = (patch: Partial<CheckoutData>) => send({ type: "update", patch });

  // Move focus to a section's heading when the open section changes, so keyboard and screen-reader users land in it.
  const headings = useRef<Partial<Record<CheckoutSection, HTMLHeadingElement | null>>>({});
  const moved = useRef(false);
  useEffect(() => {
    if (!moved.current) {
      moved.current = true;
      return;
    }
    headings.current[state.section]?.focus();
  }, [state.section]);

  const problems = state.errors;
  const stepText = (i: number) => t.stepOf(n(i + 1), n(CHECKOUT_SECTIONS.length));

  const place = async () => {
    const next = checkoutReduce(state, { type: "submit" }, ctx);
    setState(next);
    if (next.status !== "submitting") return;
    const shipping = { ...next.data.shipping };
    const normalizedData: CheckoutData = { ...next.data, shipping };
    const draftOrder = buildOrder({ data: normalizedData, lines: active, summary, ...(method ? { shippingMethod: method } : {}), number: "", now: now ?? new Date(), ...(account ? { customerName: account.name } : {}) });
    try {
      const result = await onPlaceOrder({ data: normalizedData, lines: active, summary, shippingMethod: method, ...(next.data.payment.kind === "card" ? { card } : {}), order: draftOrder, attempt: next.attempts });
      if (result?.error) return setState((s) => checkoutReduce(s, { type: "failed", reason: result.error ?? "" }, ctx));
      const number = result?.orderNumber ?? result?.order?.number ?? `#${1000 + next.attempts}`;
      const order = result?.order ?? { ...draftOrder, number, id: `ord-${number.replace(/\D/g, "")}` };
      setState((s) => checkoutReduce(s, { type: "succeeded", orderNumber: number }, ctx));
      setPlaced(order);
      onPlaced?.(order);
    } catch (error) {
      setState((s) => checkoutReduce(s, { type: "failed", reason: error instanceof Error ? error.message : "" }, ctx));
    }
  };

  if (placed && state.status === "placed") {
    return <StoreOrderConfirmation order={placed} currency={currency} paymentKind={data.payment.kind ?? "card"} gift={data.gift.enabled} {...(onTrackOrder ? { onTrackOrder: () => onTrackOrder(placed) } : {})} {...(onContinueShopping ? { onContinueShopping } : {})} {...(now ? { now } : {})} weekend={weekend} {...(labels ? { labels } : {})} className={className} />;
  }

  if (active.length === 0) {
    return (
      <div data-slot="store-checkout" className={cn("mx-auto w-full max-w-2xl px-4 py-10", className)} {...props}>
        <EmptyState icon={ShoppingBag} title={t.emptyTitle} description={t.emptyDescription} actions={onContinueShopping ? <Button variant="primary" onClick={onContinueShopping}>{t.emptyAction}</Button> : undefined} />
      </div>
    );
  }

  const isDone = (s: CheckoutSection) => state.done.includes(s);
  const isOpen = (s: CheckoutSection) => state.section === s;
  const canPlace = CHECKOUT_SECTIONS.every((s) => Object.keys(validateSection(s, data, ctx)).length === 0);

  const contactSummary = data.contact.mode === "account" ? (account ? `${account.name} · ${account.email}` : t.signIn) : data.contact.email;
  const addressSummary = storeAddressLines(data.shipping, ar ? "، " : ", ").join(ar ? "، " : ", ");
  const deliverySummary = method ? [method.label, shippingEta(method, now ?? new Date(), weekend, locale, t)].filter(Boolean).join(" · ") : "";
  const paymentSummary = kind ? (kind === "card" ? t.card : kind === "cod" ? t.cod : kind === "local" ? t.local : t.wallet) : "";

  const fieldErrors = (prefix: string): AddressErrors => Object.fromEntries(Object.entries(problems).filter(([k]) => k.startsWith(`${prefix}.`)).map(([k, v]) => [k.slice(prefix.length + 1), v])) as AddressErrors;

  const section = (id: CheckoutSection, index: number, summaryText: string, body: ReactNode, continueLabel = t.continue) => {
    const open = isOpen(id);
    const done = isDone(id);
    const reachable = done || CHECKOUT_SECTIONS.indexOf(id) <= CHECKOUT_SECTIONS.findIndex((s) => !isDone(s));
    return (
      <section key={id} data-slot="store-checkout-section" data-section={id} data-state={open ? "open" : done ? "done" : "locked"} aria-labelledby={`${idBase}-${id}`} className={cn("rounded-card border bg-card", open ? "border-nq-line-strong" : "border-border")}>
        <div className="flex items-start gap-3 p-4">
          <span aria-hidden className={cn("mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-medium", done ? "bg-nq-success-soft text-nq-success-text" : open ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground")}>
            {done ? <Check className="size-3.5" /> : n(index + 1)}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <h2 id={`${idBase}-${id}`} ref={(el) => void (headings.current[id] = el)} tabIndex={-1} className="text-h3 font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
              {t.steps[id]}
              <span className="sr-only"> {stepText(index)}</span>
            </h2>
            {!open && done && summaryText ? <p className="text-body-sm text-muted-foreground [overflow-wrap:anywhere]">{summaryText}</p> : null}
          </div>
          {!open && done && !busy ? (
            <Button variant="link" size="sm" onClick={() => send({ type: "open", section: id })} aria-label={`${t.edit}, ${t.steps[id]}`}>
              {t.edit}
            </Button>
          ) : null}
        </div>
        {open ? (
          <div className="flex flex-col gap-4 px-4 pb-4 ps-[3.25rem] max-sm:ps-4">
            {body}
            {id !== "payment" && reachable ? (
              <div>
                <Button variant="primary" onClick={() => send({ type: "continue" })}>
                  {continueLabel}
                </Button>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    );
  };

  /* ---- contact */
  const emailError = problems["contact.email"];
  const contactBody = (
    <Tabs
      value={data.contact.mode}
      onValueChange={(mode) => update({ contact: { ...data.contact, mode: mode as "guest" | "account", email: mode === "account" && account ? account.email : data.contact.email } })}
    >
      <TabsList aria-label={t.steps.contact}>
        <TabsTab value="guest">{t.guest}</TabsTab>
        <TabsTab value="account">{account ? t.accountTab : t.signIn}</TabsTab>
      </TabsList>
      <TabsPanel value="guest" className="flex flex-col gap-4 pt-4">
        <Field invalid={!!emailError}>
          <FieldLabel>{t.email}</FieldLabel>
          <Input ltr type="email" name="email" autoComplete="email" inputMode="email" value={data.contact.email} onChange={(event) => update({ contact: { ...data.contact, email: event.target.value } })} />
          {emailError ? <FieldError match>{emailError === "required" ? t.problems.required : t.problems.email}</FieldError> : <FieldDescription>{t.emailHint}</FieldDescription>}
        </Field>
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Checkbox checked={!!data.contact.marketing} onCheckedChange={(checked) => update({ contact: { ...data.contact, marketing: checked === true } })} />
          {t.marketing}
        </label>
        <p className="text-caption text-muted-foreground">{t.guestNote}</p>
      </TabsPanel>
      <TabsPanel value="account" className="flex flex-col gap-3 pt-4">
        {account ? (
          <p className="flex items-center gap-2 text-body-sm text-foreground">
            <CheckCircle2 aria-hidden className="size-4 text-nq-success-text" />
            {t.signedInAs(account.name)}
            <bdi dir="ltr" className="text-muted-foreground">
              {account.email}
            </bdi>
          </p>
        ) : (
          <>
            <p className="text-body-sm text-muted-foreground">{t.signInNote}</p>
            {problems["contact.account"] ? (
              <p role="alert" className="text-caption text-nq-danger-text">
                {t.problems.signIn}
              </p>
            ) : null}
            {onSignIn ? (
              <div>
                <Button variant="secondary" onClick={onSignIn}>
                  {t.signIn}
                </Button>
              </div>
            ) : null}
          </>
        )}
      </TabsPanel>
    </Tabs>
  );

  /* ---- address */
  const usingSaved = !!data.savedAddressId && savedAddresses.some((a) => a.id === data.savedAddressId);
  const addressBody = (
    <div className="flex flex-col gap-4">
      {savedAddresses.length ? (
        <RadioGroup
          aria-label={t.savedAddresses}
          value={usingSaved ? data.savedAddressId : "__new"}
          onValueChange={(next) => {
            if (next === "__new") return update({ savedAddressId: undefined as unknown as string, shipping: { country: data.shipping.country ?? countries[0] ?? "EG" } });
            const found = savedAddresses.find((a) => a.id === next);
            if (found) update({ savedAddressId: found.id as string, shipping: { ...found } });
          }}
        >
          {savedAddresses.map((a) => (
            <RadioCard
              key={a.id}
              value={a.id ?? a.line1}
              title={
                <span className="flex items-center gap-2">
                  <MapPin aria-hidden className="size-4 text-muted-foreground" />
                  {a.name}
                </span>
              }
              description={
                <span className="flex flex-col">
                  {storeAddressLines(a, ar ? "، " : ", ").map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                  {a.phone ? <bdi dir="ltr">{a.phone}</bdi> : null}
                </span>
              }
              meta={a.isDefault ? <Badge variant="neutral">{ar ? "الافتراضي" : "Default"}</Badge> : undefined}
            />
          ))}
          <RadioCard value="__new" title={t.newAddress} />
        </RadioGroup>
      ) : null}
      {usingSaved ? null : <StoreAddressForm name="shipping" value={data.shipping} onChange={(shipping) => update({ shipping })} errors={fieldErrors("shipping")} countries={countries} {...(labels ? { labels } : {})} />}
      <label className="flex items-center gap-2 text-body-sm text-foreground">
        <Checkbox checked={data.billingSame} onCheckedChange={(checked) => update({ billingSame: checked === true })} />
        {t.billingSame}
      </label>
      {data.billingSame ? null : (
        <div className="flex flex-col gap-3">
          <h3 className="text-label text-foreground">{t.billingTitle}</h3>
          <StoreAddressForm name="billing" hidePhone value={data.billing} onChange={(billing) => update({ billing })} errors={fieldErrors("billing")} countries={countries} {...(labels ? { labels } : {})} />
        </div>
      )}
    </div>
  );

  /* ---- delivery */
  const methodError = problems["delivery.method"];
  const giftLeft = GIFT_MESSAGE_MAX - data.gift.message.length;
  const notesLeft = NOTES_MAX - data.notes.length;
  const deliveryBody = (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <span className="text-label text-foreground">{t.shippingMethod}</span>
        <RadioGroup aria-label={t.shippingMethod} value={data.shippingMethodId ?? ""} onValueChange={(id) => update({ shippingMethodId: String(id) })}>
          {shippingMethods.map((m) => {
            const free = m.price === 0 || (m.freeOver !== undefined && base.subtotal - base.discount >= m.freeOver);
            const eta = shippingEta(m, now ?? new Date(), weekend, locale, t);
            return (
              <RadioCard
                key={m.id}
                value={m.id}
                title={
                  <span className="flex items-center gap-2">
                    <Truck aria-hidden className="size-4 text-muted-foreground" />
                    {m.label}
                  </span>
                }
                description={eta}
                meta={free ? <span className="text-label text-nq-success-text">{t.free}</span> : <StoreAmount amount={m.price} currency={currency} className="text-label" />}
              />
            );
          })}
        </RadioGroup>
        {methodError ? <p role="alert" className="text-caption text-nq-danger-text">{methodError === "unavailable" ? t.methodProblems.unavailable : t.methodProblems.required}</p> : null}
      </div>
      <fieldset className="flex flex-col gap-3 rounded-control border border-border p-3">
        <legend className="px-1 text-label text-foreground">{t.giftTitle}</legend>
        <label className="flex items-center gap-2 text-body-sm text-foreground">
          <Switch checked={data.gift.enabled} onCheckedChange={(enabled) => update({ gift: { ...data.gift, enabled } })} />
          {t.giftToggle}
        </label>
        {data.gift.enabled ? (
          <>
            <Field invalid={!!problems["gift.message"]}>
              <FieldLabel>{t.giftMessage}</FieldLabel>
              <Textarea name="giftMessage" rows={3} value={data.gift.message} onChange={(event) => update({ gift: { ...data.gift, message: event.target.value } })} />
              <FieldDescription>{t.giftMessageHint(n(Math.max(giftLeft, 0)))}</FieldDescription>
              <FieldError match={!!problems["gift.message"]}>{t.problems.tooLong}</FieldError>
            </Field>
            {giftWrapFee !== undefined ? (
              <label className="flex items-center gap-2 text-body-sm text-foreground">
                <Checkbox checked={data.gift.wrap} onCheckedChange={(checked) => update({ gift: { ...data.gift, wrap: checked === true } })} />
                {t.giftWrapFee(money(giftWrapFee, currency))}
              </label>
            ) : null}
            <label className="flex items-center gap-2 text-body-sm text-foreground">
              <Checkbox checked={data.gift.hidePrices} onCheckedChange={(checked) => update({ gift: { ...data.gift, hidePrices: checked === true } })} />
              {t.hidePrices}
            </label>
          </>
        ) : null}
      </fieldset>
      <Field invalid={!!problems.notes}>
        <FieldLabel>{t.notes}</FieldLabel>
        <Textarea name="notes" rows={3} placeholder={t.notesPlaceholder} value={data.notes} onChange={(event) => update({ notes: event.target.value })} />
        <FieldDescription>{t.notesHint(n(Math.max(notesLeft, 0)))}</FieldDescription>
        <FieldError match={!!problems.notes}>{t.problems.tooLong}</FieldError>
      </Field>
    </div>
  );

  /* ---- payment */
  const kindText: Record<CheckoutPaymentKind, { title: string; description: string }> = {
    card: { title: t.card, description: t.cardDescription },
    cod: { title: t.cod, description: t.codDescription(paymentPolicy.cod?.fee ? money(paymentPolicy.cod.fee, currency) : "") },
    local: { title: t.local, description: t.localDescription },
    wallet: { title: t.wallet, description: t.walletDescription(money(paymentPolicy.wallet?.balance ?? 0, currency)) },
  };
  const why = (k: CheckoutPaymentKind): string | undefined => {
    const a = availability[k];
    if (a.available || !a.reason) return undefined;
    if (a.reason === "cod-limit") return t.unavailable["cod-limit"](money(a.amount ?? 0, currency));
    if (a.reason === "wallet-balance") return t.unavailable["wallet-balance"](money(a.amount ?? 0, currency));
    return t.unavailable[a.reason];
  };
  const offered = KIND_ORDER.filter((k) => availability[k].reason !== "not-offered");
  const paymentError = problems["payment.kind"];
  const localSubmission = data.payment.localReference ? { methodId: data.payment.localMethodId ?? "", reference: data.payment.localReference, status: "submitted" as const } : undefined;
  const paymentBody = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <span className="text-label text-foreground">{t.paymentMethod}</span>
        <RadioGroup aria-label={t.paymentMethod} value={kind ?? ""} onValueChange={(next) => update({ payment: { ...data.payment, kind: next as CheckoutPaymentKind } })}>
          {offered.map((k) => (
            <RadioCard key={k} value={k} disabled={!availability[k].available} title={kindText[k].title} description={why(k) ?? kindText[k].description} {...(k === "cod" && paymentPolicy.cod?.fee && availability.cod.available ? { meta: <StoreAmount amount={paymentPolicy.cod.fee} currency={currency} className="text-caption text-muted-foreground" /> } : {})} />
          ))}
        </RadioGroup>
        {paymentError ? <p role="alert" className="text-caption text-nq-danger-text">{paymentError === "unavailable" ? t.paymentProblems.unavailable : t.paymentProblems.required}</p> : null}
      </div>
      {kind === "card" ? (
        <div className="flex flex-col gap-2">
          <PaymentMethodForm value={card} onChange={setCard} methods={["card"]} errors={problems["payment.card"] ? cardErrors : {}} {...({} as object)} />
          {problems["payment.card"] ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {t.paymentProblems.card}
            </p>
          ) : null}
        </div>
      ) : null}
      {kind === "cod" ? <p className="text-body-sm text-muted-foreground">{t.codDescription(paymentPolicy.cod?.fee ? money(paymentPolicy.cod.fee, currency) : "")}</p> : null}
      {kind === "wallet" ? (
        <p className="text-body-sm text-muted-foreground">
          {t.walletDescription(money(paymentPolicy.wallet?.balance ?? 0, currency))}
        </p>
      ) : null}
      {kind === "local" ? (
        <div className="flex flex-col gap-2">
          <LocalPayments
            amount={summary.payable}
            currency={currency}
            methods={localMethods}
            {...(localSubmission ? { submission: localSubmission } : {})}
            {...(data.payment.localMethodId ? { defaultMethodId: data.payment.localMethodId } : {})}
            onSubmit={async (input) => {
              const result = await onLocalSubmit?.(input);
              if (result?.error) return result;
              update({ payment: { ...data.payment, kind: "local", localMethodId: input.methodId, localReference: input.reference } });
            }}
          />
          {data.payment.localReference ? <p role="status" className="text-body-sm text-nq-success-text">{t.localSent(data.payment.localReference)}</p> : null}
          {problems["payment.local"] ? (
            <p role="alert" className="text-caption text-nq-danger-text">
              {t.paymentProblems.local}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const failedSection = state.status === "failed" ? state.failure : undefined;

  return (
    <div data-slot="store-checkout" data-status={state.status} className={cn("mx-auto w-full max-w-6xl px-4 py-6 sm:px-6", className)} {...props}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-h1 font-semibold tracking-tight text-foreground">{t.title}</h1>
        <span className="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
          <Lock aria-hidden className="size-3.5" />
          {t.secure}
        </span>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
        <StoreOrderSummary lines={active} currency={currency} summary={summary} shippingMethod={method} {...(onEditCart ? { onEditCart } : {})} {...(labels ? { labels } : {})} className="lg:sticky lg:top-4 lg:order-2" />
        <form
          noValidate
          aria-busy={busy || undefined}
          onSubmit={(event) => {
            event.preventDefault();
            void place();
          }}
          className="flex min-w-0 flex-col gap-4 lg:order-1"
        >
          {section("contact", 0, contactSummary, contactBody)}
          {section("address", 1, addressSummary, addressBody)}
          {section("delivery", 2, deliverySummary, deliveryBody)}
          {section("payment", 3, paymentSummary, paymentBody)}
          {state.status === "failed" ? (
            <Alert
              tone="danger"
              title={t.failedTitle}
              action={
                <Button size="sm" variant="secondary" onClick={() => send({ type: "dismiss" })}>
                  {t.dismiss}
                </Button>
              }
            >
              {failedSection || t.failedGeneric}
            </Alert>
          ) : null}
          <div className="flex flex-col gap-2">
            <Button type="submit" variant="primary" size="lg" loading={busy} className="w-full" data-slot="store-place-order">
              {busy ? t.placing : t.placeOrderTotal(money(summary.payable, currency))}
            </Button>
            {!canPlace && !busy ? <p className="text-caption text-muted-foreground">{t.incomplete}</p> : null}
            <p className="text-caption text-muted-foreground">{t.terms}</p>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ confirmation */

export interface StoreOrderConfirmationProps extends Omit<ComponentProps<"div">, "children"> {
  order: CommerceOrder;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** How it was paid, for the wording. Default: from `order.payment` ("cod" is pay on delivery, "pending" a transfer being checked). */
  paymentKind?: CheckoutPaymentKind;
  gift?: boolean;
  onTrackOrder?: () => void;
  onContinueShopping?: () => void;
  now?: Date;
  weekend?: readonly number[];
  labels?: StoreCheckoutLabels;
}

/**
 * The page after placing an order: a confirmation with the order number (left to right in Arabic), where it goes and
 * when it should arrive, how it was paid, the items and totals, what happens next, and Track order / Continue shopping.
 * The heading takes focus on arrival so screen readers announce it.
 */
export function StoreOrderConfirmation({ order, currency: currencyProp, paymentKind, gift, onTrackOrder, onContinueShopping, now, weekend = [], labels, className, ...props }: StoreOrderConfirmationProps) {
  const currency = useCurrency(currencyProp);
  const { t, n, locale, ar } = useStoreCheckoutStrings(labels);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);
  const kind: CheckoutPaymentKind = paymentKind ?? (order.payment === "cod" ? "cod" : order.payment === "pending" ? "local" : "card");
  const steps = kind === "cod" ? t.next : kind === "local" ? t.nextLocal : t.nextPrepaid;
  const method = order.shippingMethod;
  const eta = method ? shippingEta(method, now ?? new Date(order.placedAt), weekend, locale, t) : undefined;
  const totals = order.totals;
  const fees = totals.total - (totals.subtotal - totals.discount + totals.shipping + (totals.tax > 0 ? totals.tax : 0));
  const address = order.shippingAddress;
  const Detail = ({ label, children }: { label: string; children: ReactNode }) => (
    <div className="flex flex-col gap-0.5">
      <dt className="text-caption text-muted-foreground">{label}</dt>
      <dd className="text-body-sm text-foreground [overflow-wrap:anywhere]">{children}</dd>
    </div>
  );
  return (
    <div data-slot="store-order-confirmation" className={cn("mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6", className)} {...props}>
      <header className="flex flex-col items-center gap-3 text-center">
        <span className="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
          <CheckCircle2 aria-hidden className="size-7" />
        </span>
        <h1 ref={heading} tabIndex={-1} className="text-h1 font-semibold tracking-tight text-foreground outline-none">
          {t.thanks(order.customer.name.split(" ")[0] ?? "")}
        </h1>
        <p className="text-body text-foreground">{t.confirmed}</p>
        <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
          {t.orderNumber}
          <bdi dir="ltr" className="rounded-control bg-secondary px-2 py-0.5 font-medium tabular-nums text-foreground">
            {order.number}
          </bdi>
        </p>
        {order.customer.email ? (
          <p className="text-body-sm text-muted-foreground">
            {t.emailed("@@EMAIL@@").split("@@EMAIL@@").flatMap((part, i) => (i === 0 ? [part] : [<bdi key="email" dir="ltr">{order.customer.email}</bdi>, part]))}
          </p>
        ) : null}
      </header>

      <section className="rounded-card border border-border bg-card p-4">
        <dl className="grid gap-4 sm:grid-cols-2">
          {address ? (
            <Detail label={t.deliveryTo}>
              <span className="flex flex-col">
                <span className="font-medium">{address.name}</span>
                {storeAddressLines(address, ar ? "، " : ", ").map((line) => (
                  <span key={line}>{line}</span>
                ))}
              </span>
            </Detail>
          ) : null}
          {method ? (
            <Detail label={t.deliveryMethod}>
              <span className="flex flex-col">
                <span>{method.label}</span>
                {eta ? <span className="text-muted-foreground">{eta}</span> : null}
              </span>
            </Detail>
          ) : null}
          <Detail label={t.paymentLabel}>{t.paymentKind[kind]}</Detail>
          <Detail label={t.placedOn}>
            <DateTime value={order.placedAt} format={{ dateStyle: "medium" }} />
          </Detail>
        </dl>
        {gift ? <Badge variant="info" className="mt-4">{t.giftOrder}</Badge> : null}
      </section>

      <section aria-labelledby="order-items" className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h2 id="order-items" className="text-h3 font-semibold text-foreground">
          {t.itemsTitle}
        </h2>
        <ul className="flex flex-col divide-y divide-border">
          {order.lines.map((line) => (
            <li key={line.id} className="flex items-center gap-3 py-3 first:pt-0">
              <StoreImage src={line.image} alt={line.name} size={56} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]">{line.name}</span>
                <span className="text-caption text-muted-foreground">{[line.variantLabel, t.quantityShort(n(line.quantity))].filter(Boolean).join(" · ")}</span>
              </span>
              <StoreAmount amount={line.unitPrice * line.quantity} currency={currency} className="text-body-sm" />
            </li>
          ))}
        </ul>
        <dl className="flex flex-col gap-1.5 border-t border-border pt-3 text-body-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t.subtotal}</dt>
            <dd><StoreAmount amount={totals.subtotal} currency={currency} /></dd>
          </div>
          {totals.discount > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.discount}</dt>
              <dd className="text-nq-success-text">
                <bdi dir="ltr">−</bdi>
                <StoreAmount amount={totals.discount} currency={currency} className="text-nq-success-text" />
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-muted-foreground">{t.shipping}</dt>
            <dd>{totals.shipping === 0 ? <span className="text-nq-success-text">{t.free}</span> : <StoreAmount amount={totals.shipping} currency={currency} />}</dd>
          </div>
          {totals.tax > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.tax}</dt>
              <dd><StoreAmount amount={totals.tax} currency={currency} /></dd>
            </div>
          ) : null}
          {fees > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">{t.fees}</dt>
              <dd><StoreAmount amount={fees} currency={currency} /></dd>
            </div>
          ) : null}
          <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
            <dt className="text-label text-foreground">{t.total}</dt>
            <dd><StoreCartMoney amount={totals.total} currency={currency} size="lg" /></dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="order-next" className="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h2 id="order-next" className="text-h3 font-semibold text-foreground">
          {t.nextTitle}
        </h2>
        <ol className="flex flex-col gap-2">
          {steps.map((step, i) => (
            <li key={step} className="flex items-start gap-3 text-body-sm text-foreground">
              <span aria-hidden className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption text-muted-foreground">
                <Num value={i + 1} />
              </span>
              {step}
            </li>
          ))}
        </ol>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onTrackOrder ? (
          <Button variant="primary" onClick={onTrackOrder}>
            {t.trackOrder}
          </Button>
        ) : null}
        {onContinueShopping ? (
          <Button variant="secondary" onClick={onContinueShopping}>
            {t.continueShopping}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
