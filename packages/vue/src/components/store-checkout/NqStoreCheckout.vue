<script setup lang="ts">
import { Check, CheckCircle2, Lock, MapPin, ShoppingBag, Truck } from "lucide-vue-next";
import { computed, nextTick, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqAlert } from "../alert";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { emptyPaymentForm, type PaymentFormValue, NqPaymentMethodForm, validatePaymentForm } from "../checkout-steps";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput, NqTextarea } from "../field";
import { NqLocalPayments, type LocalPaymentInput, type LocalPaymentMethod } from "../local-payments";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { NqEmptyState } from "../states";
import NqStoreAmount from "../store-cart/NqStoreAmount.vue";
import { NqSwitch } from "../switch";
import { NqTabs, NqTabsList, NqTabsPanel, NqTabsTab } from "../tabs";
import { STORE_COUNTRY_CODES, storeAddressLines, type AddressErrors } from "./address-rules";
import {
  buildOrder,
  CHECKOUT_SECTIONS,
  checkoutReduce,
  checkoutSummary,
  emptyCheckoutData,
  GIFT_MESSAGE_MAX,
  initialCheckout,
  NOTES_MAX,
  paymentAvailability,
  validateSection,
  type CheckoutContext,
  type CheckoutData,
  type CheckoutPaymentKind,
  type CheckoutSection,
  type CheckoutState,
  type PaymentPolicy,
} from "./checkout-machine";
import type { CommerceAddress, CommerceCartLine, CommerceOrder, CommerceShippingMethod } from "./commerce";
import { storeShippingEta } from "./eta";
import NqStoreAddressForm from "./NqStoreAddressForm.vue";
import NqStoreOrderConfirmation from "./NqStoreOrderConfirmation.vue";
import NqStoreOrderSummary from "./NqStoreOrderSummary.vue";
import { useStoreCheckoutStrings, type StoreCheckoutLabels } from "./strings";
import type { StoreCheckoutDraft, StorePlaceOrderResult } from "./types";

// Checkout for physical goods on one page, in four sections that open one after another: contact (guest or signed in),
// delivery address (country-aware, with saved addresses and a separate billing address), shipping method with its
// arrival dates plus gift options and notes, and payment (card, cash on delivery, local methods, wallet). The summary
// sits beside it. All decisions live in the pure `checkout-machine` and `address-rules`; this renders them. Placing the
// order shows a loading state, a retryable failure, and then the confirmation.
interface Props {
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
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  savedAddresses: () => [],
  countries: () => STORE_COUNTRY_CODES,
  account: undefined,
  onSignIn: undefined,
  paymentPolicy: () => ({ card: true }),
  localMethods: () => [],
  onLocalSubmit: undefined,
  discount: 0,
  taxBps: undefined,
  taxInclusive: undefined,
  giftWrapFee: undefined,
  weekend: () => [],
  now: undefined,
  defaultValues: undefined,
  onPlaced: undefined,
  onEditCart: undefined,
  onTrackOrder: undefined,
  onContinueShopping: undefined,
  labels: undefined,
});
defineOptions({ inheritAttrs: false });

const KIND_ORDER: CheckoutPaymentKind[] = ["card", "cod", "local", "wallet"];

const currency = useCurrency(() => props.currency);
const { t, n, money, locale, ar } = useStoreCheckoutStrings(() => props.labels);
const active = computed(() => props.lines.filter((l) => !l.savedForLater));
const idBase = `nq-checkout-${useId()}`;

const state = ref<CheckoutState>(
  (() => {
    const first = props.savedAddresses.find((a) => a.isDefault) ?? props.savedAddresses[0];
    const country = props.countries[0] ?? "EG";
    return initialCheckout(
      emptyCheckoutData({
        shipping: first ? { ...first } : { country },
        billing: { country: first?.country ?? country },
        ...(first?.id ? { savedAddressId: first.id } : {}),
        ...(props.account ? { contact: { mode: "account" as const, email: props.account.email, marketing: false } } : {}),
        ...props.defaultValues,
      }),
      "contact",
    );
  })(),
);
const card = ref<PaymentFormValue>({ ...emptyPaymentForm });
const placed = ref<CommerceOrder | undefined>();
const data = computed(() => state.value.data);
const busy = computed(() => state.value.status === "submitting");

const method = computed(() => props.shippingMethods.find((m) => m.id === data.value.shippingMethodId));
const giftWrap = computed(() => data.value.gift.enabled && data.value.gift.wrap && props.giftWrapFee !== undefined);
const summaryInput = () => ({
  lines: active.value as CommerceCartLine[],
  discount: props.discount,
  ...(method.value ? { shippingMethod: method.value } : {}),
  ...(props.taxBps ? { taxBps: props.taxBps } : {}),
  ...(props.taxInclusive !== undefined ? { taxInclusive: props.taxInclusive } : {}),
  giftWrap: giftWrap.value,
  ...(props.giftWrapFee !== undefined ? { giftWrapFee: props.giftWrapFee } : {}),
});
const base = computed(() => checkoutSummary(summaryInput()));
const availability = computed(() => paymentAvailability(props.paymentPolicy, { total: base.value.payable, country: data.value.shipping.country ?? "" }));
const kind = computed(() => data.value.payment.kind);
const summary = computed(() => checkoutSummary({ ...summaryInput(), ...(kind.value ? { paymentKind: kind.value } : {}), policy: props.paymentPolicy }));

const cardErrors = computed(() => validatePaymentForm(card.value, { required: t.value.cardRequired, invalidCard: t.value.invalidCard, invalidExpiry: t.value.invalidExpiry, invalidCvc: t.value.invalidCvc }));
const ctx = computed<CheckoutContext>(() => ({
  shippingMethodIds: props.shippingMethods.map((m) => m.id),
  signedIn: !!props.account,
  cardValid: Object.keys(cardErrors.value).length === 0,
  localReady: !!data.value.payment.localReference,
  paymentAvailable: Object.fromEntries(KIND_ORDER.map((k) => [k, availability.value[k].available])) as Partial<Record<CheckoutPaymentKind, boolean>>,
}));

const send = (event: Parameters<typeof checkoutReduce>[1]) => (state.value = checkoutReduce(state.value, event, ctx.value));
const update = (patch: Partial<CheckoutData>) => send({ type: "update", patch });

// Move focus to a section's heading when the open section changes, so keyboard and screen-reader users land in it.
const headings = ref<Partial<Record<CheckoutSection, HTMLElement | null>>>({});
watch(
  () => state.value.section,
  async (section) => {
    await nextTick();
    headings.value[section]?.focus();
  },
);

const problems = computed(() => state.value.errors);
const stepText = (i: number) => t.value.stepOf(n(i + 1), n(CHECKOUT_SECTIONS.length));
const now = () => props.now ?? new Date();

async function place() {
  const next = checkoutReduce(state.value, { type: "submit" }, ctx.value);
  state.value = next;
  if (next.status !== "submitting") return;
  const normalizedData: CheckoutData = { ...next.data, shipping: { ...next.data.shipping } };
  const draftOrder = buildOrder({ data: normalizedData, lines: active.value as CommerceCartLine[], summary: summary.value, ...(method.value ? { shippingMethod: method.value } : {}), number: "", now: now(), ...(props.account ? { customerName: props.account.name } : {}) });
  try {
    const result = await props.onPlaceOrder({ data: normalizedData, lines: active.value as CommerceCartLine[], summary: summary.value, shippingMethod: method.value, ...(next.data.payment.kind === "card" ? { card: card.value } : {}), order: draftOrder, attempt: next.attempts });
    if (result?.error) return send({ type: "failed", reason: result.error });
    const number = result?.orderNumber ?? result?.order?.number ?? `#${1000 + next.attempts}`;
    const order = result?.order ?? { ...draftOrder, number, id: `ord-${number.replace(/\D/g, "")}` };
    send({ type: "succeeded", orderNumber: number });
    placed.value = order;
    props.onPlaced?.(order);
  } catch (error) {
    send({ type: "failed", reason: error instanceof Error ? error.message : "" });
  }
}

const isDone = (s: CheckoutSection) => state.value.done.includes(s);
const isOpen = (s: CheckoutSection) => state.value.section === s;
const sectionState = (s: CheckoutSection) => (isOpen(s) ? "open" : isDone(s) ? "done" : "locked");
const reachable = (s: CheckoutSection) => isDone(s) || CHECKOUT_SECTIONS.indexOf(s) <= CHECKOUT_SECTIONS.findIndex((x) => !isDone(x));
const canPlace = computed(() => CHECKOUT_SECTIONS.every((s) => Object.keys(validateSection(s, data.value, ctx.value)).length === 0));

const sep = computed(() => (ar.value ? "، " : ", "));
const summaries = computed<Record<CheckoutSection, string>>(() => ({
  contact: data.value.contact.mode === "account" ? (props.account ? `${props.account.name} · ${props.account.email}` : t.value.signIn) : data.value.contact.email,
  address: storeAddressLines(data.value.shipping, sep.value).join(sep.value),
  delivery: method.value ? [method.value.label, storeShippingEta(method.value, now(), props.weekend, locale.value, t.value)].filter(Boolean).join(" · ") : "",
  payment: kind.value ? (kind.value === "card" ? t.value.card : kind.value === "cod" ? t.value.cod : kind.value === "local" ? t.value.local : t.value.wallet) : "",
}));
const fieldErrors = (prefix: string): AddressErrors =>
  Object.fromEntries(Object.entries(problems.value).filter(([k]) => k.startsWith(`${prefix}.`)).map(([k, v]) => [k.slice(prefix.length + 1), v])) as AddressErrors;

// contact
const emailError = computed(() => problems.value["contact.email"]);
function changeMode(mode: string | number) {
  update({ contact: { ...data.value.contact, mode: mode as "guest" | "account", email: mode === "account" && props.account ? props.account.email : data.value.contact.email } });
}

// address
const usingSaved = computed(() => !!data.value.savedAddressId && props.savedAddresses.some((a) => a.id === data.value.savedAddressId));
function pickSaved(next: string) {
  if (next === "__new") return update({ savedAddressId: undefined as unknown as string, shipping: { country: data.value.shipping.country ?? props.countries[0] ?? "EG" } });
  const found = props.savedAddresses.find((a) => a.id === next);
  if (found) update({ savedAddressId: found.id as string, shipping: { ...found } });
}

// delivery
const giftLeft = computed(() => GIFT_MESSAGE_MAX - data.value.gift.message.length);
const notesLeft = computed(() => NOTES_MAX - data.value.notes.length);
const methodError = computed(() => problems.value["delivery.method"]);
const isFree = (m: CommerceShippingMethod) => m.price === 0 || (m.freeOver !== undefined && base.value.subtotal - base.value.discount >= m.freeOver);

// payment
const kindText = computed<Record<CheckoutPaymentKind, { title: string; description: string }>>(() => ({
  card: { title: t.value.card, description: t.value.cardDescription },
  cod: { title: t.value.cod, description: t.value.codDescription(props.paymentPolicy.cod?.fee ? money(props.paymentPolicy.cod.fee, currency.value) : "") },
  local: { title: t.value.local, description: t.value.localDescription },
  wallet: { title: t.value.wallet, description: t.value.walletDescription(money(props.paymentPolicy.wallet?.balance ?? 0, currency.value)) },
}));
function why(k: CheckoutPaymentKind): string | undefined {
  const a = availability.value[k];
  if (a.available || !a.reason) return undefined;
  if (a.reason === "cod-limit") return t.value.unavailable["cod-limit"](money(a.amount ?? 0, currency.value));
  if (a.reason === "wallet-balance") return t.value.unavailable["wallet-balance"](money(a.amount ?? 0, currency.value));
  return t.value.unavailable[a.reason];
}
const offered = computed(() => KIND_ORDER.filter((k) => availability.value[k].reason !== "not-offered"));
const paymentError = computed(() => problems.value["payment.kind"]);
const codText = computed(() => t.value.codDescription(props.paymentPolicy.cod?.fee ? money(props.paymentPolicy.cod.fee, currency.value) : ""));
const walletText = computed(() => t.value.walletDescription(money(props.paymentPolicy.wallet?.balance ?? 0, currency.value)));
const localSubmission = computed(() => (data.value.payment.localReference ? { methodId: data.value.payment.localMethodId ?? "", reference: data.value.payment.localReference, status: "submitted" as const } : undefined));
async function submitLocal(input: LocalPaymentInput) {
  const result = await props.onLocalSubmit?.(input);
  if (result?.error) return result;
  update({ payment: { ...data.value.payment, kind: "local", localMethodId: input.methodId, localReference: input.reference } });
}
</script>

<template>
  <NqStoreOrderConfirmation
    v-if="placed && state.status === 'placed'"
    v-bind="$attrs"
    :order="placed"
    :currency="currency"
    :payment-kind="data.payment.kind ?? 'card'"
    :gift="data.gift.enabled"
    :on-track-order="props.onTrackOrder ? () => props.onTrackOrder?.(placed as CommerceOrder) : undefined"
    :on-continue-shopping="props.onContinueShopping"
    :now="props.now"
    :weekend="props.weekend"
    :labels="props.labels"
    :class="props.class"
  />

  <div v-else-if="active.length === 0" v-bind="$attrs" data-slot="store-checkout" :class="cn('mx-auto w-full max-w-2xl px-4 py-10', props.class)">
    <NqEmptyState :icon="ShoppingBag" :title="t.emptyTitle" :description="t.emptyDescription">
      <template v-if="props.onContinueShopping" #actions>
        <NqButton variant="primary" @click="props.onContinueShopping()">{{ t.emptyAction }}</NqButton>
      </template>
    </NqEmptyState>
  </div>

  <div v-else v-bind="$attrs" data-slot="store-checkout" :data-status="state.status" :class="cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6', props.class)">
    <div class="mb-6 flex flex-wrap items-center justify-between gap-2">
      <h1 class="text-h1 font-semibold tracking-tight text-foreground">{{ t.title }}</h1>
      <span class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
        <Lock aria-hidden="true" class="size-3.5" />
        {{ t.secure }}
      </span>
    </div>
    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-start">
      <NqStoreOrderSummary :lines="active" :currency="currency" :summary="summary" :shipping-method="method" :on-edit-cart="props.onEditCart" :labels="props.labels" class="lg:sticky lg:top-4 lg:order-2" />
      <form novalidate :aria-busy="busy || undefined" class="flex min-w-0 flex-col gap-4 lg:order-1" @submit.prevent="place()">
        <section
          v-for="(id, index) in CHECKOUT_SECTIONS"
          :key="id"
          data-slot="store-checkout-section"
          :data-section="id"
          :data-state="sectionState(id)"
          :aria-labelledby="`${idBase}-${id}`"
          :class="cn('rounded-card border bg-card', isOpen(id) ? 'border-nq-line-strong' : 'border-border')"
        >
          <div class="flex items-start gap-3 p-4">
            <span
              aria-hidden="true"
              :class="cn('mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-caption font-medium', isDone(id) ? 'bg-nq-success-soft text-nq-success-text' : isOpen(id) ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground')"
            >
              <Check v-if="isDone(id)" class="size-3.5" />
              <template v-else>{{ n(index + 1) }}</template>
            </span>
            <div class="flex min-w-0 flex-1 flex-col gap-0.5">
              <h2 :id="`${idBase}-${id}`" :ref="(el) => (headings[id] = el as HTMLElement | null)" tabindex="-1" class="text-h3 font-semibold text-foreground outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                {{ t.steps[id] }}
                <span class="sr-only"> {{ stepText(index) }}</span>
              </h2>
              <p v-if="!isOpen(id) && isDone(id) && summaries[id]" class="text-body-sm text-muted-foreground [overflow-wrap:anywhere]">{{ summaries[id] }}</p>
            </div>
            <NqButton v-if="!isOpen(id) && isDone(id) && !busy" variant="link" size="sm" :aria-label="`${t.edit}, ${t.steps[id]}`" @click="send({ type: 'open', section: id })">{{ t.edit }}</NqButton>
          </div>
          <div v-if="isOpen(id)" class="flex flex-col gap-4 px-4 pb-4 ps-[3.25rem] max-sm:ps-4">
            <!-- contact -->
            <NqTabs v-if="id === 'contact'" :model-value="data.contact.mode" @update:model-value="changeMode">
              <NqTabsList :aria-label="t.steps.contact">
                <NqTabsTab value="guest">{{ t.guest }}</NqTabsTab>
                <NqTabsTab value="account">{{ props.account ? t.accountTab : t.signIn }}</NqTabsTab>
              </NqTabsList>
              <NqTabsPanel value="guest" class="flex flex-col gap-4 pt-4">
                <NqField :invalid="!!emailError">
                  <NqFieldLabel>{{ t.email }}</NqFieldLabel>
                  <NqInput ltr type="email" name="email" autocomplete="email" inputmode="email" :model-value="data.contact.email" @update:model-value="update({ contact: { ...data.contact, email: String($event ?? '') } })" />
                  <NqFieldError v-if="emailError" match>{{ emailError === "required" ? t.problems.required : t.problems.email }}</NqFieldError>
                  <NqFieldDescription v-else>{{ t.emailHint }}</NqFieldDescription>
                </NqField>
                <label class="flex items-center gap-2 text-body-sm text-foreground">
                  <NqCheckbox :model-value="!!data.contact.marketing" @update:model-value="update({ contact: { ...data.contact, marketing: $event === true } })" />
                  {{ t.marketing }}
                </label>
                <p class="text-caption text-muted-foreground">{{ t.guestNote }}</p>
              </NqTabsPanel>
              <NqTabsPanel value="account" class="flex flex-col gap-3 pt-4">
                <p v-if="props.account" class="flex items-center gap-2 text-body-sm text-foreground">
                  <CheckCircle2 aria-hidden="true" class="size-4 text-nq-success-text" />
                  {{ t.signedInAs(props.account.name) }}
                  <bdi dir="ltr" class="text-muted-foreground">{{ props.account.email }}</bdi>
                </p>
                <template v-else>
                  <p class="text-body-sm text-muted-foreground">{{ t.signInNote }}</p>
                  <p v-if="problems['contact.account']" role="alert" class="text-caption text-nq-danger-text">{{ t.problems.signIn }}</p>
                  <div v-if="props.onSignIn"><NqButton variant="secondary" @click="props.onSignIn()">{{ t.signIn }}</NqButton></div>
                </template>
              </NqTabsPanel>
            </NqTabs>

            <!-- address -->
            <div v-else-if="id === 'address'" class="flex flex-col gap-4">
              <NqRadioGroup v-if="props.savedAddresses.length" :aria-label="t.savedAddresses" :model-value="usingSaved ? data.savedAddressId : '__new'" @update:model-value="pickSaved">
                <NqRadioCard v-for="a in props.savedAddresses" :key="a.id ?? a.line1" :value="a.id ?? a.line1">
                  <span class="flex items-center gap-2">
                    <MapPin aria-hidden="true" class="size-4 text-muted-foreground" />
                    {{ a.name }}
                  </span>
                  <template #description>
                    <span class="flex flex-col">
                      <span v-for="line in storeAddressLines(a, sep)" :key="line">{{ line }}</span>
                      <bdi v-if="a.phone" dir="ltr">{{ a.phone }}</bdi>
                    </span>
                  </template>
                  <template v-if="a.isDefault" #meta><NqBadge variant="neutral">{{ ar ? "الافتراضي" : "Default" }}</NqBadge></template>
                </NqRadioCard>
                <NqRadioCard value="__new" :title="t.newAddress" />
              </NqRadioGroup>
              <NqStoreAddressForm v-if="!usingSaved" name="shipping" :model-value="data.shipping" :errors="fieldErrors('shipping')" :countries="props.countries" :labels="props.labels" @update:model-value="update({ shipping: $event })" />
              <label class="flex items-center gap-2 text-body-sm text-foreground">
                <NqCheckbox :model-value="data.billingSame" @update:model-value="update({ billingSame: $event === true })" />
                {{ t.billingSame }}
              </label>
              <div v-if="!data.billingSame" class="flex flex-col gap-3">
                <h3 class="text-label text-foreground">{{ t.billingTitle }}</h3>
                <NqStoreAddressForm name="billing" hide-phone :model-value="data.billing" :errors="fieldErrors('billing')" :countries="props.countries" :labels="props.labels" @update:model-value="update({ billing: $event })" />
              </div>
            </div>

            <!-- delivery -->
            <div v-else-if="id === 'delivery'" class="flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <span class="text-label text-foreground">{{ t.shippingMethod }}</span>
                <NqRadioGroup :aria-label="t.shippingMethod" :model-value="data.shippingMethodId ?? ''" @update:model-value="update({ shippingMethodId: String($event) })">
                  <NqRadioCard v-for="m in props.shippingMethods" :key="m.id" :value="m.id" :description="storeShippingEta(m, now(), props.weekend, locale, t)">
                    <span class="flex items-center gap-2">
                      <Truck aria-hidden="true" class="size-4 text-muted-foreground" />
                      {{ m.label }}
                    </span>
                    <template #meta>
                      <span v-if="isFree(m)" class="text-label text-nq-success-text">{{ t.free }}</span>
                      <NqStoreAmount v-else :amount="m.price" :currency="currency" class="text-label" />
                    </template>
                  </NqRadioCard>
                </NqRadioGroup>
                <p v-if="methodError" role="alert" class="text-caption text-nq-danger-text">{{ methodError === "unavailable" ? t.methodProblems.unavailable : t.methodProblems.required }}</p>
              </div>
              <fieldset class="flex flex-col gap-3 rounded-control border border-border p-3">
                <legend class="px-1 text-label text-foreground">{{ t.giftTitle }}</legend>
                <label class="flex items-center gap-2 text-body-sm text-foreground">
                  <NqSwitch :model-value="data.gift.enabled" @update:model-value="update({ gift: { ...data.gift, enabled: $event } })" />
                  {{ t.giftToggle }}
                </label>
                <template v-if="data.gift.enabled">
                  <NqField :invalid="!!problems['gift.message']">
                    <NqFieldLabel>{{ t.giftMessage }}</NqFieldLabel>
                    <NqTextarea name="giftMessage" rows="3" :model-value="data.gift.message" @update:model-value="update({ gift: { ...data.gift, message: $event ?? '' } })" />
                    <NqFieldDescription>{{ t.giftMessageHint(n(Math.max(giftLeft, 0))) }}</NqFieldDescription>
                    <NqFieldError :match="!!problems['gift.message']">{{ t.problems.tooLong }}</NqFieldError>
                  </NqField>
                  <label v-if="props.giftWrapFee !== undefined" class="flex items-center gap-2 text-body-sm text-foreground">
                    <NqCheckbox :model-value="data.gift.wrap" @update:model-value="update({ gift: { ...data.gift, wrap: $event === true } })" />
                    {{ t.giftWrapFee(money(props.giftWrapFee, currency)) }}
                  </label>
                  <label class="flex items-center gap-2 text-body-sm text-foreground">
                    <NqCheckbox :model-value="data.gift.hidePrices" @update:model-value="update({ gift: { ...data.gift, hidePrices: $event === true } })" />
                    {{ t.hidePrices }}
                  </label>
                </template>
              </fieldset>
              <NqField :invalid="!!problems.notes">
                <NqFieldLabel>{{ t.notes }}</NqFieldLabel>
                <NqTextarea name="notes" rows="3" :placeholder="t.notesPlaceholder" :model-value="data.notes" @update:model-value="update({ notes: $event ?? '' })" />
                <NqFieldDescription>{{ t.notesHint(n(Math.max(notesLeft, 0))) }}</NqFieldDescription>
                <NqFieldError :match="!!problems.notes">{{ t.problems.tooLong }}</NqFieldError>
              </NqField>
            </div>

            <!-- payment -->
            <div v-else class="flex flex-col gap-4">
              <div class="flex flex-col gap-2">
                <span class="text-label text-foreground">{{ t.paymentMethod }}</span>
                <NqRadioGroup :aria-label="t.paymentMethod" :model-value="kind ?? ''" @update:model-value="update({ payment: { ...data.payment, kind: $event as CheckoutPaymentKind } })">
                  <NqRadioCard v-for="k in offered" :key="k" :value="k" :disabled="!availability[k].available" :title="kindText[k].title" :description="why(k) ?? kindText[k].description">
                    <template v-if="k === 'cod' && props.paymentPolicy.cod?.fee && availability.cod.available" #meta>
                      <NqStoreAmount :amount="props.paymentPolicy.cod.fee" :currency="currency" class="text-caption text-muted-foreground" />
                    </template>
                  </NqRadioCard>
                </NqRadioGroup>
                <p v-if="paymentError" role="alert" class="text-caption text-nq-danger-text">{{ paymentError === "unavailable" ? t.paymentProblems.unavailable : t.paymentProblems.required }}</p>
              </div>
              <div v-if="kind === 'card'" class="flex flex-col gap-2">
                <NqPaymentMethodForm v-model="card" :methods="['card']" :errors="problems['payment.card'] ? cardErrors : {}" />
                <p v-if="problems['payment.card']" role="alert" class="text-caption text-nq-danger-text">{{ t.paymentProblems.card }}</p>
              </div>
              <p v-if="kind === 'cod'" class="text-body-sm text-muted-foreground">{{ codText }}</p>
              <p v-if="kind === 'wallet'" class="text-body-sm text-muted-foreground">{{ walletText }}</p>
              <div v-if="kind === 'local'" class="flex flex-col gap-2">
                <NqLocalPayments
                  :amount="summary.payable"
                  :currency="currency"
                  :methods="props.localMethods"
                  :submission="localSubmission"
                  :default-method-id="data.payment.localMethodId"
                  :on-submit="submitLocal"
                />
                <p v-if="data.payment.localReference" role="status" class="text-body-sm text-nq-success-text">{{ t.localSent(data.payment.localReference) }}</p>
                <p v-if="problems['payment.local']" role="alert" class="text-caption text-nq-danger-text">{{ t.paymentProblems.local }}</p>
              </div>
            </div>

            <div v-if="id !== 'payment' && reachable(id)">
              <NqButton variant="primary" @click="send({ type: 'continue' })">{{ t.continue }}</NqButton>
            </div>
          </div>
        </section>

        <NqAlert v-if="state.status === 'failed'" tone="danger" :title="t.failedTitle">
          {{ state.failure || t.failedGeneric }}
          <template #action><NqButton size="sm" variant="secondary" @click="send({ type: 'dismiss' })">{{ t.dismiss }}</NqButton></template>
        </NqAlert>
        <div class="flex flex-col gap-2">
          <NqButton type="submit" variant="primary" size="lg" :loading="busy" class="w-full" data-slot="store-place-order">
            {{ busy ? t.placing : t.placeOrderTotal(money(summary.payable, currency)) }}
          </NqButton>
          <p v-if="!canPlace && !busy" class="text-caption text-muted-foreground">{{ t.incomplete }}</p>
          <p class="text-caption text-muted-foreground">{{ t.terms }}</p>
        </div>
      </form>
    </div>
  </div>
</template>
