<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { countryRule, normalizePostalCode, STORE_COUNTRY_CODES, type AddressErrors, type StoreAddressField } from "./address-rules";
import type { CommerceAddress } from "./commerce";
import { useStoreCheckoutStrings, type StoreCheckoutLabels } from "./strings";

// A country-aware address form. The country decides which fields show and how they are named: an emirate list for the
// UAE, a required district and postal code for Saudi Arabia, no postal code in Qatar, state and ZIP in the US. Postal
// codes are tidied on blur ("sw1a1aa" becomes "SW1A 1AA"); the phone field stays left to right in Arabic.
interface Props {
  /** The address (`v-model`). */
  modelValue: Partial<CommerceAddress>;
  /** Problem codes from `validateStoreAddress`, keyed by field. */
  errors?: AddressErrors;
  /** Country codes on offer. Default: every country with rules. */
  countries?: readonly string[];
  /** A billing address has no phone. */
  hidePhone?: boolean;
  disabled?: boolean;
  /** Prefix for field `name`s, e.g. "shipping". */
  name?: string;
  labels?: StoreCheckoutLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { errors: () => ({}), countries: () => STORE_COUNTRY_CODES, hidePhone: false, disabled: undefined, name: "address", labels: undefined });
const emit = defineEmits<{ "update:modelValue": [value: Partial<CommerceAddress>] }>();

const { t, ar } = useStoreCheckoutStrings(() => props.labels);
const lang = computed(() => (ar.value ? "ar" : "en"));
const country = computed(() => (props.modelValue.country ?? props.countries[0] ?? "EG").toUpperCase());
const rule = computed(() => countryRule(country.value));
const set = (patch: Partial<CommerceAddress>) => emit("update:modelValue", { ...props.modelValue, ...patch });
const get = (field: keyof CommerceAddress) => (props.modelValue[field] as string | undefined) ?? "";
const regionLabel = computed(() => `${t.value.region[rule.value.regionKind]}${rule.value.regionRequired ? "" : ` ${t.value.optional}`}`);
const postalLabel = computed(() => `${t.value.postalCode}${rule.value.postalRequired ? "" : ` ${t.value.optional}`}`);
const phonePlaceholder = computed(() => `+${rule.value.dial} ${rule.value.phoneExample}`.trim());

function problem(field: StoreAddressField): string | undefined {
  const code = props.errors[field];
  if (!code) return undefined;
  const r = rule.value;
  if (code === "postalCode") return t.value.problems.postalCode(r.postalExample ?? "");
  if (code === "phone") return t.value.problems.phone(`+${r.dial} ${r.phoneExample}`.trim());
  if (code === "required" || code === "tooShort" || code === "tooLong" || code === "region") return t.value.problems[code];
  return t.value.problems.required;
}
const fid = (field: string) => `${props.name}.${field}`;
function changeCountry(next: string | number | null) {
  if (next) emit("update:modelValue", { ...props.modelValue, country: String(next), region: "", postalCode: "" });
}
function normalizePostal() {
  if (props.modelValue.postalCode) set({ postalCode: normalizePostalCode(country.value, props.modelValue.postalCode) });
}
</script>

<template>
  <div data-slot="store-address-form" :data-country="country" :class="cn('grid gap-4 sm:grid-cols-2', props.class)">
    <NqField class="sm:col-span-2">
      <NqFieldLabel>{{ t.country }}</NqFieldLabel>
      <NqSelect :model-value="country" :disabled="props.disabled" @update:model-value="changeCountry">
        <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="code in props.countries" :key="code" :value="code">{{ countryRule(code).name[lang] }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </NqField>

    <NqField :invalid="!!problem('name')" :class="cn(props.hidePhone && 'sm:col-span-2')">
      <NqFieldLabel>{{ t.fullName }}</NqFieldLabel>
      <NqInput :name="fid('name')" autocomplete="name" :model-value="get('name')" :disabled="props.disabled" @update:model-value="set({ name: String($event ?? '') })" />
      <NqFieldError :match="!!problem('name')">{{ problem("name") }}</NqFieldError>
    </NqField>
    <NqField v-if="!props.hidePhone" :invalid="!!problem('phone')">
      <NqFieldLabel>{{ t.phone }}</NqFieldLabel>
      <NqInput ltr type="tel" inputmode="tel" autocomplete="tel" :placeholder="phonePlaceholder" :name="fid('phone')" :model-value="get('phone')" :disabled="props.disabled" @update:model-value="set({ phone: String($event ?? '') })" />
      <NqFieldError :match="!!problem('phone')">{{ problem("phone") }}</NqFieldError>
    </NqField>
    <NqField :invalid="!!problem('line1')" class="sm:col-span-2">
      <NqFieldLabel>{{ t.line1 }}</NqFieldLabel>
      <NqInput autocomplete="address-line1" :name="fid('line1')" :model-value="get('line1')" :disabled="props.disabled" @update:model-value="set({ line1: String($event ?? '') })" />
      <NqFieldError :match="!!problem('line1')">{{ problem("line1") }}</NqFieldError>
    </NqField>
    <NqField :invalid="!!problem('line2')" class="sm:col-span-2">
      <NqFieldLabel>{{ t.line2 }}</NqFieldLabel>
      <NqInput autocomplete="address-line2" :name="fid('line2')" :model-value="get('line2')" :disabled="props.disabled" @update:model-value="set({ line2: String($event ?? '') })" />
      <NqFieldError :match="!!problem('line2')">{{ problem("line2") }}</NqFieldError>
    </NqField>
    <NqField :invalid="!!problem('city')">
      <NqFieldLabel>{{ t.city }}</NqFieldLabel>
      <NqInput autocomplete="address-level2" :name="fid('city')" :model-value="get('city')" :disabled="props.disabled" @update:model-value="set({ city: String($event ?? '') })" />
      <NqFieldError :match="!!problem('city')">{{ problem("city") }}</NqFieldError>
    </NqField>
    <template v-if="rule.regionKind !== 'none'">
      <NqField v-if="rule.regions" :invalid="!!problem('region')">
        <NqFieldLabel>{{ regionLabel }}</NqFieldLabel>
        <NqSelect :model-value="props.modelValue.region || null" :disabled="props.disabled" @update:model-value="set({ region: $event ? String($event) : '' })">
          <NqSelectTrigger><NqSelectValue :placeholder="t.choose" /></NqSelectTrigger>
          <NqSelectContent>
            <NqSelectItem v-for="r in rule.regions" :key="r.id" :value="r.id">{{ r[lang] }}</NqSelectItem>
          </NqSelectContent>
        </NqSelect>
        <NqFieldError :match="!!problem('region')">{{ problem("region") }}</NqFieldError>
      </NqField>
      <NqField v-else :invalid="!!problem('region')">
        <NqFieldLabel>{{ regionLabel }}</NqFieldLabel>
        <NqInput autocomplete="address-level1" :name="fid('region')" :model-value="get('region')" :disabled="props.disabled" @update:model-value="set({ region: String($event ?? '') })" />
        <NqFieldError :match="!!problem('region')">{{ problem("region") }}</NqFieldError>
      </NqField>
    </template>
    <NqField v-if="!rule.noPostal" :invalid="!!problem('postalCode')">
      <NqFieldLabel>{{ postalLabel }}</NqFieldLabel>
      <NqInput ltr autocomplete="postal-code" :placeholder="rule.postalExample" :name="fid('postalCode')" :model-value="get('postalCode')" :disabled="props.disabled" @update:model-value="set({ postalCode: String($event ?? '') })" @blur="normalizePostal" />
      <NqFieldError :match="!!problem('postalCode')">{{ problem("postalCode") }}</NqFieldError>
    </NqField>
  </div>
</template>
