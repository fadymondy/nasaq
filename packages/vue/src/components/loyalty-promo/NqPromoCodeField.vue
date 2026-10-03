<script setup lang="ts">
import { Tag, X } from "lucide-vue-next";
import { ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { evaluatePromo, isPromoCodeFormat, normalizePromoCode, type PromoContext, type PromoLike, type PromoProblem } from "./loyalty-logic";
import NqLoyaltyMoney from "./NqLoyaltyMoney.vue";
import { failMessage, useLoyaltyStrings, type LoyaltyPromoLabels, type LoyaltyResult } from "./strings";
import type { PromoApplied } from "./types";

// A promo-code box for checkout. Typing is upper-cased; Apply checks the format, then either your `onApply` (server) or the
// `promos` you pass in (local rules). A success shows the code with the saving and a remove button; a failure says why.
interface Props {
  /** The code currently applied. */
  applied?: PromoApplied | null;
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /**
   * Checks a code with your server. Resolve `{ error }` (or reject) to show it under the field; on success update `applied`.
   * Skip it to let `promos` and `context` decide locally.
   */
  onApply?: (code: string) => Promise<LoyaltyResult>;
  onRemove?: () => void;
  /** Local rules: the known codes and the order to check them against. The code is also checked for format. */
  promos?: readonly PromoLike[];
  context?: PromoContext;
  /** Called with a valid local result. Needed with `promos`. */
  onApplied?: (applied: PromoApplied) => void;
  disabled?: boolean;
  labels?: LoyaltyPromoLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  applied: undefined,
  currency: undefined,
  onApply: undefined,
  onRemove: undefined,
  promos: undefined,
  context: undefined,
  onApplied: undefined,
  disabled: false,
  labels: undefined,
});
const currency = useCurrency(() => props.currency);
const { t } = useLoyaltyStrings(() => props.labels);
const value = ref("");
const busy = ref(false);
const error = ref<string | null>(null);

async function apply() {
  if (busy.value) return;
  const code = normalizePromoCode(value.value);
  if (!code) return void (error.value = t.value.problems.empty);
  if (!isPromoCodeFormat(code)) return void (error.value = t.value.problems.format);
  busy.value = true;
  error.value = null;
  try {
    if (props.onApply) {
      const result = await props.onApply(code);
      if (result?.error) error.value = result.error;
      else value.value = "";
    } else {
      const promo = props.promos?.find((p) => normalizePromoCode(p.code) === code);
      if (!promo || !props.context) return void (error.value = t.value.problems.unknown);
      const result = evaluatePromo(promo, props.context);
      if (!result.valid) return void (error.value = t.value.problems[result.problem as PromoProblem]);
      props.onApplied?.({ code, discount: result.discount });
      value.value = "";
    }
  } catch (e) {
    error.value = failMessage(e, t.value.failed);
  } finally {
    busy.value = false;
  }
}
const onInput = (v: string | number) => {
  value.value = String(v);
  error.value = null;
};
</script>

<template>
  <div
    v-if="props.applied"
    data-slot="promo-code-field"
    data-state="applied"
    :class="cn('flex items-center justify-between gap-3 rounded-card border border-nq-success/40 bg-nq-success-soft px-3 py-2', props.class)"
  >
    <div class="flex min-w-0 flex-col">
      <span class="flex items-center gap-1.5 text-body-sm font-medium text-nq-success-text">
        <Tag aria-hidden="true" class="size-4" />
        <bdi dir="ltr" class="font-mono">{{ props.applied.code }}</bdi>
      </span>
      <span class="text-caption text-muted-foreground">{{ t.saves("") }}<NqLoyaltyMoney :minor="props.applied.discount" :currency="currency" /></span>
    </div>
    <NqButton v-if="props.onRemove" size="icon-sm" variant="ghost" :aria-label="t.remove" @click="props.onRemove()">
      <X aria-hidden="true" />
    </NqButton>
  </div>
  <form v-else data-slot="promo-code-field" novalidate :class="cn('flex flex-col gap-1.5', props.class)" @submit.prevent="apply">
    <NqField :invalid="Boolean(error)">
      <NqFieldLabel>{{ t.promoCode }}</NqFieldLabel>
      <div class="flex gap-2">
        <NqInput ltr class="flex-1 uppercase" name="promo" autocomplete="off" :placeholder="t.promoPlaceholder" :model-value="value" :disabled="props.disabled || busy" @update:model-value="(v) => onInput(v ?? '')" />
        <NqButton type="submit" variant="secondary" :loading="busy" :disabled="props.disabled || !value.trim()">{{ t.apply }}</NqButton>
      </div>
      <NqFieldError v-if="error" match>{{ error }}</NqFieldError>
    </NqField>
  </form>
</template>
