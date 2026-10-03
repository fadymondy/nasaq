<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { placeName, type LocationCountry, type LocationsDataSource } from "../address-input/locations-data";
import { NqCombobox, NqComboboxContent, NqComboboxEmpty, NqComboboxInput, NqComboboxItem, NqComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { NqCountryFlag } from "../country-flag";
import { PHONE_COUNTRIES, type PhoneCountry } from "../phone-input";

// Searchable country combobox with SVG flags and names in English or Arabic. The value is the ISO 3166-1 alpha-2 code.
interface Props {
  /** ISO 3166-1 alpha-2 code ("SA"), or "" for none. Use `v-model`. */
  modelValue?: string;
  defaultValue?: string;
  /** The list to offer. Default `PHONE_COUNTRIES`. Ignored when `dataSource` is set. */
  countries?: readonly PhoneCountry[];
  /** Load countries from a locations source instead (hub, or your own). Items need an `iso2`. */
  dataSource?: LocationsDataSource;
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the ISO code. */
  name?: string;
  id?: string;
  placeholder?: string;
  ariaLabel?: string;
  locale?: string;
  dir?: "ltr" | "rtl";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: "",
  countries: () => PHONE_COUNTRIES,
  dataSource: undefined,
  name: undefined,
  id: undefined,
  placeholder: undefined,
  ariaLabel: undefined,
  locale: undefined,
  dir: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [iso: string];
  /** The ISO code ("" when cleared), on every change. */
  valueChange: [iso: string];
}>();

const STRINGS = {
  en: { placeholder: "Select a country", empty: "No country found.", loading: "Loading...", clear: "Clear", open: "Open" },
  ar: { placeholder: "اختر الدولة", empty: "لا توجد دولة مطابقة.", loading: "جارٍ التحميل...", clear: "مسح", open: "فتح" },
} as const;

interface Option {
  value: string;
  label: string;
  search: string;
}

const nasaq = useNasaq();
const locale = computed(() => props.locale ?? nasaq.locale.value ?? "en");
const dir = computed(() => props.dir ?? (locale.value.startsWith("ar") ? "rtl" : (nasaq.direction.value ?? "ltr")));
const lang = computed<"en" | "ar">(() => (locale.value.split("-")[0] === "ar" ? "ar" : "en"));
const t = computed(() => STRINGS[lang.value]);

const inner = ref(props.defaultValue);
const iso = computed(() => (props.modelValue ?? inner.value).toUpperCase());

const remote = ref<LocationCountry[] | null>(null);
watch(
  () => props.dataSource,
  (source, _old, onCleanup) => {
    remote.value = null;
    if (!source) return;
    let live = true;
    onCleanup(() => (live = false));
    source.countries().then(
      (list) => live && (remote.value = list),
      () => live && (remote.value = []),
    );
  },
  { immediate: true },
);

const fromPhone = (c: PhoneCountry): LocationCountry => ({ id: 0, iso2: c.iso, name_en: c.en, name_ar: c.ar });
const items = computed<Option[]>(() => {
  const list = props.dataSource ? (remote.value ?? []) : props.countries.map(fromPhone);
  return list
    .filter((c) => c.iso2)
    .map((c) => ({ value: c.iso2.toUpperCase(), label: placeName(c, lang.value), search: `${c.name_en} ${c.name_ar} ${c.iso2}` }))
    .sort((a, b) => a.label.localeCompare(b.label, locale.value));
});
const selected = computed(() => items.value.find((i) => i.value === iso.value) ?? null);

const match = (item: unknown, query: string) => normalizeForSearch((item as Option).search).includes(normalizeForSearch(query));
function onPick(next: unknown) {
  const code = (next as Option | null | undefined)?.value ?? "";
  inner.value = code;
  emit("update:modelValue", code);
  emit("valueChange", code);
}
</script>

<template>
  <div data-slot="country-select" :class="cn('contents', props.class)">
    <NqCombobox
      :items="items"
      :model-value="selected"
      :filter="match"
      :disabled="props.disabled"
      :dir="dir"
      @update:model-value="onPick"
    >
      <NqComboboxInput
        :id="props.id"
        :aria-label="props.ariaLabel"
        :invalid="props.invalid"
        :placeholder="props.placeholder ?? t.placeholder"
        :clear-label="t.clear"
        :trigger-label="t.open"
      />
      <NqComboboxContent>
        <NqComboboxList v-slot="{ items: list }">
          <NqComboboxItem v-for="item in (list as Option[])" :key="item.value" :value="item" :text-value="item.search">
            <span class="flex items-center gap-2">
              <NqCountryFlag :code="item.value" class="text-[1rem]" />
              <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
            </span>
          </NqComboboxItem>
        </NqComboboxList>
        <NqComboboxEmpty>{{ props.dataSource && remote === null ? t.loading : t.empty }}</NqComboboxEmpty>
      </NqComboboxContent>
    </NqCombobox>
    <input v-if="props.name" type="hidden" :name="props.name" :value="iso" />
  </div>
</template>
