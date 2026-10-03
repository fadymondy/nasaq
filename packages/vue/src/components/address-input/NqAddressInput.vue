<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqField, NqFieldLabel, NqInput } from "../field";
import { NqPhoneInput } from "../phone-input";
import NqAddressPlaceSelect from "./NqAddressPlaceSelect.vue";
import type { Address, AddressInputLabels } from "./address-types";
import {
  createHubLocationsDataSource,
  placeName,
  type LocationArea,
  type LocationCity,
  type LocationCountry,
  type LocationsDataSource,
} from "./locations-data";

// Address form: country, city and area comboboxes that cascade (each is disabled until its parent is chosen and
// resets when the parent changes), street and detail fields, and an optional phone field. Places come from a
// `LocationsDataSource`, by default the CircleXO hub. No map: `lat` and `lng` pass through untouched.
interface Props {
  /** The address. Use `v-model`. */
  modelValue?: Address;
  defaultValue?: Address;
  /** Where countries, cities and areas come from. Default: the CircleXO hub (`createHubLocationsDataSource()`). */
  dataSource?: LocationsDataSource;
  /** Show the phone field. Default true. */
  showPhone?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Override any built-in string. */
  labels?: Partial<AddressInputLabels>;
  locale?: string;
  dir?: "ltr" | "rtl";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  dataSource: undefined,
  showPhone: true,
  labels: undefined,
  locale: undefined,
  dir: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: Address];
  /** The whole address on every change. Optional fields are left out when empty. */
  valueChange: [value: Address];
}>();

const STRINGS: Record<"en" | "ar", AddressInputLabels> = {
  en: {
    country: "Country",
    city: "City",
    area: "Area",
    street: "Street",
    building: "Building",
    floor: "Floor",
    apartment: "Apartment",
    landmark: "Landmark",
    postalCode: "Postal code",
    phone: "Phone",
    selectCountry: "Select a country",
    selectCity: "Select a city",
    selectArea: "Select an area",
    empty: "No results.",
    loading: "Loading...",
    loadError: "Could not load the list.",
    clear: "Clear",
    open: "Open",
  },
  ar: {
    country: "الدولة",
    city: "المدينة",
    area: "المنطقة",
    street: "الشارع",
    building: "المبنى",
    floor: "الطابق",
    apartment: "الشقة",
    landmark: "أقرب معلم",
    postalCode: "الرمز البريدي",
    phone: "الهاتف",
    selectCountry: "اختر الدولة",
    selectCity: "اختر المدينة",
    selectArea: "اختر المنطقة",
    empty: "لا توجد نتائج.",
    loading: "جارٍ التحميل...",
    loadError: "تعذر تحميل القائمة.",
    clear: "مسح",
    open: "فتح",
  },
};

interface Option {
  value: number;
  label: string;
  search: string;
  iso?: string;
}
type Status = "idle" | "loading" | "ready" | "error";

let defaultSource: LocationsDataSource | undefined;
const getDefaultSource = () => (defaultSource ??= createHubLocationsDataSource());

const nasaq = useNasaq();
const locale = computed(() => props.locale ?? nasaq.locale.value ?? "en");
const dir = computed(() => props.dir ?? (locale.value.startsWith("ar") ? "rtl" : (nasaq.direction.value ?? "ltr")));
const lang = computed<"en" | "ar">(() => (locale.value.split("-")[0] === "ar" ? "ar" : "en"));
const t = computed<AddressInputLabels>(() => ({ ...STRINGS[lang.value], ...props.labels }));
const source = computed(() => props.dataSource ?? getDefaultSource());

const inner = ref<Address>(props.defaultValue ?? { street: "" });
const address = computed<Address>(() => props.modelValue ?? inner.value);

const TEXT_KEYS = ["building", "floor", "apartment", "landmark", "postal_code"] as const;
function update(patch: Partial<Address>) {
  const next: Address = { ...address.value, ...patch };
  for (const k of [...TEXT_KEYS, "phone"] as const) if (next[k] === "" || next[k] === undefined) delete next[k];
  for (const k of ["country_id", "city_id", "area_id"] as const) if (next[k] === undefined) delete next[k];
  inner.value = next;
  emit("update:modelValue", next);
  emit("valueChange", next);
}

/** Load a list that depends on `key`; stays `idle` (and empty) until `key` is set. */
function useList<T>(key: () => number | undefined, load: (key: number) => Promise<T[]>) {
  const state = ref<{ status: Status; items: T[] }>({ status: "idle", items: [] });
  watch(
    [key, source],
    ([k], _old, onCleanup) => {
      if (k === undefined) {
        state.value = { status: "idle", items: [] };
        return;
      }
      let live = true;
      onCleanup(() => (live = false));
      state.value = { status: "loading", items: [] };
      load(k).then(
        (items) => live && (state.value = { status: "ready", items }),
        () => live && (state.value = { status: "error", items: [] }),
      );
    },
    { immediate: true },
  );
  return state;
}
const countries = useList<LocationCountry>(
  () => 0,
  () => source.value.countries(),
);
const cities = useList<LocationCity>(
  () => address.value.country_id,
  (id) => source.value.cities(id),
);
const areas = useList<LocationArea>(
  () => address.value.city_id,
  (id) => source.value.areas(id),
);

const toOptions = <T extends { id: number; name_en: string; name_ar: string }>(list: T[]): Option[] =>
  list.map((p) => ({ value: p.id, label: placeName(p, lang.value), search: `${p.name_en} ${p.name_ar}`, iso: (p as unknown as LocationCountry).iso2 }));
const countryOptions = computed(() => toOptions(countries.value.items));
const cityOptions = computed(() => toOptions(cities.value.items));
const areaOptions = computed(() => toOptions(areas.value.items));

interface TextField {
  key: (typeof TEXT_KEYS)[number];
  label: string;
  ltr?: boolean;
  autocomplete?: string;
}
const texts = computed<TextField[]>(() => [
  { key: "building", label: t.value.building },
  { key: "floor", label: t.value.floor },
  { key: "apartment", label: t.value.apartment },
  { key: "postal_code", label: t.value.postalCode, ltr: true, autocomplete: "postal-code" },
]);
const textOf = (key: (typeof TEXT_KEYS)[number]) => address.value[key] ?? "";
</script>

<template>
  <div
    data-slot="address-input"
    :dir="dir"
    :lang="locale"
    :data-invalid="props.invalid ? '' : undefined"
    :class="cn('grid gap-3 sm:grid-cols-2', props.class)"
  >
    <NqAddressPlaceSelect
      slot-name="address-input-country"
      :label="t.country"
      :placeholder="t.selectCountry"
      :options="countryOptions"
      :value="address.country_id"
      :disabled="props.disabled"
      :invalid="props.invalid"
      :status="countries.status"
      :t="t"
      :dir="dir"
      flags
      @change="(id) => update({ country_id: id, city_id: undefined, area_id: undefined })"
    />
    <NqAddressPlaceSelect
      slot-name="address-input-city"
      :label="t.city"
      :placeholder="t.selectCity"
      :options="cityOptions"
      :value="address.city_id"
      :disabled="props.disabled || address.country_id === undefined"
      :invalid="props.invalid"
      :status="cities.status"
      :t="t"
      :dir="dir"
      @change="(id) => update({ city_id: id, area_id: undefined })"
    />
    <NqAddressPlaceSelect
      slot-name="address-input-area"
      :label="t.area"
      :placeholder="t.selectArea"
      :options="areaOptions"
      :value="address.area_id"
      :disabled="props.disabled || address.city_id === undefined"
      :invalid="props.invalid"
      :status="areas.status"
      :t="t"
      :dir="dir"
      @change="(id) => update({ area_id: id })"
    />
    <NqField data-slot="address-input-street" :disabled="props.disabled" :invalid="props.invalid" class="sm:col-span-2">
      <NqFieldLabel>{{ t.street }}</NqFieldLabel>
      <NqInput autocomplete="address-line1" :disabled="props.disabled" :model-value="address.street" @update:model-value="(v) => update({ street: String(v ?? '') })" />
    </NqField>
    <NqField v-for="f in texts" :key="f.key" :data-slot="`address-input-${f.key.replace('_', '-')}`" :disabled="props.disabled">
      <NqFieldLabel>{{ f.label }}</NqFieldLabel>
      <NqInput
        :ltr="f.ltr"
        :autocomplete="f.autocomplete"
        :disabled="props.disabled"
        :model-value="textOf(f.key)"
        @update:model-value="(v) => update({ [f.key]: String(v ?? '') })"
      />
    </NqField>
    <div class="sm:col-span-2">
      <NqField data-slot="address-input-landmark" :disabled="props.disabled">
        <NqFieldLabel>{{ t.landmark }}</NqFieldLabel>
        <NqInput :disabled="props.disabled" :model-value="textOf('landmark')" @update:model-value="(v) => update({ landmark: String(v ?? '') })" />
      </NqField>
    </div>
    <NqField v-if="props.showPhone" data-slot="address-input-phone" :disabled="props.disabled" class="sm:col-span-2">
      <NqFieldLabel>{{ t.phone }}</NqFieldLabel>
      <NqPhoneInput
        :model-value="address.phone ?? ''"
        :disabled="props.disabled"
        :invalid="props.invalid"
        :locale="locale"
        :dir="dir"
        :aria-label="t.phone"
        @update:model-value="(phone) => update({ phone })"
      />
    </NqField>
  </div>
</template>
