<script setup lang="ts">
import { CircleX } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel } from "../field";
import { checkRate, type RateProblem } from "./rates-logic";
import { dayOf, keyOf, todayKey, type RatesStrings } from "./strings";
import type { Rate } from "./subscriptions";

// Internal: the Add a rate dialog.
const props = defineProps<{ existing: readonly Rate[]; currency: string; busy: boolean; error: string | null; t: RatesStrings }>();
const emit = defineEmits<{ cancel: []; submit: [input: { amount: number; from: string }] }>();

const amount = ref<number | null>(null);
const from = ref<string | null>(todayKey());
const touched = ref(false);
const problem = computed<RateProblem>(() => checkRate({ amount: amount.value ?? 0, from: from.value ?? "" }, props.existing));
const dateBad = computed(() => problem.value === "date" || problem.value === "duplicate");
function submit() {
  touched.value = true;
  if (problem.value || amount.value === null || !from.value) return;
  emit("submit", { amount: amount.value, from: from.value });
}
</script>

<template>
  <NqDialog open @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.newRateTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.newRateDescription }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && problem === 'amount'">
          <NqFieldLabel>{{ props.t.amount }}</NqFieldLabel>
          <NqCurrencyInput v-model="amount" :currency="props.currency" :disabled="props.busy" :aria-label="props.t.amount" />
          <NqFieldError v-if="touched && problem === 'amount'" match>{{ props.t.problems.amount }}</NqFieldError>
        </NqField>
        <NqField :invalid="touched && dateBad">
          <NqFieldLabel>{{ props.t.effectiveFrom }}</NqFieldLabel>
          <NqDatePicker :aria-label="props.t.effectiveFrom" :model-value="from ? dayOf(from) : null" :disabled="props.busy" @update:model-value="(d: Date | null) => (from = d ? keyOf(d) : null)" />
          <NqFieldError v-if="touched && dateBad" match>{{ props.t.problems[problem as "date" | "duplicate"] }}</NqFieldError>
        </NqField>
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
