<script setup lang="ts">
import { Landmark, Lock } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqBadge } from "../badge";
import { NqFieldError, NqField, NqFieldLabel, NqInput } from "../field";
import { NqRadioCard, NqRadioGroup } from "../radio-group";
import { cardDigits, detectBrand, formatCardNumber, formatExpiry } from "./card-format";
import {
  BRAND_NAME,
  useCheckoutStrings,
  type CheckoutLabels,
  type PaymentFormErrors,
  type PaymentFormValue,
  type PaymentMethodKind,
} from "./checkout";

// Payment method picker plus card fields. Presentational: it formats what is typed (grouped number, MM/YY),
// names the brand in text, and reports the value. It never sends or stores the card.
interface Props {
  /** The form value (`v-model`). */
  modelValue: PaymentFormValue;
  /** Field errors, usually from `validatePaymentForm`. */
  errors?: PaymentFormErrors;
  /** Which methods to offer. Default both. */
  methods?: readonly PaymentMethodKind[];
  disabled?: boolean;
  labels?: CheckoutLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { errors: () => ({}), methods: () => ["card", "bank"] as const, disabled: undefined, labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: PaymentFormValue] }>();

const { t, ar } = useCheckoutStrings(() => props.labels);
const brand = computed(() => detectBrand(props.modelValue.number));
const set = (patch: Partial<PaymentFormValue>) => emit("update:modelValue", { ...props.modelValue, ...patch });
// Writes the formatted text back so a rejected character (a letter) does not linger in the box.
const typed = (e: Event, format: (raw: string) => string = (raw) => raw) => {
  const el = e.target as HTMLInputElement;
  const next = format(el.value);
  if (el.value !== next) el.value = next;
  return next;
};
</script>

<template>
  <div data-slot="payment-method-form" :class="cn('flex flex-col gap-5', props.class)">
    <NqRadioGroup
      v-if="props.methods.length > 1"
      :aria-label="t.method"
      :model-value="props.modelValue.method"
      :disabled="props.disabled"
      @update:model-value="(next: string) => set({ method: next as PaymentMethodKind })"
    >
      <NqRadioCard v-if="props.methods.includes('card')" value="card" :title="t.card" :description="t.cardDescription" />
      <NqRadioCard v-if="props.methods.includes('bank')" value="bank" :title="t.bankTransfer" :description="t.bankDescription" />
    </NqRadioGroup>

    <div v-if="props.modelValue.method === 'card'" class="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      <NqField class="sm:col-span-2" :invalid="Boolean(props.errors.number)">
        <NqFieldLabel>{{ t.cardNumber }}</NqFieldLabel>
        <div class="relative">
          <NqInput
            ltr
            name="cc-number"
            inputmode="numeric"
            autocomplete="cc-number"
            placeholder="1234 5678 9012 3456"
            :model-value="props.modelValue.number"
            :disabled="props.disabled"
            class="pe-28"
            @input="(e: Event) => set({ number: typed(e, formatCardNumber) })"
          />
          <NqBadge
            v-if="brand !== 'unknown'"
            variant="outline"
            data-slot="payment-brand"
            class="pointer-events-none absolute end-2 top-1/2 -translate-y-1/2"
          >
            {{ BRAND_NAME[brand][ar ? "ar" : "en"] }}
          </NqBadge>
        </div>
        <NqFieldError v-if="props.errors.number" match>{{ props.errors.number }}</NqFieldError>
      </NqField>
      <NqField class="sm:col-span-2" :invalid="Boolean(props.errors.holder)">
        <NqFieldLabel>{{ t.cardHolder }}</NqFieldLabel>
        <NqInput name="cc-name" autocomplete="cc-name" :model-value="props.modelValue.holder" :disabled="props.disabled" @input="(e: Event) => set({ holder: typed(e) })" />
        <NqFieldError v-if="props.errors.holder" match>{{ props.errors.holder }}</NqFieldError>
      </NqField>
      <NqField :invalid="Boolean(props.errors.expiry)">
        <NqFieldLabel>{{ t.expiry }}</NqFieldLabel>
        <NqInput
          ltr
          name="cc-exp"
          inputmode="numeric"
          autocomplete="cc-exp"
          placeholder="MM/YY"
          :maxlength="5"
          :model-value="props.modelValue.expiry"
          :disabled="props.disabled"
          @input="(e: Event) => set({ expiry: typed(e, formatExpiry) })"
        />
        <NqFieldError v-if="props.errors.expiry" match>{{ props.errors.expiry }}</NqFieldError>
      </NqField>
      <NqField :invalid="Boolean(props.errors.cvc)">
        <NqFieldLabel>{{ t.cvc }}</NqFieldLabel>
        <NqInput
          ltr
          name="cc-csc"
          inputmode="numeric"
          autocomplete="cc-csc"
          :placeholder="brand === 'amex' ? '1234' : '123'"
          :maxlength="4"
          :model-value="props.modelValue.cvc"
          :disabled="props.disabled"
          @input="(e: Event) => set({ cvc: typed(e, (raw) => cardDigits(raw).slice(0, 4)) })"
        />
        <NqFieldError v-if="props.errors.cvc" match>{{ props.errors.cvc }}</NqFieldError>
      </NqField>
      <p class="flex items-start gap-2 text-caption text-muted-foreground sm:col-span-2">
        <Lock aria-hidden="true" class="mt-0.5 size-3.5 shrink-0" />
        {{ t.secure }}
      </p>
    </div>
    <div v-else class="flex flex-col gap-3 rounded-card bg-nq-surface p-4">
      <p class="flex items-start gap-2 text-body-sm text-foreground">
        <Landmark aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        {{ t.bankNote }}
      </p>
      <slot name="bankDetails" />
    </div>
  </div>
</template>
