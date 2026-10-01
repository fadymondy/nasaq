<script setup lang="ts">
import { ChevronsUpDown } from "lucide-vue-next";
import { ComboboxAnchor, ComboboxContent, ComboboxInput, ComboboxPortal, ComboboxTrigger } from "reka-ui";
import { computed, nextTick, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCombobox, NqComboboxEmpty, NqComboboxItem, NqComboboxList } from "../combobox";
import { normalizeForSearch } from "../commands";
import { NqCountryFlag } from "../country-flag";
import { NqInputGroup, NqInputGroupInput } from "../input-group";
import { formatE164, formatNational, parsePhone, parsePhoneLenient, PHONE_COUNTRIES, PHONE_PREFERRED, phoneExample, toDigits, type PhoneCountry } from "./phone-data";

// Phone number input: a country combobox (flag, dial code, name; Gulf and Arab countries first) and a digits field,
// joined in one bordered group. The value is E.164 ("+966501234567", "" when empty).
interface Props {
  /** E.164 value: `+966501234567`, or "". A local number such as `0591234567` is kept as national digits of `defaultCountry`. Use `v-model`. */
  modelValue?: string;
  defaultValue?: string;
  /** ISO code selected when there is no value. Default "SA". */
  defaultCountry?: string;
  /** Replace the country list. Default `PHONE_COUNTRIES`. */
  countries?: readonly PhoneCountry[];
  /** ISO codes listed first. Default SA, AE, EG, KW, QA, BH, OM, JO. */
  preferred?: readonly string[];
  disabled?: boolean;
  invalid?: boolean;
  /** Form field name: a hidden input carries the E.164 value. */
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
  defaultCountry: "SA",
  countries: () => PHONE_COUNTRIES,
  preferred: () => PHONE_PREFERRED,
  name: undefined,
  id: undefined,
  placeholder: undefined,
  ariaLabel: undefined,
  locale: undefined,
  dir: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: string];
  /** The E.164 value and the selected country, on every change. */
  change: [value: string, country: PhoneCountry];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const STRINGS = {
  en: { country: "Country", search: "Search countries", empty: "No country found.", placeholder: "Phone number" },
  ar: { country: "الدولة", search: "ابحث عن دولة", empty: "لا توجد دولة مطابقة.", placeholder: "رقم الهاتف" },
} as const;
const MAX_DIGITS = 15;

interface Item {
  value: string;
  label: string;
  country: PhoneCountry;
  search: string;
}

const nasaq = useNasaq();
const locale = computed(() => props.locale ?? nasaq.locale.value ?? "en");
const dir = computed(() => props.dir ?? (locale.value.startsWith("ar") ? "rtl" : (nasaq.direction.value ?? "ltr")));
const lang = computed<"en" | "ar">(() => (locale.value.split("-")[0] === "ar" ? "ar" : "en"));
const t = computed(() => STRINGS[lang.value]);

const items = computed<Item[]>(() => {
  const toItem = (c: PhoneCountry): Item => ({ value: c.iso, label: c[lang.value], country: c, search: `${c.en} ${c.ar} ${c.iso} +${c.dial} ${c.dial}` });
  const first = props.preferred.map((iso) => props.countries.find((c) => c.iso === iso)).filter((c): c is PhoneCountry => !!c);
  const rest = props.countries.filter((c) => !props.preferred.includes(c.iso)).sort((a, b) => a[lang.value].localeCompare(b[lang.value], locale.value));
  return [...first, ...rest].map(toItem);
});
const query = ref("");
const matches = computed(() => {
  const q = normalizeForSearch(query.value.replace(/^\+/, ""));
  return q ? items.value.filter((i) => normalizeForSearch(i.search).includes(q)) : items.value;
});

const initial = parsePhoneLenient(props.modelValue ?? props.defaultValue, props.countries, props.defaultCountry);
const fallback = props.countries.find((c) => c.iso === props.defaultCountry) ?? props.countries[0]!;
const country = ref<PhoneCountry>(initial?.country ?? fallback);
const national = ref(initial?.national ?? "");
const e164 = computed(() => formatE164(country.value, national.value));
const shown = computed(() => formatNational(country.value, national.value));
const selected = computed(() => items.value.find((i) => i.value === country.value.iso));
const hint = computed(() => props.placeholder ?? (phoneExample(country.value) || t.value.placeholder));

// A controlled value that differs from what is shown (reset, load from the server) replaces the state.
watch(
  () => props.modelValue,
  (value) => {
    if (value === undefined || value === e164.value) return;
    const parsed = parsePhoneLenient(value, props.countries, props.defaultCountry);
    if (parsed) {
      country.value = parsed.country;
      national.value = parsed.national;
    } else if (value === "") national.value = "";
  },
);

function emitValue(c: PhoneCountry, n: string) {
  country.value = c;
  national.value = n;
  const value = formatE164(c, n);
  emit("update:modelValue", value);
  emit("change", value, c);
}

const digits = ref<{ $el: HTMLInputElement } | null>(null);
function onDigits(text: string) {
  // A pasted or autofilled "+9665…" picks the country from its calling code.
  if (text.trim().startsWith("+")) {
    const parsed = parsePhone(text, props.countries);
    if (parsed) return emitValue(parsed.country, parsed.national.slice(0, MAX_DIGITS - parsed.country.dial.length));
  }
  emitValue(country.value, toDigits(text).slice(0, MAX_DIGITS - country.value.dial.length));
}
// Grouping adds spaces as you type; keep the caret after the same digit instead of jumping to the end.
function onInput(e: Event) {
  const el = e.target as HTMLInputElement;
  const end = el.selectionStart ?? el.value.length;
  const want = end >= el.value.length ? null : toDigits(el.value.slice(0, end)).length;
  onDigits(el.value);
  void nextTick(() => {
    if (el.value !== shown.value) el.value = shown.value;
    if (want === null || document.activeElement !== el) return;
    let pos = 0;
    for (let seen = 0; pos < shown.value.length && seen < want; pos++) if (/\d/.test(shown.value[pos]!)) seen++;
    el.setSelectionRange(pos, pos);
  });
}
function onPick(next: unknown) {
  const item = next as Item | undefined;
  if (!item) return;
  emitValue(item.country, national.value);
  void nextTick(() => digits.value?.$el.focus());
}
function onOpen(open: boolean) {
  if (!open) query.value = "";
}
</script>

<template>
  <NqCombobox
    :model-value="selected"
    :items="matches"
    :filter="null"
    :disabled="props.disabled"
    :dir="dir"
    class="block w-full min-w-0"
    @update:model-value="onPick"
    @update:open="onOpen"
  >
    <ComboboxAnchor as-child>
      <NqInputGroup data-slot="phone-input" :data-invalid="props.invalid ? '' : undefined" :class="props.class">
        <ComboboxTrigger
          data-slot="phone-input-country"
          :aria-label="`${t.country}: ${country[lang]} +${country.dial}`"
          :class="
            cn(
              'order-first flex h-full shrink-0 cursor-default items-center gap-1.5 border-e border-input ps-3 pe-2 text-body-sm text-foreground outline-none',
              'transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:bg-nq-hover data-[state=open]:bg-nq-hover',
              'disabled:cursor-not-allowed',
            )
          "
        >
          <NqCountryFlag :code="country.iso" class="text-[1.125rem]" />
          <bdi dir="ltr" class="tabular-nums">+{{ country.dial }}</bdi>
          <ChevronsUpDown aria-hidden="true" class="size-3.5 text-muted-foreground" />
        </ComboboxTrigger>
        <NqInputGroupInput
          :id="props.id"
          ref="digits"
          ltr
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          :disabled="props.disabled"
          :aria-label="props.ariaLabel"
          :aria-invalid="props.invalid || undefined"
          :placeholder="hint"
          :model-value="shown"
          @input="onInput"
          @focus="emit('focus', $event)"
          @blur="emit('blur', $event)"
        />
        <input v-if="props.name" type="hidden" :name="props.name" :value="e164" />
      </NqInputGroup>
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent
        data-slot="phone-input-content"
        position="popper"
        side="bottom"
        align="start"
        :side-offset="4"
        :dir="dir"
        :lang="locale"
        :style="{ '--anchor-width': 'var(--reka-popper-anchor-width)', '--available-width': 'var(--reka-popper-available-width)' }"
        class="z-50 w-[max(var(--anchor-width),18rem)] max-w-[var(--available-width)] overflow-hidden rounded-floating border border-border bg-popover text-popover-foreground shadow-floating outline-none transition-opacity duration-150 ease-nq data-starting-style:opacity-0 data-ending-style:opacity-0"
      >
        <div class="border-b border-border p-1.5">
          <ComboboxInput
            data-slot="phone-input-search"
            :aria-label="t.search"
            :placeholder="t.search"
            :display-value="() => ''"
            class="h-control-sm w-full min-w-0 rounded-control border-0 bg-transparent px-2 text-body text-foreground outline-none placeholder:text-muted-foreground pointer-coarse:text-[16px]"
            @input="query = ($event.target as HTMLInputElement).value"
          />
        </div>
        <div class="max-h-64 overflow-y-auto p-1.5">
          <NqComboboxList v-slot="{ items: list }">
            <NqComboboxItem v-for="item in (list as Item[])" :key="item.value" :value="item" :text-value="item.search">
              <span class="flex items-center gap-2">
                <NqCountryFlag :code="item.country.iso" class="text-[1rem]" />
                <span class="min-w-0 flex-1 truncate">{{ item.label }}</span>
                <bdi dir="ltr" class="shrink-0 text-muted-foreground tabular-nums">+{{ item.country.dial }}</bdi>
              </span>
            </NqComboboxItem>
          </NqComboboxList>
          <NqComboboxEmpty>{{ t.empty }}</NqComboboxEmpty>
        </div>
      </ComboboxContent>
    </ComboboxPortal>
  </NqCombobox>
</template>
