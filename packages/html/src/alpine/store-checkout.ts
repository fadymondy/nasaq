// nqStoreCheckout: the Alpine state behind <x-nq::store-checkout> (see packages/php). One-page checkout for physical goods in four
// sections that open one after another (contact, delivery address, shipping method with gift and notes, payment) beside an order summary.
// The decisions live in store-checkout-logic (country-aware address rules, the checkout state machine, totals with the COD and gift-wrap
// fees); this file renders that state and fires events.
//
//   <div data-slot="store-checkout" x-data='nqStoreCheckout({ lines, currency, shippingMethods, savedAddresses, paymentPolicy, t, ... })'> ... </div>
//
// React's callbacks become bubbling events (HTML has no callback props). Nobody listening is the same as success, so a bare page still finishes:
//   nq-store-checkout-place      { draft, resolve(result?), reject(message), waitUntil(promise) }  cancelable and claimable: send the order, then
//                                resolve({ orderNumber }) (or { order }), resolve({ error }) / reject(message) to show the failure with a retry.
//                                draft = { data, lines, summary, shippingMethod, card?, order, attempt }. The card fields are only there when paying by card.
//   nq-store-checkout-placed     { order }          after the confirmation is on screen
//   nq-store-checkout-sign-in    {}                 the Sign in button of the contact section
//   nq-store-checkout-edit-cart  {}                 "Edit cart" in the summary
//   nq-store-checkout-track      { order }          "Track order" on the confirmation
//   nq-store-checkout-continue   {}                 "Continue shopping" on the confirmation
// Listened to: "nq-local-payment-submit" from an embedded <x-nq::local-payments>: its reference is kept as the local payment.
// Money is minor units (cents). Currency defaults to USD, SAR in Arabic. Strings arrive resolved in config.t (see the Blade _strings partial).

import { cardDigits, detectBrand, formatCardNumber, formatExpiry, validatePaymentForm, type CardBrand } from "./checkout-steps";
import {
  buildOrder,
  CHECKOUT_SECTIONS,
  checkoutReduce,
  checkoutSummary,
  countryRule,
  emptyCheckoutData,
  etaWindow,
  GIFT_MESSAGE_MAX,
  initialCheckout,
  normalizePostalCode,
  NOTES_MAX,
  paymentAvailability,
  STORE_COUNTRY_CODES,
  storeAddressLines,
  validateCheckout,
  validateSection,
  type CheckoutContext,
  type CheckoutData,
  type CheckoutPaymentKind,
  type CheckoutSection,
  type CheckoutState,
  type CommerceAddress,
  type CommerceCartLine,
  type CommerceOrder,
  type CommerceShippingMethod,
  type PaymentPolicy,
} from "./store-checkout-logic";
import type { Register } from "./types";

type T = Record<string, any>;

interface Config {
  locale?: string;
  currency?: string;
  /** The resolved strings (en or ar), from the Blade partial. */
  t: T;
  lines?: CommerceCartLine[];
  shippingMethods?: CommerceShippingMethod[];
  savedAddresses?: CommerceAddress[];
  countries?: string[];
  account?: { name: string; email: string } | null;
  paymentPolicy?: PaymentPolicy;
  discount?: number;
  taxBps?: number | null;
  taxInclusive?: boolean | null;
  giftWrapFee?: number | null;
  weekend?: number[];
  /** ISO time delivery is counted from. */
  now?: string;
  defaultValues?: Partial<CheckoutData>;
}

const KINDS: CheckoutPaymentKind[] = ["card", "cod", "local", "wallet"];
const BRAND_NAME: Record<CardBrand, [string, string]> = {
  visa: ["Visa", "Visa"],
  mastercard: ["Mastercard", "Mastercard"],
  amex: ["American Express", "American Express"],
  mada: ["mada", "مدى"],
  unknown: ["Card", "بطاقة"],
};

/** Fires a claimable event. Resolves to null when nobody claimed it (a page that does nothing = success). */
function claimable(root: HTMLElement, name: string, detail: Record<string, unknown>): Promise<{ result?: any; error?: string } | null> {
  let claimed = false;
  let settle!: (outcome: { result?: any; error?: string }) => void;
  const outcome = new Promise<{ result?: any; error?: string }>((resolve) => (settle = resolve));
  const reason = (e: unknown) => (e instanceof Error && e.message ? e.message : typeof e === "string" ? e : "");
  const full = {
    ...detail,
    resolve(result?: any) {
      claimed = true;
      settle(result && typeof result === "object" && result.error ? { error: String(result.error) } : { result });
    },
    reject(message?: unknown) {
      claimed = true;
      settle({ error: reason(message) });
    },
    waitUntil(promise: Promise<any>) {
      claimed = true;
      Promise.resolve(promise).then(
        (result) => settle(result && typeof result === "object" && result.error ? { error: String(result.error) } : { result }),
        (e) => settle({ error: reason(e) }),
      );
    },
  };
  root.dispatchEvent(new CustomEvent(name, { detail: full, bubbles: true, cancelable: true }));
  return Promise.resolve(claimed ? outcome : null);
}

export const storeCheckout: Register = (Alpine) => {
  Alpine.data("nqStoreCheckout", (config: Config) => {
    const loc = config.locale ?? "en";
    const ar = /^ar\b/i.test(loc);
    const currency = (config.currency || (ar ? "SAR" : "USD")).toUpperCase();
    const t = config.t;
    const lines = (config.lines ?? []).filter((l) => !l.savedForLater);
    const methods = config.shippingMethods ?? [];
    const saved = config.savedAddresses ?? [];
    const countries = config.countries?.length ? config.countries : STORE_COUNTRY_CODES;
    const policy: PaymentPolicy = config.paymentPolicy ?? { card: true };
    const account = config.account ?? null;
    const weekend = config.weekend ?? [];
    const giftWrapFee = config.giftWrapFee ?? undefined;
    const lang = ar ? "ar" : "en";
    const sep = ar ? "، " : ", ";
    const tag = `${loc}-u-nu-latn`;
    const digits = (() => {
      try {
        return new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions().maximumFractionDigits ?? 2;
      } catch {
        return 2;
      }
    })();
    const factor = 10 ** digits;
    const fill = (s: string, ...a: string[]) => String(s).replace(/\{(\d+)\}/g, (_, i: string) => a[Number(i)] ?? "");
    const num = (v: number) => new Intl.NumberFormat(tag).format(v);
    const money = (minor: number) => {
      const major = minor / factor;
      const whole = Number.isInteger(major);
      try {
        return new Intl.NumberFormat(tag, { style: "currency", currency, ...(whole ? { minimumFractionDigits: 0, maximumFractionDigits: 0 } : {}) }).format(major);
      } catch {
        return String(major);
      }
    };
    const nowDate = () => (config.now ? new Date(config.now) : new Date());
    const itemsText = (count: number) => {
      const key = count === 1 ? "itemsOne" : ar && count === 2 ? "itemsTwo" : ar && count >= 3 && count <= 10 ? "itemsFew" : "items";
      return fill(String(t[key]).replace("{n}", num(count)));
    };
    const eta = (m: CommerceShippingMethod, from: Date = nowDate()): string => {
      if (!m.etaDays) return "";
      if (m.etaDays[1] <= 1) return t.arrivesToday;
      const w = etaWindow(m.etaDays, from, weekend);
      let range: string;
      try {
        range = new Intl.DateTimeFormat(tag, { month: "short", day: "numeric", timeZone: "UTC" }).formatRange(w.start, w.end);
      } catch {
        range = `${w.start.toISOString().slice(0, 10)} - ${w.end.toISOString().slice(0, 10)}`;
      }
      return fill(t.arrives, range);
    };

    const first = saved.find((a) => a.isDefault) ?? saved[0];
    const country = countries[0] ?? "EG";
    const state: CheckoutState = initialCheckout(
      emptyCheckoutData({
        shipping: first ? { ...first } : { country },
        billing: { country: first?.country ?? country },
        ...(first?.id ? { savedAddressId: first.id } : {}),
        ...(account ? { contact: { mode: "account" as const, email: account.email, marketing: false } } : {}),
        ...config.defaultValues,
      }),
      "contact",
    );

    return {
      t,
      lang,
      sections: CHECKOUT_SECTIONS as readonly CheckoutSection[],
      state,
      /** The card fields (the shared payment-method-form reads and writes them). */
      payment: { method: "card", number: "", holder: "", expiry: "", cvc: "" },
      paymentErrors: { number: "", holder: "", expiry: "", cvc: "" },
      cardShown: false,
      placed: null as CommerceOrder | null,
      /** The form as it was when the order failed: editing anything after that clears the failed banner. */
      failedSnapshot: "",
      summaryOpen: false,
      root: null as unknown as HTMLElement,
      giftMax: GIFT_MESSAGE_MAX,
      notesMax: NOTES_MAX,

      init(this: any) {
        this.root = this.$el as HTMLElement;
        // Every edit goes through x-model on state.data; this keeps done sections, errors and the failed banner honest after it.
        this.$watch("state.data", () => this.reconcile());
        this.$watch("payment", () => this.reconcile());
        this.$watch("state.section", () => {
          this.$nextTick(() => (this.$refs["h-" + this.state.section] as HTMLElement | undefined)?.focus());
        });
      },

      /* ---------------------------------------------------------- formatting */
      n: num,
      money,
      price: money,
      sectionTitle(id: CheckoutSection) {
        return t.steps[id];
      },
      stepText(i: number) {
        return fill(t.stepOf, num(i + 1), num(CHECKOUT_SECTIONS.length));
      },
      itemsText,
      editLabel(id: CheckoutSection) {
        return `${t.edit}, ${t.steps[id]}`;
      },

      /* ---------------------------------------------------------- derived */
      get active() {
        return lines;
      },
      get method(): CommerceShippingMethod | undefined {
        return methods.find((m) => m.id === this.state.data.shippingMethodId);
      },
      get giftWrap(): boolean {
        return this.state.data.gift.enabled && this.state.data.gift.wrap && giftWrapFee !== undefined;
      },
      summaryInput() {
        const m = this.method;
        return {
          lines,
          discount: config.discount ?? 0,
          ...(m ? { shippingMethod: m } : {}),
          ...(config.taxBps ? { taxBps: config.taxBps } : {}),
          ...(config.taxInclusive != null ? { taxInclusive: config.taxInclusive } : {}),
          giftWrap: this.giftWrap,
          ...(giftWrapFee !== undefined ? { giftWrapFee } : {}),
        };
      },
      get base() {
        return checkoutSummary(this.summaryInput());
      },
      get availability() {
        return paymentAvailability(policy, { total: this.base.payable, country: this.state.data.shipping.country ?? "" });
      },
      get kind(): CheckoutPaymentKind | undefined {
        return this.state.data.payment.kind;
      },
      get summary() {
        const k = this.kind;
        return checkoutSummary({ ...this.summaryInput(), ...(k ? { paymentKind: k } : {}), policy });
      },
      get busy(): boolean {
        return this.state.status === "submitting";
      },
      get ariaBusy(): string | null {
        return this.busy ? "true" : null;
      },
      get giftWrapText(): string {
        return giftWrapFee === undefined ? "" : fill(t.giftWrapFee, money(giftWrapFee));
      },
      get failed(): boolean {
        return this.state.status === "failed";
      },
      get isPlaced(): boolean {
        return this.state.status === "placed" && !!this.placed;
      },
      get isForm(): boolean {
        return !(this.state.status === "placed" && this.placed);
      },
      cardErrors() {
        return validatePaymentForm(this.payment, { required: t.problems.required, invalidCard: t.invalidCard, invalidExpiry: t.invalidExpiry, invalidCvc: t.invalidCvc });
      },
      get ctx(): CheckoutContext {
        const av = this.availability;
        return {
          shippingMethodIds: methods.map((m) => m.id),
          signedIn: !!account,
          cardValid: Object.keys(this.cardErrors()).length === 0,
          localReady: !!this.state.data.payment.localReference,
          paymentAvailable: Object.fromEntries(KINDS.map((k) => [k, av[k].available])) as Partial<Record<CheckoutPaymentKind, boolean>>,
        };
      },
      get problems(): Record<string, string> {
        return this.state.errors;
      },
      get canPlace(): boolean {
        return CHECKOUT_SECTIONS.every((s) => Object.keys(validateSection(s, this.state.data, this.ctx)).length === 0);
      },
      get showIncomplete(): boolean {
        return !this.canPlace && !this.busy;
      },
      get placeLabel(): string {
        return this.busy ? t.placing : fill(t.placeOrderTotal, money(this.summary.payable));
      },

      /* ---------------------------------------------------------- the machine */
      send(event: any) {
        this.state = checkoutReduce(this.state, event, this.ctx);
        if (this.state.status === "failed") this.failedSnapshot = this.snapshot();
      },
      snapshot(): string {
        return JSON.stringify([this.state.data, this.payment]);
      },
      /** x-model edits data in place; the machine's "update" rules (reopen sections that no longer hold, drop fixed errors) are applied to the rest. */
      reconcile() {
        const s = this.state as CheckoutState;
        if (s.status === "placed" || s.status === "submitting") return;
        const ctx = this.ctx;
        const done = s.done.filter((x) => Object.keys(validateSection(x, s.data, ctx)).length === 0);
        if (done.length !== s.done.length) s.done = done;
        const live = validateCheckout(s.data, ctx);
        const keep = Object.keys(s.errors).filter((k) => k in live);
        if (keep.length !== Object.keys(s.errors).length) s.errors = Object.fromEntries(keep.map((k) => [k, s.errors[k]])) as typeof s.errors;
        if (s.status === "failed" && this.snapshot() !== this.failedSnapshot) s.status = "editing";
      },
      isDone(id: CheckoutSection) {
        return this.state.done.includes(id);
      },
      isOpen(id: CheckoutSection) {
        return this.state.section === id;
      },
      sectionState(id: CheckoutSection) {
        return this.isOpen(id) ? "open" : this.isDone(id) ? "done" : "locked";
      },
      reachable(id: CheckoutSection) {
        return this.isDone(id) || CHECKOUT_SECTIONS.indexOf(id) <= CHECKOUT_SECTIONS.findIndex((x) => !this.isDone(x));
      },
      showEdit(id: CheckoutSection) {
        return !this.isOpen(id) && this.isDone(id) && !this.busy;
      },
      showSummaryLine(id: CheckoutSection) {
        return !this.isOpen(id) && this.isDone(id) && !!this.summaryOf(id);
      },
      showContinue(id: CheckoutSection) {
        return id !== "payment" && this.reachable(id);
      },
      open(id: CheckoutSection) {
        this.send({ type: "open", section: id });
      },
      next() {
        this.send({ type: "continue" });
      },
      dismiss() {
        this.send({ type: "dismiss" });
      },
      sectionClass(id: CheckoutSection) {
        return this.isOpen(id) ? "border-nq-line-strong" : "border-border";
      },
      badgeClass(id: CheckoutSection) {
        return this.isDone(id) ? "bg-nq-success-soft text-nq-success-text" : this.isOpen(id) ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground";
      },
      summaryOf(id: CheckoutSection): string {
        const d = this.state.data as CheckoutData;
        if (id === "contact") return d.contact.mode === "account" ? (account ? `${account.name} · ${account.email}` : t.problems.signIn) : d.contact.email;
        if (id === "address") return storeAddressLines(d.shipping, sep).join(sep);
        if (id === "delivery") {
          const m = this.method;
          return m ? [m.label, eta(m)].filter(Boolean).join(" · ") : "";
        }
        const k = this.kind;
        return k ? t[k] : "";
      },

      /* ---------------------------------------------------------- contact */
      get emailError(): string {
        const code = this.problems["contact.email"];
        return code ? (code === "required" ? t.problems.required : t.problems.email) : "";
      },
      get signedIn(): boolean {
        return !!account;
      },
      get guestMode(): boolean {
        return this.state.data.contact.mode === "guest";
      },
      get accountMode(): boolean {
        return this.state.data.contact.mode === "account";
      },
      setMode(mode: "guest" | "account") {
        const c = this.state.data.contact;
        c.mode = mode;
        if (mode === "account" && account) c.email = account.email;
      },
      signIn() {
        this.root.dispatchEvent(new CustomEvent("nq-store-checkout-sign-in", { bubbles: true }));
      },
      get signInError(): boolean {
        return !!this.problems["contact.account"];
      },

      /* ---------------------------------------------------------- address */
      get countryList() {
        return countries.map((code) => ({ code, name: countryRule(code).name[lang] }));
      },
      get usingSaved(): boolean {
        const id = this.state.data.savedAddressId;
        return !!id && saved.some((a) => a.id === id);
      },
      get newAddress(): boolean {
        return !this.usingSaved;
      },
      get savedChoice(): string {
        return this.usingSaved ? this.state.data.savedAddressId : "__new";
      },
      set savedChoice(next: string) {
        if (next === "__new") {
          this.state.data.savedAddressId = undefined;
          this.state.data.shipping = { country: this.state.data.shipping.country ?? countries[0] ?? "EG" };
          return;
        }
        const found = saved.find((a) => a.id === next);
        if (found) {
          this.state.data.savedAddressId = found.id;
          this.state.data.shipping = { ...found };
        }
      },
      addressLines(a: Partial<CommerceAddress>): string[] {
        return storeAddressLines(a, sep);
      },
      get billingOther(): boolean {
        return !this.state.data.billingSame;
      },
      ruleOf(a: Partial<CommerceAddress>) {
        return countryRule((a.country ?? countries[0] ?? "EG").toUpperCase());
      },
      countryOf(a: Partial<CommerceAddress>): string {
        return this.ruleOf(a).code;
      },
      hasRegion(a: Partial<CommerceAddress>): boolean {
        return this.ruleOf(a).regionKind !== "none";
      },
      regionList(a: Partial<CommerceAddress>) {
        return (this.ruleOf(a).regions ?? []).map((r: any) => ({ id: r.id, name: r[lang] }));
      },
      hasRegionList(a: Partial<CommerceAddress>): boolean {
        return !!this.ruleOf(a).regions;
      },
      hasFreeRegion(a: Partial<CommerceAddress>): boolean {
        return this.hasRegion(a) && !this.ruleOf(a).regions;
      },
      hasPostal(a: Partial<CommerceAddress>): boolean {
        return !this.ruleOf(a).noPostal;
      },
      regionLabel(a: Partial<CommerceAddress>): string {
        const r = this.ruleOf(a);
        return `${t.region[r.regionKind]}${r.regionRequired ? "" : ` ${t.optional}`}`;
      },
      postalLabel(a: Partial<CommerceAddress>): string {
        const r = this.ruleOf(a);
        return `${t.postalCode}${r.postalRequired ? "" : ` ${t.optional}`}`;
      },
      phonePlaceholder(a: Partial<CommerceAddress>): string {
        const r = this.ruleOf(a);
        return `+${r.dial} ${r.phoneExample}`.trim();
      },
      postalPlaceholder(a: Partial<CommerceAddress>): string {
        return this.ruleOf(a).postalExample ?? "";
      },
      countryChanged(a: Partial<CommerceAddress>) {
        a.region = "";
        a.postalCode = "";
      },
      normalizePostal(a: Partial<CommerceAddress>) {
        if (a.postalCode) a.postalCode = normalizePostalCode(this.countryOf(a), a.postalCode);
      },
      /** The sentence for a problem code of one address field ("" when fine). which: "shipping" | "billing". */
      problem(which: string, a: Partial<CommerceAddress>, field: string): string {
        const code = this.problems[`${which}.${field}`];
        if (!code) return "";
        const r = this.ruleOf(a);
        if (code === "postalCode") return r.postalExample ? fill(t.problems.postalCode, r.postalExample) : t.problems.postalCodeNone;
        if (code === "phone") return r.phoneExample ? fill(t.problems.phone, `+${r.dial} ${r.phoneExample}`.trim()) : t.problems.phoneNone;
        if (code === "required" || code === "tooShort" || code === "tooLong" || code === "region") return t.problems[code];
        return t.problems.required;
      },
      invalid(which: string, field: string): boolean {
        return !!this.problems[`${which}.${field}`];
      },

      /* ---------------------------------------------------------- delivery */
      isFree(m: CommerceShippingMethod): boolean {
        return m.price === 0 || (m.freeOver !== undefined && this.base.subtotal - this.base.discount >= m.freeOver);
      },
      etaOf(id: string): string {
        const m = methods.find((x) => x.id === id);
        return m ? eta(m) : "";
      },
      methodFree(id: string): boolean {
        const m = methods.find((x) => x.id === id);
        return !!m && this.isFree(m);
      },
      methodPaid(id: string): boolean {
        const m = methods.find((x) => x.id === id);
        return !!m && !this.isFree(m);
      },
      methodPrice(id: string): string {
        const m = methods.find((x) => x.id === id);
        return m ? money(m.price) : "";
      },
      get methodError(): string {
        const code = this.problems["delivery.method"];
        return code ? (code === "unavailable" ? t.methodProblems.unavailable : t.methodProblems.required) : "";
      },
      get giftOn(): boolean {
        return this.state.data.gift.enabled;
      },
      get giftLeftText(): string {
        return fill(t.giftMessageHint, num(Math.max(GIFT_MESSAGE_MAX - this.state.data.gift.message.length, 0)));
      },
      get notesLeftText(): string {
        return fill(t.notesHint, num(Math.max(NOTES_MAX - this.state.data.notes.length, 0)));
      },
      get giftError(): string {
        return this.problems["gift.message"] ? t.problems.tooLong : "";
      },
      get notesError(): string {
        return this.problems.notes ? t.problems.tooLong : "";
      },

      /* ---------------------------------------------------------- payment */
      get kindChoice(): string {
        return this.kind ?? "";
      },
      set kindChoice(next: string) {
        this.state.data.payment.kind = next as CheckoutPaymentKind;
      },
      offered(k: CheckoutPaymentKind): boolean {
        return this.availability[k].reason !== "not-offered";
      },
      kindDisabled(k: CheckoutPaymentKind): boolean {
        return !this.availability[k].available;
      },
      /** The line under a payment option: why it is unavailable, else what it is. */
      kindText(k: CheckoutPaymentKind): string {
        const a = this.availability[k];
        if (!a.available && a.reason) {
          if (a.reason === "cod-limit") return fill(t.unavailable["cod-limit"], money(a.amount ?? 0));
          if (a.reason === "wallet-balance") return fill(t.unavailable["wallet-balance"], money(a.amount ?? 0));
          return t.unavailable[a.reason];
        }
        if (k === "cod") return this.codText;
        if (k === "wallet") return this.walletText;
        return t[`${k}Description`];
      },
      get codText(): string {
        const fee = policy.cod?.fee;
        return fee ? fill(t.codDescription, money(fee)) : t.codDescriptionNone;
      },
      get walletText(): string {
        return fill(t.walletDescription, money(policy.wallet?.balance ?? 0));
      },
      get codFeeText(): string {
        return policy.cod?.fee && this.availability.cod.available ? money(policy.cod.fee) : "";
      },
      get paymentError(): string {
        const code = this.problems["payment.kind"];
        return code ? (code === "unavailable" ? t.paymentProblems.unavailable : t.paymentProblems.required) : "";
      },
      get cardProblem(): boolean {
        return !!this.problems["payment.card"];
      },
      get localProblem(): boolean {
        return !!this.problems["payment.local"];
      },
      get isCard(): boolean {
        return this.kind === "card";
      },
      get isCod(): boolean {
        return this.kind === "cod";
      },
      get isWallet(): boolean {
        return this.kind === "wallet";
      },
      get isLocal(): boolean {
        return this.kind === "local";
      },
      get localSentText(): string {
        const ref = this.state.data.payment.localReference;
        return ref ? fill(t.localSent, ref) : "";
      },
      onLocalSubmit(e: CustomEvent) {
        const input = e.detail?.input ?? {};
        if (!input.reference) return;
        this.state.data.payment = { ...this.state.data.payment, kind: "local", localMethodId: input.methodId, localReference: input.reference };
      },
      // the card handlers of the shared payment-method-form: they write the formatted text back so a rejected character does not linger
      get brand(): CardBrand {
        return detectBrand(this.payment.number);
      },
      get brandName(): string {
        return BRAND_NAME[this.brand as CardBrand][ar ? 1 : 0];
      },
      get cvcPlaceholder(): string {
        return this.brand === "amex" ? "1234" : "123";
      },
      clearPaymentErrors() {
        this.paymentErrors = { number: "", holder: "", expiry: "", cvc: "" };
      },
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
      /** Shows the card field errors (after a failed Continue or Place order on the card). */
      showCardErrors() {
        this.paymentErrors = { number: "", holder: "", expiry: "", cvc: "", ...this.cardErrors() };
      },

      /* ---------------------------------------------------------- summary */
      lineMeta(line: CommerceCartLine): string {
        return [line.variantLabel, fill(t.quantityShort, num(line.quantity))].filter(Boolean).join(" · ");
      },
      lineTotal(line: CommerceCartLine): string {
        return money(line.unitPrice * line.quantity);
      },
      get summaryToggleLabel(): string {
        return this.summaryOpen ? t.hideSummary : t.showSummary;
      },
      get subtotalLabel(): string {
        return `${t.subtotal} · ${itemsText(this.summary.itemCount)}`;
      },
      get shippingLabel(): string {
        return this.method ? `${t.shipping} · ${this.method.label}` : t.shipping;
      },
      get hasMethod(): boolean {
        return !!this.method;
      },
      get noMethod(): boolean {
        return !this.method;
      },
      get shippingFree(): boolean {
        return !!this.method && this.summary.shipping === 0;
      },
      get shippingPaid(): boolean {
        return !!this.method && this.summary.shipping > 0;
      },
      get hasDiscount(): boolean {
        return this.summary.discount > 0;
      },
      get hasTax(): boolean {
        return this.summary.tax > 0;
      },
      get hasCodFee(): boolean {
        return this.summary.codFee > 0;
      },
      get hasWrapFee(): boolean {
        return this.summary.giftWrapFee > 0;
      },
      get hasSavings(): boolean {
        return this.summary.savings > 0;
      },
      get savingText(): string {
        return fill(t.saving, money(this.summary.savings));
      },
      editCart() {
        this.root.dispatchEvent(new CustomEvent("nq-store-checkout-edit-cart", { bubbles: true }));
      },

      /* ---------------------------------------------------------- placing the order */
      async place() {
        if (this.busy || this.state.status === "placed") return;
        // The card form is not part of the machine's data: surface its errors when the shopper chose card.
        if (this.kind === "card") this.showCardErrors();
        const next = checkoutReduce(this.state, { type: "submit" }, this.ctx);
        this.state = next;
        if (next.status !== "submitting") return;
        const data: CheckoutData = JSON.parse(JSON.stringify(next.data));
        const m = this.method;
        const summary = this.summary;
        const draftOrder = buildOrder({ data, lines, summary, ...(m ? { shippingMethod: m } : {}), number: "", now: nowDate(), ...(account ? { customerName: account.name } : {}) });
        const draft = { data, lines, summary, shippingMethod: m, ...(data.payment.kind === "card" ? { card: { ...this.payment } } : {}), order: draftOrder, attempt: next.attempts };
        try {
          const outcome = await claimable(this.root, "nq-store-checkout-place", { draft });
          if (outcome?.error !== undefined) {
            this.send({ type: "failed", reason: outcome.error });
            return;
          }
          const result = outcome?.result;
          const number: string = result?.orderNumber ?? result?.order?.number ?? `#${1000 + next.attempts}`;
          const order: CommerceOrder = result?.order ?? { ...draftOrder, number, id: `ord-${number.replace(/\D/g, "")}` };
          this.send({ type: "succeeded", orderNumber: number });
          this.placed = order;
          this.root.dispatchEvent(new CustomEvent("nq-store-checkout-placed", { bubbles: true, detail: { order } }));
          this.$nextTick(() => (this.$refs.thanks as HTMLElement | undefined)?.focus());
        } catch (error) {
          this.send({ type: "failed", reason: error instanceof Error ? error.message : "" });
        }
      },
      get failureText(): string {
        return this.state.failure || t.failedGeneric;
      },

      /* ---------------------------------------------------------- confirmation */
      get order(): CommerceOrder {
        return (this.placed ?? { lines: [], totals: { subtotal: 0, discount: 0, shipping: 0, tax: 0, total: 0 }, customer: { name: "" }, number: "", placedAt: "" }) as CommerceOrder;
      },
      get thanksText(): string {
        const name = (this.order.customer.name.split(" ")[0] ?? "").trim();
        return name ? fill(t.thanks, name) : t.thanksNone;
      },
      get emailedText(): string {
        const email = this.order.customer.email;
        return email ? fill(t.emailed, email) : "";
      },
      get orderAddress(): string[] {
        const a = this.order.shippingAddress;
        return a ? storeAddressLines(a, sep) : [];
      },
      get orderMethodEta(): string {
        const m = this.order.shippingMethod;
        return m ? eta(m, nowDate()) : "";
      },
      get orderMethodLabel(): string {
        return this.order.shippingMethod?.label ?? "";
      },
      get orderPaymentText(): string {
        return t.paymentKind[this.kind ?? "card"];
      },
      get placedDate(): string {
        try {
          return new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(this.order.placedAt));
        } catch {
          return this.order.placedAt;
        }
      },
      get nextSteps(): string[] {
        return this.kind === "cod" ? t.next : this.kind === "local" ? t.nextLocal : t.nextPrepaid;
      },
      get orderFees(): number {
        const o = this.order.totals;
        return o.total - (o.subtotal - o.discount + o.shipping + (o.tax > 0 ? o.tax : 0));
      },
      get orderHasDiscount(): boolean {
        return this.order.totals.discount > 0;
      },
      get orderShipFree(): boolean {
        return this.order.totals.shipping === 0;
      },
      get orderShipPaid(): boolean {
        return this.order.totals.shipping > 0;
      },
      get orderHasTax(): boolean {
        return this.order.totals.tax > 0;
      },
      get orderHasFees(): boolean {
        return this.orderFees > 0;
      },
      get hasAddress(): boolean {
        return !!this.order.shippingAddress;
      },
      get hasOrderMethod(): boolean {
        return !!this.order.shippingMethod;
      },
      get hasOrderEta(): boolean {
        return !!this.orderMethodEta;
      },
      track() {
        this.root.dispatchEvent(new CustomEvent("nq-store-checkout-track", { bubbles: true, detail: { order: this.placed } }));
      },
      continueShopping() {
        this.root.dispatchEvent(new CustomEvent("nq-store-checkout-continue", { bubbles: true }));
      },
    };
  });
};
