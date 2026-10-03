<script setup lang="ts">
import { CircleX } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqCurrencyInput } from "../currency-input";
import { NqDatePicker } from "../date-picker";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { NqTagInput } from "../tag-input";
import DiscountBxgyFields from "./DiscountBxgyFields.vue";
import DiscountScopePicker from "./DiscountScopePicker.vue";
import type { CommerceProduct } from "./commerce";
import { duplicateDiscountCodes, normalizeDiscountCode, type Discount, type DiscountClass, type DiscountKind, type DiscountScope } from "./discount-logic";
import { bpsToPercent, percentToBps, type StoreSettingsLabels } from "./strings";
import type { SimCollection } from "./types";
import { useSettingsStrings } from "./use-settings";

// The add/edit dialog of one discount. Internal to NqDiscountsManager.
const props = defineProps<{
  discount: Discount;
  isNew: boolean;
  others: readonly Discount[];
  currency: string;
  products: readonly CommerceProduct[];
  collections: readonly SimCollection[];
  segments: readonly string[];
  busy: boolean;
  error: string | null;
  labels?: StoreSettingsLabels;
}>();
const emit = defineEmits<{ cancel: []; save: [discount: Discount] }>();
const { t } = useSettingsStrings(() => props.labels);
const id = useId();

const KINDS: DiscountKind[] = ["percentage", "fixed", "bxgy", "free-shipping"];
const CLASSES: DiscountClass[] = ["product", "order", "shipping"];
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).toISOString();
const endOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 0).toISOString();
const hasScope = (s?: DiscountScope) => (s?.productIds?.length ?? 0) > 0 || (s?.collectionIds?.length ?? 0) > 0;

const d = ref<Discount>({ ...props.discount });
const pct = ref(props.discount.kind === "percentage" ? bpsToPercent(props.discount.value ?? 0) : "10");
const getPct = ref(bpsToPercent(props.discount.bxgy?.getPercentBps ?? 10000));
const touched = ref(false);

const patch = (change: Partial<Discount>) => (d.value = { ...d.value, ...change });
function without(key: keyof Discount) {
  const { [key]: _x, ...rest } = d.value;
  d.value = rest as Discount;
}

const pctBps = computed(() => percentToBps(pct.value));
const getBps = computed(() => percentToBps(getPct.value));
const code = computed(() => normalizeDiscountCode(d.value.code ?? ""));
const codeOk = computed(() => /^[A-Z0-9_-]{3,32}$/.test(code.value));
const problems = computed(() => {
  const x = d.value;
  const tt = t.value;
  const out: string[] = [];
  if (!x.title.trim()) out.push(tt.problemTitle);
  if (x.method === "code" && !codeOk.value) out.push(tt.problemCode);
  if (x.method === "code" && code.value && duplicateDiscountCodes([...props.others, { ...x, code: code.value }]).includes(code.value)) out.push(tt.problemDuplicateCode);
  if (x.kind === "percentage" && (pctBps.value === undefined || pctBps.value < 1)) out.push(tt.problemPercent);
  if (x.kind === "fixed" && (x.value ?? 0) <= 0) out.push(tt.problemAmount);
  if (x.kind === "bxgy") {
    if (!x.bxgy || x.bxgy.buyQty < 1 || x.bxgy.getQty < 1) out.push(tt.problemBxgy);
    if (getBps.value === undefined || getBps.value < 1) out.push(tt.problemPercent);
  }
  if (x.startsAt && x.endsAt && Date.parse(x.endsAt) < Date.parse(x.startsAt)) out.push(tt.problemDates);
  return out;
});

function setKind(kind: DiscountKind) {
  const { value: _v, perItem: _p, bxgy: _b, scope: _s, ...rest } = d.value;
  switch (kind) {
    case "percentage":
      d.value = { ...rest, kind, value: 1000 };
      break;
    case "fixed":
      d.value = { ...rest, kind, value: 10000 };
      break;
    case "bxgy":
      d.value = { ...rest, kind, bxgy: { buyQty: 2, getQty: 1 } };
      break;
    case "free-shipping":
      d.value = { ...rest, kind };
      break;
  }
}
function setMethod(m: string) {
  if (m === "code") patch({ method: "code" });
  else {
    const { code: _c, ...rest } = d.value;
    d.value = { ...rest, method: "automatic" };
  }
}
function setLimit(key: "total" | "perCustomer", v: number | undefined) {
  const next = { ...d.value.limits };
  if (v === undefined || v === 0) delete next[key];
  else next[key] = v;
  patch({ limits: next });
}

function submit() {
  touched.value = true;
  if (problems.value.length > 0) return;
  const x = d.value;
  const out: Discount = { ...x, title: x.title.trim() };
  if (x.method === "code") out.code = code.value;
  else delete out.code;
  if (x.kind === "percentage" && pctBps.value !== undefined) out.value = pctBps.value;
  if (x.kind === "bxgy" && x.bxgy && getBps.value !== undefined) out.bxgy = { ...x.bxgy, ...(getBps.value === 10000 ? {} : { getPercentBps: getBps.value }) };
  if (getBps.value === 10000 && out.bxgy) delete out.bxgy.getPercentBps;
  emit("save", out);
}

const sectionTitle = "text-h4 text-foreground";
const combines = computed(() => d.value.combinesWith ?? {});
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
      <form novalidate class="grid gap-5" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.isNew ? t.addDiscount : d.title || t.editDiscount }}</NqDialogTitle>
          <NqDialogDescription>{{ t.discountHint }}</NqDialogDescription>
        </NqDialogHeader>

        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && !d.title.trim()" class="sm:col-span-2">
            <NqFieldLabel :for="`${id}-title`">{{ t.discountTitle }}</NqFieldLabel>
            <NqInput :id="`${id}-title`" :model-value="d.title" @update:model-value="(v) => patch({ title: String(v ?? '') })" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.method }}</NqFieldLabel>
            <NqSelect :model-value="d.method" @update:model-value="(v) => v && setMethod(String(v))">
              <NqSelectTrigger :aria-label="t.method"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem value="automatic">{{ t.automatic }}</NqSelectItem>
                <NqSelectItem value="code">{{ t.byCode }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField v-if="d.method === 'code'" :invalid="touched && (!codeOk || problems.includes(t.problemDuplicateCode))">
            <NqFieldLabel :for="`${id}-code`">{{ t.code }}</NqFieldLabel>
            <NqInput :id="`${id}-code`" ltr class="font-mono uppercase" :model-value="d.code ?? ''" placeholder="SUMMER10" @update:model-value="(v) => patch({ code: String(v ?? '') })" />
          </NqField>
        </div>

        <section class="grid gap-3" :aria-label="t.whatItDoes">
          <h3 :class="sectionTitle">{{ t.whatItDoes }}</h3>
          <NqField>
            <NqFieldLabel>{{ t.type }}</NqFieldLabel>
            <NqSelect :model-value="d.kind" @update:model-value="(v) => v && setKind(v as DiscountKind)">
              <NqSelectTrigger :aria-label="t.type"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem v-for="k in KINDS" :key="k" :value="k">{{ t.kinds[k] }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField v-if="d.kind === 'percentage'" :invalid="touched && (pctBps === undefined || pctBps < 1)">
            <NqFieldLabel :for="`${id}-pct`">{{ t.percentOff }}</NqFieldLabel>
            <NqInput :id="`${id}-pct`" v-model="pct" ltr inputmode="decimal" />
            <NqFieldDescription>{{ pctBps === undefined ? t.rateInvalid : t.bpsIs(String(pctBps)) }}</NqFieldDescription>
          </NqField>
          <div v-if="d.kind === 'fixed'" class="grid gap-3 sm:grid-cols-2">
            <NqField :invalid="touched && (d.value ?? 0) <= 0">
              <NqFieldLabel>{{ t.amountOff }}</NqFieldLabel>
              <NqCurrencyInput :currency="props.currency" :model-value="d.value ?? 0" :aria-label="t.amountOff" @update:model-value="(v: number | null) => patch({ value: v ?? 0 })" />
            </NqField>
            <label class="flex items-center gap-2 self-end pb-2 text-body-sm">
              <NqSwitch :model-value="Boolean(d.perItem)" @update:model-value="(on: boolean) => patch({ perItem: on })" />
              {{ t.perItem }}
            </label>
          </div>
          <DiscountBxgyFields
            v-if="d.kind === 'bxgy' && d.bxgy"
            v-model:get-pct="getPct"
            :bxgy="d.bxgy"
            :get-bps="getBps"
            :products="props.products"
            :collections="props.collections"
            :touched="touched"
            :labels="props.labels"
            @change="(bxgy) => patch({ bxgy })"
          />
          <p v-if="d.kind === 'free-shipping'" class="text-body-sm text-muted-foreground">{{ t.freeShippingHint }}</p>
          <NqField v-if="d.kind === 'percentage' || d.kind === 'fixed' || d.kind === 'free-shipping'">
            <NqFieldLabel>{{ d.kind === "free-shipping" ? t.capShipping : t.cap }}</NqFieldLabel>
            <NqCurrencyInput :currency="props.currency" :model-value="d.maxDiscount ?? null" :aria-label="t.cap" @update:model-value="(v: number | null) => (v === null ? without('maxDiscount') : patch({ maxDiscount: v }))" />
            <NqFieldDescription>{{ t.capHint }}</NqFieldDescription>
          </NqField>
        </section>

        <section v-if="d.kind === 'percentage' || d.kind === 'fixed'" class="grid gap-3" :aria-label="t.appliesTo">
          <h3 :class="sectionTitle">{{ t.appliesTo }}</h3>
          <DiscountScopePicker :value="d.scope" :products="props.products" :collections="props.collections" :labels="props.labels" @change="(s) => (hasScope(s) ? patch({ scope: s as DiscountScope }) : without('scope'))" />
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch :model-value="Boolean(d.excludeOnSale)" @update:model-value="(on: boolean) => patch({ excludeOnSale: on })" />
            {{ t.excludeOnSale }}
          </label>
        </section>

        <section class="grid gap-3" :aria-label="t.requirements">
          <h3 :class="sectionTitle">{{ t.requirements }}</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.minSpend }}</NqFieldLabel>
              <NqCurrencyInput :currency="props.currency" :model-value="d.minSubtotal ?? null" :aria-label="t.minSpend" @update:model-value="(v: number | null) => (v === null || v === 0 ? without('minSubtotal') : patch({ minSubtotal: v }))" />
            </NqField>
            <NqField>
              <NqFieldLabel :for="`${id}-minq`">{{ t.minQuantity }}</NqFieldLabel>
              <NqInput
                :id="`${id}-minq`"
                ltr
                inputmode="numeric"
                :model-value="d.minQuantity === undefined ? '' : String(d.minQuantity)"
                @update:model-value="(raw) => { const v = toInt(String(raw ?? '')); if (v === undefined || v === 0) without('minQuantity'); else patch({ minQuantity: v }); }"
              />
            </NqField>
          </div>
        </section>

        <section class="grid gap-3" :aria-label="t.eligibility">
          <h3 :class="sectionTitle">{{ t.eligibility }}</h3>
          <NqField>
            <NqFieldLabel>{{ t.customers }}</NqFieldLabel>
            <NqSelect :model-value="d.customers?.mode ?? 'all'" @update:model-value="(v) => v && (v === 'all' ? without('customers') : patch({ customers: { mode: v as 'segments' | 'specific' } }))">
              <NqSelectTrigger :aria-label="t.customers"><NqSelectValue /></NqSelectTrigger>
              <NqSelectContent>
                <NqSelectItem value="all">{{ t.customersAll }}</NqSelectItem>
                <NqSelectItem value="segments">{{ t.customersSegments }}</NqSelectItem>
                <NqSelectItem value="specific">{{ t.customersSpecific }}</NqSelectItem>
              </NqSelectContent>
            </NqSelect>
          </NqField>
          <NqField v-if="d.customers?.mode === 'segments'">
            <NqFieldLabel :for="`${id}-seg`">{{ t.segmentsLabel }}</NqFieldLabel>
            <NqTagInput :model-value="d.customers.segments ?? []" :suggestions="[...props.segments]" :placeholder="t.segmentsPlaceholder" :input-props="{ id: `${id}-seg` }" @update:model-value="(v) => patch({ customers: { mode: 'segments', segments: v } })" />
          </NqField>
          <NqField v-if="d.customers?.mode === 'specific'">
            <NqFieldLabel :for="`${id}-cust`">{{ t.customerIdsLabel }}</NqFieldLabel>
            <NqTagInput :model-value="d.customers.customerIds ?? []" :placeholder="t.customerIdsPlaceholder" :input-props="{ id: `${id}-cust` }" @update:model-value="(v) => patch({ customers: { mode: 'specific', customerIds: v } })" />
          </NqField>
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch :model-value="Boolean(d.firstOrderOnly)" @update:model-value="(on: boolean) => patch({ firstOrderOnly: on })" />
            {{ t.firstOrderOnly }}
          </label>
        </section>

        <section class="grid gap-3" :aria-label="t.schedule">
          <h3 :class="sectionTitle">{{ t.schedule }}</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel>{{ t.startsOn }}</NqFieldLabel>
              <NqDatePicker :aria-label="t.startsOn" :model-value="d.startsAt ? new Date(d.startsAt) : null" @update:model-value="(v: Date | null) => (v ? patch({ startsAt: startOfDay(v) }) : without('startsAt'))" />
            </NqField>
            <NqField :invalid="problems.includes(t.problemDates)">
              <NqFieldLabel>{{ t.endsOn }}</NqFieldLabel>
              <NqDatePicker :aria-label="t.endsOn" :model-value="d.endsAt ? new Date(d.endsAt) : null" @update:model-value="(v: Date | null) => (v ? patch({ endsAt: endOfDay(v) }) : without('endsAt'))" />
            </NqField>
          </div>
        </section>

        <section class="grid gap-3" :aria-label="t.limits">
          <h3 :class="sectionTitle">{{ t.limits }}</h3>
          <div class="grid gap-3 sm:grid-cols-2">
            <NqField>
              <NqFieldLabel :for="`${id}-lt`">{{ t.limitTotal }}</NqFieldLabel>
              <NqInput :id="`${id}-lt`" ltr inputmode="numeric" :model-value="d.limits?.total === undefined ? '' : String(d.limits.total)" @update:model-value="(v) => setLimit('total', toInt(String(v ?? '')))" />
            </NqField>
            <NqField>
              <NqFieldLabel :for="`${id}-lc`">{{ t.limitCustomer }}</NqFieldLabel>
              <NqInput :id="`${id}-lc`" ltr inputmode="numeric" :model-value="d.limits?.perCustomer === undefined ? '' : String(d.limits.perCustomer)" @update:model-value="(v) => setLimit('perCustomer', toInt(String(v ?? '')))" />
            </NqField>
          </div>
        </section>

        <fieldset class="grid gap-2">
          <legend :class="sectionTitle">{{ t.combinesWith }}</legend>
          <p class="text-caption text-muted-foreground">{{ t.combinesHint }}</p>
          <div class="flex flex-wrap gap-x-6 gap-y-2">
            <label v-for="c in CLASSES" :key="c" class="flex items-center gap-2 text-body-sm">
              <NqCheckbox :model-value="Boolean(combines[c])" @update:model-value="(on: boolean) => patch({ combinesWith: { ...combines, [c]: on } })" />
              {{ t.classes[c] }}
            </label>
          </div>
        </fieldset>

        <p v-if="(touched && problems.length > 0) || props.error" role="alert" class="flex items-start gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="mt-0.5 size-4 shrink-0" />
          {{ props.error ?? problems.join(" ") }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.saveDiscount }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
