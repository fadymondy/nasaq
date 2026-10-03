<script setup lang="ts">
import { CircleCheck } from "lucide-vue-next";
import { computed, getCurrentInstance, nextTick, reactive, ref, useId, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqCheckbox } from "../checkbox";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqNum, useFormatNumber } from "../numeric";
import { NqPlanCard, NqPlanGrid } from "../plan-card";
import { NqPrice } from "../price";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqStepper, NqStepperItem } from "../stepper";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { detectBrand, lastFour } from "./card-format";
import {
  BRAND_NAME,
  DEFAULT_COUNTRIES,
  EMAIL,
  EMPTY_BILLING,
  STEP_ORDER,
  planTotal,
  round2,
  emptyPaymentForm,
  useCheckoutStrings,
  validatePaymentForm,
  type CheckoutBilling,
  type CheckoutCountry,
  type CheckoutInterval,
  type CheckoutLabels,
  type CheckoutOrder,
  type CheckoutPaymentSummary,
  type CheckoutPlan,
  type CheckoutResult,
  type CheckoutStep,
  type PaymentFormErrors,
  type PaymentFormValue,
  type PaymentMethodKind,
} from "./checkout";
import NqPaymentMethodForm from "./NqPaymentMethodForm.vue";

// Subscription checkout in five steps: plan, billing details, payment method, review, success. The steps are a
// Stepper; earlier steps can be revisited. It is presentational: `onComplete` gets the order and the caller
// charges it. Amounts use Intl with `currency` and stay left-to-right inside Arabic text.
interface Props {
  plans: readonly CheckoutPlan[];
  /** ISO 4217 code for every amount. Default USD, or SAR in Arabic. */
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
  /** The step to start on. Default "plan". */
  defaultStep?: Exclude<CheckoutStep, "success">;
  /**
   * Confirms the order. Resolve to finish (optionally with a `reference`); resolve `{ error }` or reject to stay on
   * the review step and show the message. Only `last4`, brand and holder of the card are passed, never the number.
   */
  onComplete: (order: CheckoutOrder) => Promise<void | CheckoutResult>;
  labels?: CheckoutLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  taxRate: 0,
  taxLabel: undefined,
  defaultPlanId: undefined,
  defaultInterval: "month",
  defaultBilling: undefined,
  countries: undefined,
  paymentMethods: () => ["card", "bank"] as const,
  defaultStep: "plan",
  labels: undefined,
});
const emit = defineEmits<{ "step-change": [step: CheckoutStep]; done: [] }>();
// The success button shows only when the page listens for @done, like React's optional onDone.
const instance = getCurrentInstance();
const hasDone = computed(() => typeof instance?.vnode.props?.onDone !== "undefined");

const currency = useCurrency(() => props.currency);
const { t, ar } = useCheckoutStrings(() => props.labels);
const fmt = useFormatNumber();
const money = (value: number) => fmt(value, { style: "currency", currency: currency.value });
const headingRef = ref<HTMLElement | null>(null);
const termsId = `nq-terms-${useId()}`;

const step = ref<CheckoutStep>(props.defaultStep);
const planId = ref(props.defaultPlanId ?? props.plans.find((p) => p.highlighted)?.id ?? props.plans[0]?.id ?? "");
const interval = ref<CheckoutInterval>(props.defaultInterval);
const billing = reactive<CheckoutBilling>({ ...EMPTY_BILLING, ...props.defaultBilling });
const billingErrors = ref<Partial<Record<keyof CheckoutBilling, string>>>({});
const payment = ref<PaymentFormValue>({ ...emptyPaymentForm, method: props.paymentMethods[0] ?? "card" });
const paymentErrors = ref<PaymentFormErrors>({});
const accepted = ref(false);
const termsError = ref(false);
const busy = ref(false);
const error = ref<string | null>(null);
const reference = ref<string | undefined>();

const plan = computed(() => props.plans.find((p) => p.id === planId.value) ?? props.plans[0]);
const index = computed(() => STEP_ORDER.indexOf(step.value));
const countryList = computed(() => props.countries ?? DEFAULT_COUNTRIES[ar.value ? "ar" : "en"]);
const subtotal = computed(() => (plan.value ? planTotal(plan.value, interval.value) : 0));
const tax = computed(() => round2(subtotal.value * props.taxRate));
const total = computed(() => round2(subtotal.value + tax.value));
const yearlySaving = computed(() => {
  const p = plan.value;
  return p && p.yearlyPrice !== undefined ? 1 - p.yearlyPrice / (p.monthlyPrice * 12) : 0;
});
const countryLabel = computed(() => countryList.value.find((c) => c.value === billing.country)?.label ?? billing.country);
const brand = computed(() => detectBrand(payment.value.number));
const brandName = computed(() => BRAND_NAME[brand.value][ar.value ? "ar" : "en"]);
const paymentSummary = computed<CheckoutPaymentSummary>(() =>
  payment.value.method === "card"
    ? { method: "card", brand: brand.value, last4: lastFour(payment.value.number), holder: payment.value.holder.trim(), expiry: payment.value.expiry }
    : { method: "bank" },
);
const paymentLine = computed(() => (payment.value.method === "card" ? t.value.cardEnding(brandName.value, `⁦${lastFour(payment.value.number)}⁩`) : t.value.bankTransfer));

const titles = computed<Record<CheckoutStep, string>>(() => ({ plan: t.value.plan, billing: t.value.billing, payment: t.value.payment, review: t.value.review, success: t.value.success }));
const headings = computed<Record<CheckoutStep, string>>(() => ({
  plan: t.value.planTitle,
  billing: t.value.billingTitle,
  payment: t.value.paymentTitle,
  review: t.value.reviewTitle,
  success: t.value.successTitle,
}));
const descriptions = computed<Partial<Record<CheckoutStep, string>>>(() => ({
  plan: t.value.planDescription,
  billing: t.value.billingDescription,
  payment: t.value.paymentDescription,
  review: t.value.reviewDescription,
}));

const setStep = (next: CheckoutStep) => {
  step.value = next;
  emit("step-change", next);
};

// Move focus to the new step's heading so keyboard and screen reader users land on the content.
watch(step, async () => {
  await nextTick();
  headingRef.value?.focus();
});

const setField = (key: keyof CheckoutBilling, value: string | number | undefined | null) => {
  billing[key] = String(value ?? "");
  if (billingErrors.value[key]) billingErrors.value = { ...billingErrors.value, [key]: undefined };
};

const validateBilling = () => {
  const errors: Partial<Record<keyof CheckoutBilling, string>> = {};
  for (const key of ["name", "country", "address", "city"] as const) if (!billing[key].trim()) errors[key] = t.value.required;
  if (!billing.email.trim()) errors.email = t.value.required;
  else if (!EMAIL.test(billing.email.trim())) errors.email = t.value.invalidEmail;
  billingErrors.value = errors;
  return Object.keys(errors).length === 0;
};

const next = () => {
  if (step.value === "billing" && !validateBilling()) return;
  if (step.value === "payment") {
    const errors = validatePaymentForm(payment.value, t.value);
    paymentErrors.value = errors;
    if (Object.keys(errors).length) return;
  }
  setStep(STEP_ORDER[index.value + 1] ?? "success");
};
const back = () => setStep(STEP_ORDER[Math.max(0, index.value - 1)] ?? "plan");

const pay = async () => {
  if (busy.value || !plan.value) return;
  if (!accepted.value) {
    termsError.value = true;
    return;
  }
  busy.value = true;
  error.value = null;
  try {
    const result = await props.onComplete({
      planId: plan.value.id,
      interval: interval.value,
      billing: { ...billing },
      payment: paymentSummary.value,
      currency: currency.value,
      subtotal: subtotal.value,
      tax: tax.value,
      total: total.value,
    });
    if (result?.error) {
      error.value = result.error;
      return;
    }
    reference.value = result?.reference;
    setStep("success");
  } catch (e) {
    error.value = e instanceof Error && e.message ? e.message : t.value.failed;
  } finally {
    busy.value = false;
  }
};

const onTerms = (checked: boolean) => {
  accepted.value = checked;
  if (checked) termsError.value = false;
};
const onPayment = (v: PaymentFormValue) => {
  payment.value = v;
  paymentErrors.value = {};
};
const onInterval = (v: string[]) => {
  if (v[0]) interval.value = v[0] as CheckoutInterval;
};
const billingFields = computed(
  () =>
    [
      ["name", t.value.name, { autocomplete: "name" }, false],
      ["email", t.value.email, { autocomplete: "email", type: "email", inputmode: "email" }, true],
      ["company", t.value.company, { autocomplete: "organization" }, false],
      ["taxId", t.value.taxId, {}, true],
    ] as const,
);
</script>

<template>
  <div v-if="plan" data-slot="checkout-steps" :data-step="step" :class="cn('@container flex flex-col gap-6', props.class)">
    <nav :aria-label="t.steps" class="flex flex-col gap-2">
      <NqStepper :current="step === 'success' ? STEP_ORDER.length : index">
        <NqStepperItem v-for="(id, i) in STEP_ORDER" :key="id" v-bind="step !== 'success' && i < index && !busy ? { onClick: () => setStep(id) } : {}">
          <template #title><span class="max-sm:sr-only">{{ titles[id] }}</span></template>
        </NqStepperItem>
      </NqStepper>
      <p v-if="step !== 'success'" class="text-caption text-muted-foreground sm:hidden">
        {{ t.stepOf(fmt(index + 1), fmt(STEP_ORDER.length - 1)) }} · {{ titles[step] }}
      </p>
    </nav>

    <section
      v-if="step === 'success'"
      aria-live="polite"
      class="mx-auto flex w-full max-w-lg flex-col items-center gap-4 rounded-card bg-nq-surface px-6 py-12 text-center"
    >
      <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
        <CircleCheck aria-hidden="true" class="size-6" />
      </span>
      <h2 ref="headingRef" tabindex="-1" class="text-h2 text-foreground outline-none">{{ headings.success }}</h2>
      <p class="text-body text-muted-foreground">{{ t.successDescription(plan.name) }}</p>
      <p v-if="reference" class="text-body-sm text-muted-foreground">
        {{ t.reference }}: <bdi dir="ltr" class="font-mono text-foreground">{{ reference }}</bdi>
      </p>
      <p class="text-body-sm text-foreground">
        <NqNum :value="total" :format="{ style: 'currency', currency }" /> · {{ interval === "year" ? t.perYear : t.perMonth }}
      </p>
      <NqButton v-if="hasDone" variant="primary" @click="emit('done')">{{ t.done }}</NqButton>
    </section>

    <div v-else class="grid gap-6 @3xl:grid-cols-[minmax(0,1fr)_20rem]">
      <section class="flex min-w-0 flex-col gap-5" :aria-labelledby="`${termsId}-h`">
        <header class="flex flex-col gap-1">
          <h2 :id="`${termsId}-h`" ref="headingRef" tabindex="-1" class="text-h2 text-foreground outline-none">{{ headings[step] }}</h2>
          <p v-if="descriptions[step]" class="text-body-sm text-muted-foreground">{{ descriptions[step] }}</p>
        </header>

        <template v-if="step === 'plan'">
          <NqToggleGroup :aria-label="t.interval" :model-value="[interval]" @update:model-value="onInterval">
            <NqToggle value="month">{{ t.monthly }}</NqToggle>
            <NqToggle value="year">
              {{ t.yearly }}
              <NqBadge v-if="yearlySaving > 0.005" variant="success" class="ms-1">
                {{ t.save(fmt(yearlySaving, { style: "percent", maximumFractionDigits: 0 })) }}
              </NqBadge>
            </NqToggle>
          </NqToggleGroup>
          <NqPlanGrid>
            <NqPlanCard
              v-for="p in props.plans"
              :key="p.id"
              :name="p.name"
              :description="p.description"
              :highlighted="p.highlighted"
              :badge="p.badge"
              :price-note="interval === 'year' && p.yearlyPrice !== undefined ? t.billedYearly(money(p.yearlyPrice)) : t.billedMonthly"
              :features="p.features ? [...p.features] : undefined"
            >
              <template #price>
                <NqPrice
                  :amount="interval === 'year' && p.yearlyPrice !== undefined ? round2(p.yearlyPrice / 12) : p.monthlyPrice"
                  :currency="currency"
                  period="month"
                  size="lg"
                  :fraction-digits="2"
                />
              </template>
              <template #action>
                <NqButton :variant="p.id === planId ? 'primary' : 'secondary'" :aria-pressed="p.id === planId" @click="planId = p.id">
                  {{ p.id === planId ? t.selected : t.choose }}
                </NqButton>
              </template>
            </NqPlanCard>
          </NqPlanGrid>
        </template>

        <form v-if="step === 'billing'" novalidate class="grid gap-x-4 gap-y-5 sm:grid-cols-2" @submit.prevent="next">
          <NqField v-for="[key, label, inputProps, ltr] in billingFields" :key="key" :invalid="Boolean(billingErrors[key])">
            <NqFieldLabel>{{ label }}</NqFieldLabel>
            <NqInput :ltr="ltr" :name="key" :model-value="billing[key]" v-bind="inputProps" @update:model-value="(v) => setField(key, v)" />
            <NqFieldError v-if="billingErrors[key]" match>{{ billingErrors[key] }}</NqFieldError>
          </NqField>
          <NqField class="sm:col-span-2" :invalid="Boolean(billingErrors.country)">
            <NqFieldLabel>{{ t.country }}</NqFieldLabel>
            <NqSelect :model-value="billing.country" @update:model-value="(v) => v && setField('country', v)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="c in countryList" :key="c.value" :value="c.value">{{ c.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField class="sm:col-span-2" :invalid="Boolean(billingErrors.address)">
            <NqFieldLabel>{{ t.address }}</NqFieldLabel>
            <NqInput name="address" autocomplete="street-address" :model-value="billing.address" @update:model-value="(v) => setField('address', v)" />
            <NqFieldError v-if="billingErrors.address" match>{{ billingErrors.address }}</NqFieldError>
          </NqField>
          <NqField :invalid="Boolean(billingErrors.city)">
            <NqFieldLabel>{{ t.city }}</NqFieldLabel>
            <NqInput name="city" autocomplete="address-level2" :model-value="billing.city" @update:model-value="(v) => setField('city', v)" />
            <NqFieldError v-if="billingErrors.city" match>{{ billingErrors.city }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.postalCode }}</NqFieldLabel>
            <NqInput ltr name="postalCode" autocomplete="postal-code" :model-value="billing.postalCode" @update:model-value="(v) => setField('postalCode', v)" />
          </NqField>
          <button type="submit" hidden />
        </form>

        <NqPaymentMethodForm
          v-if="step === 'payment'"
          :model-value="payment"
          :errors="paymentErrors"
          :methods="props.paymentMethods"
          :labels="props.labels"
          @update:model-value="onPayment"
        >
          <template v-if="$slots.bankDetails" #bankDetails><slot name="bankDetails" /></template>
        </NqPaymentMethodForm>

        <div v-if="step === 'review'" class="flex flex-col gap-4">
          <NqCard class="gap-3">
            <NqCardHeader>
              <NqCardTitle as="h3">{{ t.plan }}</NqCardTitle>
              <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <NqButton size="sm" variant="ghost" :disabled="busy" @click="setStep('plan')">{{ t.edit }}</NqButton>
              </div>
            </NqCardHeader>
            <NqCardContent class="text-body-sm text-foreground">
              <div class="flex items-center justify-between gap-3">
                <span>{{ plan.name }} · {{ interval === "year" ? t.yearly : t.monthly }}</span>
                <NqNum :value="subtotal" :format="{ style: 'currency', currency }" />
              </div>
            </NqCardContent>
          </NqCard>
          <NqCard class="gap-3">
            <NqCardHeader>
              <NqCardTitle as="h3">{{ t.billing }}</NqCardTitle>
              <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <NqButton size="sm" variant="ghost" :disabled="busy" @click="setStep('billing')">{{ t.edit }}</NqButton>
              </div>
            </NqCardHeader>
            <NqCardContent class="text-body-sm text-foreground">
              <address class="flex flex-col not-italic">
                <span>{{ billing.name }}</span>
                <span v-if="billing.company">{{ billing.company }}</span>
                <bdi dir="ltr" class="text-start text-muted-foreground">{{ billing.email }}</bdi>
                <span class="text-muted-foreground">{{ [billing.address, billing.city, billing.postalCode, countryLabel].filter(Boolean).join(ar ? "، " : ", ") }}</span>
                <bdi v-if="billing.taxId" dir="ltr" class="text-start text-muted-foreground">{{ billing.taxId }}</bdi>
              </address>
            </NqCardContent>
          </NqCard>
          <NqCard class="gap-3">
            <NqCardHeader>
              <NqCardTitle as="h3">{{ t.payment }}</NqCardTitle>
              <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
                <NqButton size="sm" variant="ghost" :disabled="busy" @click="setStep('payment')">{{ t.edit }}</NqButton>
              </div>
            </NqCardHeader>
            <NqCardContent class="text-body-sm text-foreground"><span>{{ paymentLine }}</span></NqCardContent>
          </NqCard>
          <NqField :invalid="termsError">
            <label :for="termsId" class="flex items-start gap-2 text-body-sm text-foreground">
              <NqCheckbox :id="termsId" class="mt-0.5" :model-value="accepted" @update:model-value="onTerms" />
              <span>{{ t.terms }}</span>
            </label>
            <NqFieldError v-if="termsError" match>{{ t.termsRequired }}</NqFieldError>
          </NqField>
          <p v-if="error" role="alert" class="rounded-control border border-nq-danger/40 bg-nq-danger-soft px-3 py-2 text-body-sm text-nq-danger-text">{{ error }}</p>
          <span role="status" class="sr-only">{{ busy ? t.paying : "" }}</span>
        </div>

        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <NqButton v-if="index > 0" variant="ghost" :disabled="busy" @click="back">{{ t.back }}</NqButton>
          <span v-else />
          <NqButton v-if="step === 'review'" variant="primary" size="lg" :loading="busy" @click="pay">{{ t.pay(money(total)) }}</NqButton>
          <NqButton v-else variant="primary" @click="next">{{ t.continue }}</NqButton>
        </div>
      </section>

      <aside :aria-label="t.summary">
        <NqCard data-slot="checkout-summary" class="h-fit gap-3">
          <NqCardHeader>
            <NqCardTitle as="h2">{{ t.summary }}</NqCardTitle>
          </NqCardHeader>
          <NqCardContent class="flex flex-col gap-3">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-label text-foreground">{{ plan.name }}</p>
                <p class="text-caption text-muted-foreground">{{ interval === "year" ? t.yearly : t.monthly }}</p>
              </div>
              <NqNum :value="subtotal" :format="{ style: 'currency', currency }" class="text-label text-foreground" />
            </div>
            <dl class="flex flex-col gap-2 border-t border-border pt-3 text-body-sm">
              <div v-if="tax > 0" class="flex justify-between gap-3">
                <dt class="text-muted-foreground">{{ props.taxLabel ?? t.tax }}</dt>
                <dd><NqNum :value="tax" :format="{ style: 'currency', currency }" /></dd>
              </div>
              <div class="flex justify-between gap-3 text-label text-foreground">
                <dt>{{ t.total }}</dt>
                <dd><NqNum :value="total" :format="{ style: 'currency', currency }" /></dd>
              </div>
            </dl>
          </NqCardContent>
        </NqCard>
      </aside>
    </div>
  </div>
</template>
