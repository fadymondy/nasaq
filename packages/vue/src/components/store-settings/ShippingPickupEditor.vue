<script setup lang="ts">
import { computed, ref } from "vue";
import { NqButton } from "../button";
import { NqCurrencyInput } from "../currency-input";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { NqField, NqFieldDescription, NqFieldLabel, NqInput } from "../field";
import { NqSwitch } from "../switch";
import type { PickupLocation } from "./shipping-logic";
import { regionName, type StoreSettingsLabels } from "./strings";
import { useSettingsStrings } from "./use-settings";

// The add/edit dialog of one pickup point. Internal to NqShippingSettings.
const props = defineProps<{ pickup: PickupLocation; isNew: boolean; currency: string; busy: boolean; error: string | null; labels?: StoreSettingsLabels }>();
const emit = defineEmits<{ cancel: []; save: [pickup: PickupLocation] }>();
const { t, locale } = useSettingsStrings(() => props.labels);
const toInt = (v: string): number | undefined => (/^\d+$/.test(v.trim()) ? Number(v.trim()) : undefined);

const name = ref(props.pickup.name);
const address = ref(props.pickup.address);
const country = ref(props.pickup.country);
const city = ref(props.pickup.city ?? "");
const fee = ref<number | null>(props.pickup.fee ?? 0);
const ready = ref(props.pickup.readyInHours === undefined ? "" : String(props.pickup.readyInHours));
const active = ref(props.pickup.active !== false);
const touched = ref(false);
const validCountry = computed(() => /^[A-Za-z]{2}$/.test(country.value.trim()));
const bad = computed(() => !name.value.trim() || !address.value.trim() || !validCountry.value);

function submit() {
  touched.value = true;
  if (bad.value) return;
  const hours = toInt(ready.value);
  const f = fee.value ?? 0;
  const { city: _c, fee: _f, readyInHours: _r, ...base } = props.pickup;
  emit("save", {
    ...base,
    name: name.value.trim(),
    address: address.value.trim(),
    country: country.value.trim().toUpperCase(),
    ...(city.value.trim() ? { city: city.value.trim() } : {}),
    ...(f > 0 ? { fee: f } : {}),
    ...(hours !== undefined ? { readyInHours: hours } : {}),
    active: active.value,
  });
}
</script>

<template>
  <NqDialog :open="true" @update:open="(o: boolean) => !o && !props.busy && emit('cancel')">
    <NqDialogContent class="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
      <form novalidate class="grid gap-4" @submit.prevent="submit">
        <NqDialogHeader>
          <NqDialogTitle>{{ props.isNew ? t.addPickup : name || t.editPickup }}</NqDialogTitle>
          <NqDialogDescription>{{ t.pickupHint }}</NqDialogDescription>
        </NqDialogHeader>
        <NqField :invalid="touched && !name.trim()">
          <NqFieldLabel>{{ t.pickupName }}</NqFieldLabel>
          <NqInput v-model="name" />
        </NqField>
        <NqField :invalid="touched && !address.trim()">
          <NqFieldLabel>{{ t.address }}</NqFieldLabel>
          <NqInput v-model="address" />
        </NqField>
        <div class="grid gap-4 sm:grid-cols-2">
          <NqField :invalid="touched && !validCountry">
            <NqFieldLabel>{{ t.country }}</NqFieldLabel>
            <NqInput v-model="country" ltr maxlength="2" class="uppercase" />
            <NqFieldDescription>{{ validCountry ? regionName(locale, country) : t.countryHint }}</NqFieldDescription>
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.city }}</NqFieldLabel>
            <NqInput v-model="city" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.pickupFee }}</NqFieldLabel>
            <NqCurrencyInput v-model="fee" :currency="props.currency" :aria-label="t.pickupFee" />
          </NqField>
          <NqField>
            <NqFieldLabel>{{ t.readyInHoursLabel }}</NqFieldLabel>
            <NqInput v-model="ready" ltr inputmode="numeric" />
          </NqField>
        </div>
        <label class="flex items-center gap-2 text-body-sm">
          <NqSwitch v-model="active" />
          {{ t.active }}
        </label>
        <p v-if="props.error" role="alert" class="text-body-sm text-nq-danger-text">{{ props.error }}</p>
        <NqDialogFooter>
          <NqButton type="button" variant="ghost" :disabled="props.busy" @click="emit('cancel')">{{ t.cancel }}</NqButton>
          <NqButton type="submit" variant="primary" :loading="props.busy">{{ t.savePickup }}</NqButton>
        </NqDialogFooter>
      </form>
    </NqDialogContent>
  </NqDialog>
</template>
