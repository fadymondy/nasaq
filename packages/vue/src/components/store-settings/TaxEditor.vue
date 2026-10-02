<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSwitch } from "../switch";
import { bpsToPercent, percentToBps, regionName, type StoreSettingsLabels } from "./strings";
import type { TaxRate } from "./tax-logic";
import { useSettingsStrings } from "./use-settings";

// The add/edit dialog of one tax rate. Internal to NqTaxSettings.
const props = defineProps<{ rate: TaxRate; isNew: boolean; busy: boolean; error: string | null; labels?: StoreSettingsLabels }>();
const emit = defineEmits<{ cancel: []; save: [rate: TaxRate] }>();
const { t, locale } = useSettingsStrings(() => props.labels);
const id = useId();
const name = ref(props.rate.name);
const country = ref(props.rate.country);
const region = ref(props.rate.region ?? "");
const percent = ref(bpsToPercent(props.rate.bps));
const inclusive = ref(props.rate.inclusive);
const onShipping = ref(Boolean(props.rate.onShipping));
const active = ref(props.rate.active !== false);
const touched = ref(false);
const bps = computed(() => percentToBps(percent.value));
const validCountry = computed(() => /^[A-Za-z]{2}$/.test(country.value.trim()));
const bad = computed(() => !name.value.trim() || !validCountry.value || bps.value === undefined);

function submit() {
  touched.value = true;
  if (bad.value || bps.value === undefined) return;
  const { region: _r, ...base } = props.rate;
  emit("save", {
    ...base,
    name: name.value.trim(),
    country: country.value.trim().toUpperCase(),
    ...(region.value.trim() ? { region: region.value.trim() } : {}),
    bps: bps.value,
    inclusive: inclusive.value,
    onShipping: onShipping.value,
    active: active.value,
  });
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.isNew ? t.addTax : name || t.editTax }}</NqDialogTitle>
          <NqDialogDescription>{{ t.taxHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && !name.trim()">
          <NqFieldLabel>{{ t.taxName }}</NqFieldLabel>
          <NqInput v-model="name" :placeholder="t.taxNamePlaceholder" />
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && !validCountry">
            <NqFieldLabel>{{ t.country }}</NqFieldLabel>
            <NqInput v-model="country" ltr maxlength="2" class="uppercase" />
            <NqFieldDescription>{{ validCountry ? regionName(locale, country) : t.countryHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.regionOptional }}</NqFieldLabel>
            <NqInput v-model="region" />
            <NqFieldDescription>{{ t.regionHint }}</NqFieldDescription>
          </NqField>
          <NqField :invalid="touched && bps === undefined">
            <NqFieldLabel>{{ t.ratePercent }}</NqFieldLabel>
            <NqInput v-model="percent" ltr inputmode="decimal" />
            <NqFieldDescription>{{ bps === undefined ? t.rateInvalid : t.bpsIs(String(bps)) }}</NqFieldDescription>
          </NqField>
        </div>
        <fieldset class="grid gap-2">
          <legend class="text-label text-foreground">{{ t.mode }}</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="inc in [true, false]"
              :key="String(inc)"
              :class="cn('flex cursor-pointer items-start gap-2 rounded-card border p-3 text-body-sm', inclusive === inc ? 'border-primary bg-nq-surface-soft' : 'border-border')"
            >
              <input type="radio" :name="`${id}-mode`" class="mt-1 accent-[var(--nq-brand)]" :checked="inclusive === inc" @change="inclusive = inc" />
              <span class="grid gap-0.5">
                <span class="font-medium text-foreground">{{ inc ? t.inclusive : t.exclusive }}</span>
                <span class="text-caption text-muted-foreground">{{ inc ? t.inclusiveHint : t.exclusiveHint }}</span>
              </span>
            </label>
          </div>
        </fieldset>
        <div class="flex flex-wrap gap-6">
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch v-model="onShipping" />
            {{ t.onShipping }}
          </label>
          <label class="flex items-center gap-2 text-body-sm">
            <NqSwitch v-model="active" />
            {{ t.active }}
          </label>
        </div>
        <p v-if="props.error" role="alert" class="text-body-sm text-nq-danger-text">{{ props.error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.saveTax }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
