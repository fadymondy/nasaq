<script setup lang="ts">
import { CircleX } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { isPromoCodeFormat, normalizePromoCode } from "./loyalty-logic";
import { dayOf, keyOf, type LoyaltyStrings } from "./strings";
import type { PromoCode, PromoCodeInput } from "./types";

// Internal: the new / edit promo code dialog.
const props = defineProps<{ promo: PromoCode | null; currency: string; busy: boolean; error: string | null; t: LoyaltyStrings }>();
const emit = defineEmits<{ cancel: []; submit: [input: PromoCodeInput] }>();

const promo = props.promo;
const code = ref(promo?.code ?? "");
const type = ref<"percent" | "fixed">(promo?.type ?? "percent");
const percent = ref(promo && promo.type === "percent" ? String(promo.value / 100) : "");
const fixed = ref<number | null>(promo && promo.type === "fixed" ? promo.value : null);
const maxDiscount = ref<number | null>(promo?.maxDiscount ?? null);
const minSubtotal = ref<number | null>(promo?.minSubtotal ?? null);
const startsOn = ref<string | null>(promo?.startsOn ?? null);
const endsOn = ref<string | null>(promo?.endsOn ?? null);
const maxUses = ref(promo?.maxRedemptions !== undefined ? String(promo.maxRedemptions) : "");
const perCustomer = ref(promo?.perCustomer !== undefined ? String(promo.perCustomer) : "");
const firstOrderOnly = ref(promo?.firstOrderOnly ?? false);
const active = ref(promo?.active ?? true);
const touched = ref(false);

const pct = computed(() => Number(percent.value.replace(",", ".")));
const codeBad = computed(() => !isPromoCodeFormat(code.value));
const valueBad = computed(() => (type.value === "percent" ? !(pct.value > 0 && pct.value <= 100) : !(fixed.value && fixed.value > 0)));
const datesBad = computed(() => Boolean(startsOn.value && endsOn.value && endsOn.value < startsOn.value));
const wholeOrBlank = (v: string) => v.trim() === "" || (Number.isInteger(Number(v)) && Number(v) > 0);
const limitsBad = computed(() => !wholeOrBlank(maxUses.value) || !wholeOrBlank(perCustomer.value));
const bad = computed(() => codeBad.value || valueBad.value || datesBad.value || limitsBad.value);

function submit() {
  touched.value = true;
  if (bad.value) return;
  emit("submit", {
    code: normalizePromoCode(code.value),
    type: type.value,
    value: type.value === "percent" ? Math.round(pct.value * 100) : (fixed.value ?? 0),
    maxDiscount: type.value === "percent" && maxDiscount.value ? maxDiscount.value : undefined,
    minSubtotal: minSubtotal.value || undefined,
    startsOn: startsOn.value ?? undefined,
    endsOn: endsOn.value ?? undefined,
    maxRedemptions: maxUses.value.trim() ? Number(maxUses.value) : undefined,
    perCustomer: perCustomer.value.trim() ? Number(perCustomer.value) : undefined,
    firstOrderOnly: firstOrderOnly.value,
    active: active.value,
  });
}
</script>

<template>
  <NqDialog open @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.promo ? props.t.editPromo : props.t.newPromo }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.codeHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && codeBad">
          <NqFieldLabel>{{ props.t.code }}</NqFieldLabel>
          <NqInput v-model="code" ltr class="uppercase" :disabled="props.busy" />
          <NqFieldError v-if="touched && codeBad" match>{{ props.t.problems.format }}</NqFieldError>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ props.t.type }}</NqFieldLabel>
            <NqSelect :model-value="type" :disabled="props.busy" @update:model-value="(v: string | number | null) => v && (type = v as 'percent' | 'fixed')">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem value="percent">{{ props.t.percent }}</NqSelectItem>
                <NqSelectItem value="fixed">{{ props.t.fixed }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField :invalid="touched && valueBad">
            <NqFieldLabel>{{ type === "percent" ? props.t.percentValue : props.t.value }}</NqFieldLabel>
            <NqInput v-if="type === 'percent'" v-model="percent" ltr inputmode="decimal" :disabled="props.busy" />
            <NqCurrencyInput v-else v-model="fixed" :currency="props.currency" :disabled="props.busy" :aria-label="props.t.value" />
          </NqField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField v-if="type === 'percent'">
            <NqFieldLabel>{{ props.t.maxDiscount }}</NqFieldLabel>
            <NqCurrencyInput v-model="maxDiscount" :currency="props.currency" :disabled="props.busy" :aria-label="props.t.maxDiscount" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.minSubtotal }}</NqFieldLabel>
            <NqCurrencyInput v-model="minSubtotal" :currency="props.currency" :disabled="props.busy" :aria-label="props.t.minSubtotal" />
          </NqField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField>
            <NqFieldLabel>{{ props.t.startsOn }}</NqFieldLabel>
            <NqDatePicker :aria-label="props.t.startsOn" :model-value="startsOn ? dayOf(startsOn) : null" :disabled="props.busy" @update:model-value="(d: Date | null) => (startsOn = d ? keyOf(d) : null)" />
          </NqField>
          <NqField :invalid="touched && datesBad">
            <NqFieldLabel>{{ props.t.endsOn }}</NqFieldLabel>
            <NqDatePicker :aria-label="props.t.endsOn" :model-value="endsOn ? dayOf(endsOn) : null" :disabled="props.busy" @update:model-value="(d: Date | null) => (endsOn = d ? keyOf(d) : null)" />
          </NqField>
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && !wholeOrBlank(maxUses)">
            <NqFieldLabel>{{ props.t.maxRedemptions }}</NqFieldLabel>
            <NqInput v-model="maxUses" ltr inputmode="numeric" :placeholder="props.t.unlimited" :disabled="props.busy" />
          </NqField>
          <NqField :invalid="touched && !wholeOrBlank(perCustomer)">
            <NqFieldLabel>{{ props.t.perCustomer }}</NqFieldLabel>
            <NqInput v-model="perCustomer" ltr inputmode="numeric" :placeholder="props.t.unlimited" :disabled="props.busy" />
          </NqField>
        </div>
        <div class="flex flex-wrap gap-x-6 gap-y-2">
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch v-model="firstOrderOnly" :disabled="props.busy" />
            {{ props.t.firstOrderOnly }}
          </label>
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch v-model="active" :disabled="props.busy" />
            {{ props.t.active }}
          </label>
        </div>
        <p v-if="props.error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4" />
          {{ props.error }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ props.t.save }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
