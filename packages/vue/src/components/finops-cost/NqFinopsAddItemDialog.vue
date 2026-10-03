<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { validateLineItem, type LineItemPeriod } from "./finops-format";
import type { FinopsCostLabels } from "./strings";
import type { CostItemInput, FinopsCostResult } from "./types";

// The "Add a cost item" dialog of FinopsCost: name, category, amount and how it is billed.
const props = defineProps<{
  open: boolean;
  onAdd: (input: CostItemInput) => Promise<FinopsCostResult> | FinopsCostResult;
  t: FinopsCostLabels;
}>();
const emit = defineEmits<{ "update:open": [value: boolean] }>();

const name = ref("");
const category = ref("");
const amount = ref("");
const period = ref<LineItemPeriod>("monthly");
const touched = ref(false);
const pending = ref(false);
const error = ref<string | null>(null);

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    name.value = "";
    category.value = "";
    amount.value = "";
    period.value = "monthly";
    touched.value = false;
    error.value = null;
  },
);

const check = computed(() => validateLineItem({ name: name.value, amount: amount.value }));
const problems = computed(() => (check.value.ok ? [] : check.value.problems));
const periodItems = computed(() => (Object.keys(props.t.periods) as LineItemPeriod[]).map((p) => ({ value: p, label: props.t.periods[p] })));

async function submit() {
  touched.value = true;
  const c = check.value;
  if (!c.ok) return;
  pending.value = true;
  error.value = null;
  try {
    const result = await props.onAdd({ name: name.value.trim(), category: category.value.trim(), amount: c.amount, period: period.value });
    if (result && result.error) error.value = result.error;
    else emit("update:open", false);
  } catch {
    error.value = props.t.genericError;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <NqDialog :open="props.open" @update:open="(next: boolean) => !pending && emit('update:open', next)">
    <NqDialogContent data-slot="finops-add-item" class="max-w-md">
      <form novalidate class="flex flex-col gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.t.addItemTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ props.t.addItemBody }}</NqDialogDescription>
        </NqDialogHeader>
        <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
        <NqField :invalid="touched && problems.includes('name')">
          <NqFieldLabel>{{ props.t.nameLabel }}</NqFieldLabel>
          <NqInput v-model="name" :placeholder="props.t.namePlaceholder" autocomplete="off" />
          <NqFieldError v-if="touched && problems.includes('name')" :match="true">{{ props.t.nameRequired }}</NqFieldError>
        </NqField>
        <NqField>
          <NqFieldLabel>{{ props.t.categoryLabel }}</NqFieldLabel>
          <NqInput v-model="category" :placeholder="props.t.categoryPlaceholder" autocomplete="off" />
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && problems.includes('amount')">
            <NqFieldLabel>{{ props.t.amountLabel }}</NqFieldLabel>
            <NqInput v-model="amount" ltr inputmode="decimal" placeholder="12.00" autocomplete="off" />
            <NqFieldError v-if="touched && problems.includes('amount')" :match="true">{{ props.t.amountInvalid }}</NqFieldError>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.periodLabel }}</NqFieldLabel>
            <NqSelect :model-value="period" @update:model-value="(v: string | number | null) => v && (period = v as LineItemPeriod)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="o in periodItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="pending" @click="emit('update:open', false)">{{ props.t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="pending">{{ props.t.add }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
