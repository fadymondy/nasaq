<script setup lang="ts">
import { CircleX } from "lucide-vue-next";
import { computed, ref } from "vue";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { describeCron, isValidCron } from "../cron-builder";
import { NqCurrencyInput } from "../currency-input";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldError, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import NqRatesDay from "./NqRatesDay.vue";
import type { CycleUnit } from "./rates-logic";
import { dayOf, keyOf, useRatesStrings, type RatesStrings } from "./strings";
import { subscriptionCharges, type Subscription, type SubscriptionInput, type SubscriptionSchedule } from "./subscriptions";

// Internal: the new / edit subscription dialog.
interface Props {
  sub: Subscription | null;
  currency: string;
  projects?: readonly { id: string; name: string }[];
  today: string;
  busy: boolean;
  error: string | null;
  t: RatesStrings;
}
const props = withDefaults(defineProps<Props>(), { projects: undefined });
const emit = defineEmits<{ cancel: []; submit: [input: SubscriptionInput] }>();
const { n, cron: cronLocale } = useRatesStrings();

const NONE = "__none__";
const sub = props.sub;
const name = ref(sub?.name ?? "");
const projectId = ref(sub?.projectId ?? "");
const amount = ref<number | null>(sub?.amount ?? null);
const quantity = ref(String(sub?.quantity ?? 1));
const custom = ref(sub?.schedule.kind === "cron");
const every = ref(String(sub?.schedule.kind === "cycle" ? sub.schedule.every : 1));
const unit = ref<CycleUnit>(sub?.schedule.kind === "cycle" ? sub.schedule.unit : "month");
const expr = ref(sub?.schedule.kind === "cron" ? sub.schedule.expr : "0 9 1 * *");
const anchor = ref<string | null>(sub?.anchor ?? props.today);
const touched = ref(false);

const everyN = computed(() => Number(every.value));
const qty = computed(() => Number(quantity.value));
const nameBad = computed(() => !name.value.trim());
const amountBad = computed(() => !amount.value || amount.value <= 0);
const qtyBad = computed(() => !Number.isInteger(qty.value) || qty.value < 1);
const scheduleBad = computed(() => (custom.value ? !isValidCron(expr.value) : !Number.isInteger(everyN.value) || everyN.value < 1));
const bad = computed(() => nameBad.value || amountBad.value || qtyBad.value || scheduleBad.value || !anchor.value);

const schedule = computed<SubscriptionSchedule>(() => (custom.value ? { kind: "cron", expr: expr.value.trim() } : { kind: "cycle", every: everyN.value, unit: unit.value }));
const preview = computed(() => (!scheduleBad.value && anchor.value ? subscriptionCharges({ schedule: schedule.value, anchor: anchor.value }, anchor.value > props.today ? anchor.value : props.today, 3) : []));
const cronText = computed(() => (custom.value && !scheduleBad.value ? describeCron(expr.value, cronLocale.value) : null));
const unitLabel = (u: CycleUnit) => (everyN.value === 1 ? props.t.units : props.t.unitsPlural)[u];

function submit() {
  touched.value = true;
  if (bad.value || amount.value === null || !anchor.value) return;
  emit("submit", { name: name.value.trim(), projectId: projectId.value || undefined, amount: amount.value, quantity: qty.value, schedule: schedule.value, anchor: anchor.value });
}
</script>

<template>
  <NqDialog open @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent>
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.sub ? props.t.editSubscription : props.t.newSubscription }}</NqDialogTitle>
        </NqDialogHeader>
        <NqField :invalid="touched && nameBad">
          <NqFieldLabel>{{ props.t.name }}</NqFieldLabel>
          <NqInput v-model="name" :disabled="props.busy" />
        </NqField>
        <NqField v-if="props.projects">
          <NqFieldLabel>{{ props.t.project }}</NqFieldLabel>
          <NqSelect :model-value="projectId || NONE" :disabled="props.busy" @update:model-value="(v: string | number | null) => (projectId = v && v !== NONE ? String(v) : '')">
            <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
            <NqSelectContent>
              <NqSelectItem :value="NONE">{{ props.t.noProject }}</NqSelectItem>
              <NqSelectItem v-for="p in props.projects" :key="p.id" :value="p.id">{{ p.name }}</NqSelectItem>
            </NqSelectContent>
          </NqSelect>
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && amountBad">
            <NqFieldLabel>{{ props.t.price }}</NqFieldLabel>
            <NqCurrencyInput v-model="amount" :currency="props.currency" :disabled="props.busy" :aria-label="props.t.price" />
          </NqField>
          <NqField :invalid="touched && qtyBad">
            <NqFieldLabel>{{ props.t.quantity }}</NqFieldLabel>
            <NqInput v-model="quantity" ltr inputmode="numeric" :disabled="props.busy" />
          </NqField>
        </div>
        <label class="flex items-center gap-2 text-body-sm">
          <NqSwitch v-model="custom" :disabled="props.busy" />
          {{ props.t.customSchedule }}
        </label>
        <NqField v-if="custom" :invalid="touched && scheduleBad">
          <NqFieldLabel>{{ props.t.cron }}</NqFieldLabel>
          <NqInput v-model="expr" ltr class="font-mono" :disabled="props.busy" />
          <NqFieldError v-if="touched && scheduleBad" match>{{ props.t.cronBad }}</NqFieldError>
          <NqFieldDescription v-else>{{ cronText ?? props.t.cronHint }}</NqFieldDescription>
        </NqField>
        <div v-else class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && scheduleBad">
            <NqFieldLabel>{{ props.t.every }}</NqFieldLabel>
            <NqInput v-model="every" ltr inputmode="numeric" :disabled="props.busy" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ props.t.repeats }}</NqFieldLabel>
            <NqSelect :model-value="unit" :disabled="props.busy" @update:model-value="(v: string | number | null) => v && (unit = v as CycleUnit)">
              <NqSelectTrigger><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="u in (['week', 'month', 'year'] as const)" :key="u" :value="u">{{ unitLabel(u) }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
        </div>
        <NqField>
          <NqFieldLabel>{{ props.t.firstCharge }}</NqFieldLabel>
          <NqDatePicker :aria-label="props.t.firstCharge" :model-value="anchor ? dayOf(anchor) : null" :disabled="props.busy" @update:model-value="(d: Date | null) => (anchor = d ? keyOf(d) : null)" />
        </NqField>
        <p v-if="preview.length" class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
          <span>{{ props.t.nextCharges }}</span>
          <NqBadge v-for="d in preview" :key="d" variant="outline"><NqRatesDay :day="d" /></NqBadge>
        </p>
        <span class="sr-only">{{ n(preview.length) }}</span>
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
