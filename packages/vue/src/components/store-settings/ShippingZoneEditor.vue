<script setup lang="ts">
import { CircleX, Plus, Trash2 } from "lucide-vue-next";
import { computed, ref, useId } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqSwitch } from "../switch";
import { NqTagInput } from "../tag-input";
import ShippingTierEditor from "./ShippingTierEditor.vue";
import { tierIssues, type ShippingRate, type ShippingRateType, type ShippingTier, type ShippingZone } from "./shipping-logic";
import { uid, type StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// The add/edit dialog of one shipping zone with its rates. Internal to NqShippingSettings.
const props = defineProps<{ zone: ShippingZone; isNew: boolean; currency: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels }>();
const emit = defineEmits<{ cancel: []; save: [zone: ShippingZone] }>();
const { t } = useSettingsStrings(() => props.labels);
const id = useId();

const RATE_TYPES: ShippingRateType[] = ["flat", "weight", "price", "free-over"];
const COMMON_COUNTRIES = ["EG", "SA", "AE", "KW", "QA", "BH", "OM", "JO", "LB", "MA", "US", "GB", "DE", "FR", "*"];
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);
const normCodes = (codes: string[]) => [...new Set(codes.map((c) => c.trim().toUpperCase()).filter((c) => c === "*" || /^[A-Z]{2}$/.test(c)))];

const name = ref(props.zone.name);
const countries = ref<string[]>([...props.zone.countries]);
const cities = ref<string[]>([...(props.zone.cities ?? [])]);
const rates = ref<ShippingRate[]>(props.zone.rates.map((r) => ({ ...r })));
const touched = ref(false);

const rateProblem = (r: ShippingRate) => !r.label.trim() || ((r.type === "weight" || r.type === "price") && tierIssues(r.tiers ?? []).length > 0);
const problems = computed(() => [!name.value.trim() && t.value.zoneNameRequired, normCodes(countries.value).length === 0 && t.value.countriesRequired, rates.value.some(rateProblem) && t.value.fixRates].filter(Boolean) as string[]);

function patch(rid: string, change: Partial<ShippingRate> | ((r: ShippingRate) => ShippingRate)) {
  rates.value = rates.value.map((r) => (r.id === rid ? (typeof change === "function" ? change(r) : { ...r, ...change }) : r));
}
const addRate = () => (rates.value = [...rates.value, { id: uid("rate"), label: "", type: "flat", amount: 0, active: true }]);
function setType(r: ShippingRate, type: ShippingRateType): ShippingRate {
  const { tiers: _t, freeOver: _f, amount: _a, ...rest } = r;
  switch (type) {
    case "flat":
      return { ...rest, type, amount: 0 };
    case "free-over":
      return { ...rest, type, freeOver: 0, amount: 0 };
    case "weight":
      return { ...rest, type, tiers: [{ min: 0, max: 1000, amount: 0 }, { min: 1000, amount: 0 }] };
    case "price":
      return { ...rest, type, tiers: [{ min: 0, max: 10000, amount: 0 }, { min: 10000, amount: 0 }] };
  }
}
function setEta(rate: ShippingRate, from: number | undefined, to: number | undefined): ShippingRate {
  const cur = rate.etaDays ?? [0, 0];
  const next: [number, number] = [from ?? cur[0], to ?? cur[1]];
  if (next[1] < next[0]) next[1] = next[0];
  const { etaDays: _e, ...rest } = rate;
  return next[0] === 0 && next[1] === 0 && from === undefined && to === undefined ? rest : { ...rest, etaDays: next };
}
function setBelow(r: ShippingRate, v: number | null) {
  patch(r.id, (cur) => {
    const { amount: _a, ...rest } = cur;
    return v === null ? rest : { ...rest, amount: v };
  });
}

function submit() {
  touched.value = true;
  if (problems.value.length > 0) return;
  const c = cities.value.map((x) => x.trim()).filter(Boolean);
  const { cities: _c, ...base } = props.zone;
  emit("save", { ...base, name: name.value.trim(), countries: normCodes(countries.value), ...(c.length ? { cities: c } : {}), rates: rates.value });
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-3xl">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.isNew ? t.addZone : name || t.editZone }}</NqDialogTitle>
          <NqDialogDescription>{{ t.zoneHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && !name.trim()">
          <NqFieldLabel>{{ t.zoneName }}</NqFieldLabel>
          <NqInput v-model="name" />
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && normCodes(countries).length === 0">
            <NqFieldLabel :for="`${id}-countries`">{{ t.countries }}</NqFieldLabel>
            <NqTagInput :model-value="countries" :suggestions="COMMON_COUNTRIES" :placeholder="t.countriesPlaceholder" :input-props="{ id: `${id}-countries` }" @update:model-value="(v) => (countries = v.map((c) => c.toUpperCase()))" />
            <NqFieldDescription>{{ t.countriesHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel :for="`${id}-cities`">{{ t.cities }}</NqFieldLabel>
            <NqTagInput v-model="cities" :placeholder="t.citiesPlaceholder" :input-props="{ id: `${id}-cities` }" />
            <NqFieldDescription>{{ t.citiesHint }}</NqFieldDescription>
          </NqField>
        </div>

        <div class="flex items-center justify-between gap-2">
          <h3 class="text-h4 text-foreground">{{ t.rates }}</h3>
          <NqButton type="button" variant="secondary" size="sm" @click="addRate">
            <Plus aria-hidden="true" />
            {{ t.addRate }}
          </NqButton>
        </div>
        <p v-if="rates.length === 0" class="text-body-sm text-muted-foreground">{{ t.noRates }}</p>
        <ul class="grid gap-3">
          <li v-for="(r, i) in rates" :key="r.id" class="grid gap-3 rounded-card border border-border bg-card p-3" data-slot="rate-editor">
            <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_auto]">
              <NqField :invalid="touched && !r.label.trim()">
                <NqFieldLabel>{{ t.rateName }}</NqFieldLabel>
                <NqInput :model-value="r.label" :placeholder="t.rateNamePlaceholder" @update:model-value="(v) => patch(r.id, { label: String(v ?? '') })" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ t.rateType }}</NqFieldLabel>
                <NqSelect :model-value="r.type" @update:model-value="(v) => v && patch(r.id, (cur) => setType(cur, v as ShippingRateType))">
                  <NqSelectTrigger :aria-label="t.rateType">
                    <NqSelectValue />
                  </NqSelectTrigger>
                  <NqSelectContent>
                    <NqSelectItem v-for="x in RATE_TYPES" :key="x" :value="x">{{ t.rateTypes[x] }}</NqSelectItem>
                  </NqSelectContent>
                </NqSelect>
              </NqField>
              <NqButton type="button" variant="ghost" size="icon" class="self-end" :aria-label="t.removeRate(String(i + 1))" @click="rates = rates.filter((x) => x.id !== r.id)">
                <Trash2 aria-hidden="true" />
              </NqButton>
            </div>

            <NqField v-if="r.type === 'flat'">
              <NqFieldLabel>{{ t.price }}</NqFieldLabel>
              <NqCurrencyInput :currency="props.currency" :model-value="r.amount ?? 0" :aria-label="t.price" @update:model-value="(v: number | null) => patch(r.id, { amount: v ?? 0 })" />
            </NqField>
            <div v-if="r.type === 'free-over'" class="grid gap-3 sm:grid-cols-2">
              <NqField>
                <NqFieldLabel>{{ t.freeOverAmount }}</NqFieldLabel>
                <NqCurrencyInput :currency="props.currency" :model-value="r.freeOver ?? 0" :aria-label="t.freeOverAmount" @update:model-value="(v: number | null) => patch(r.id, { freeOver: v ?? 0 })" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ t.belowPrice }}</NqFieldLabel>
                <NqCurrencyInput :currency="props.currency" :model-value="r.amount ?? null" :aria-label="t.belowPrice" @update:model-value="(v: number | null) => setBelow(r, v)" />
                <NqFieldDescription>{{ t.belowPriceHint }}</NqFieldDescription>
              </NqField>
            </div>
            <ShippingTierEditor
              v-if="r.type === 'weight' || r.type === 'price'"
              :type="r.type"
              :tiers="(r.tiers ?? []) as ShippingTier[]"
              :currency="props.currency"
              :labels="props.labels"
              :show-issues="touched || (r.tiers ?? []).length > 0"
              @change="(tiers) => patch(r.id, { tiers })"
            />

            <div class="grid gap-3 sm:grid-cols-[repeat(2,minmax(0,8rem))_1fr] sm:items-end">
              <NqField>
                <NqFieldLabel>{{ t.etaFrom }}</NqFieldLabel>
                <NqInput ltr inputmode="numeric" :model-value="r.etaDays ? String(r.etaDays[0]) : ''" @update:model-value="(v) => patch(r.id, (cur) => setEta(cur, toInt(String(v ?? '')), undefined))" />
              </NqField>
              <NqField>
                <NqFieldLabel>{{ t.etaTo }}</NqFieldLabel>
                <NqInput ltr inputmode="numeric" :model-value="r.etaDays ? String(r.etaDays[1]) : ''" @update:model-value="(v) => patch(r.id, (cur) => setEta(cur, undefined, toInt(String(v ?? ''))))" />
              </NqField>
              <div class="flex flex-wrap items-center gap-4 pb-1.5">
                <label class="flex items-center gap-2 text-body-sm">
                  <NqSwitch :model-value="Boolean(r.express)" @update:model-value="(on: boolean) => patch(r.id, { express: on })" />
                  {{ t.express }}
                </label>
                <label class="flex items-center gap-2 text-body-sm">
                  <NqSwitch :model-value="r.active !== false" @update:model-value="(on: boolean) => patch(r.id, { active: on })" />
                  {{ t.active }}
                </label>
              </div>
            </div>
          </li>
        </ul>

        <p v-if="(touched && problems.length > 0) || props.error" role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
          <CircleX aria-hidden="true" class="size-4 shrink-0" />
          {{ props.error ?? problems.join(" ") }}
        </p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.saveZone }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
