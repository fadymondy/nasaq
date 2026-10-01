<script setup lang="ts">
import { CalendarDays } from "lucide-vue-next";
import { computed, inject, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqCalendar, type DateRange, type WeekDay } from "../calendar";
import { FIELD } from "../field/context";
import { formatDate, formatDateRange, type FormatDateOptions } from "../numeric";
import { NqPopover, NqPopoverContent } from "../popover";
import { dateStrings, isoDate, pickerPopupClass, useWide } from "./date-picker-logic";
import NqPickerTrigger from "./NqPickerTrigger.vue";

// <NqDateRangePicker v-model="range" />
// An input-looking button that opens a range NqCalendar in a popover. Closes when both ends are chosen.
interface Props {
  /** Controlled value (v-model): `{ from, to }`. */
  modelValue?: DateRange;
  defaultValue?: DateRange;
  /** Force one or two months. Default: two from 640px wide, else one. */
  numberOfMonths?: 1 | 2;
  /** Text shown when nothing is picked. Localised for English and Arabic by default. */
  placeholder?: string;
  disabled?: boolean;
  /** Earliest / latest pickable day. */
  min?: Date;
  max?: Date;
  /** Days that cannot be picked. */
  disabledDates?: Date[] | ((date: Date) => boolean);
  weekStartsOn?: WeekDay;
  locale?: string;
  dir?: "ltr" | "rtl";
  /** Intl calendar for the labels, e.g. "islamic-umalqura". */
  calendar?: string;
  /** Intl options for the trigger text. Default `{ dateStyle: "medium" }`. */
  format?: FormatDateOptions;
  /** Form field name: hidden inputs `name-from` and `name-to` carry the ISO dates (YYYY-MM-DD). */
  name?: string;
  id?: string;
  /** Accessible name of the popup. */
  popupLabel?: string;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: undefined,
  numberOfMonths: undefined,
  placeholder: undefined,
  disabled: undefined,
  min: undefined,
  max: undefined,
  disabledDates: undefined,
  weekStartsOn: undefined,
  locale: undefined,
  dir: undefined,
  calendar: undefined,
  format: undefined,
});
const emit = defineEmits<{ "update:modelValue": [value: DateRange] }>();

const nq = useNasaq();
const field = inject(FIELD, null);
const wide = useWide();
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (nq.isRtl.value ? "rtl" : "ltr"));
const t = computed(() => dateStrings(locale.value));
const inner = ref<DateRange>(props.defaultValue ?? { from: null, to: null });
const value = computed<DateRange>(() => props.modelValue ?? inner.value);
const open = ref(false);
const label = computed(() => {
  const options: FormatDateOptions = { dateStyle: "medium", ...(props.calendar ? { calendar: props.calendar } : {}), ...props.format };
  const { from, to } = value.value;
  if (!from) return null;
  return to ? formatDateRange(from, to, locale.value, options) : `${formatDate(from, locale.value, options)} –`;
});
const fieldName = computed(() => props.name ?? field?.name.value);

function onPick(next: unknown) {
  const range = next as DateRange;
  inner.value = range;
  emit("update:modelValue", range);
  if (range.from && range.to) open.value = false;
}
</script>

<template>
  <NqPopover v-model:open="open">
    <NqPickerTrigger
      :id="props.id"
      :disabled="props.disabled"
      :aria-label="props.ariaLabel"
      :class="props.class"
      :label="label"
      :placeholder="props.placeholder ?? t.pickRange"
      :icon="CalendarDays"
    />
    <template v-if="fieldName">
      <input type="hidden" :name="`${fieldName}-from`" :value="value.from ? isoDate(value.from) : ''" />
      <input type="hidden" :name="`${fieldName}-to`" :value="value.to ? isoDate(value.to) : ''" />
    </template>
    <NqPopoverContent align="start" :dir="dir" :lang="locale" :aria-label="props.popupLabel ?? t.chooseDate" :class="pickerPopupClass">
      <NqCalendar
        mode="range"
        auto-focus
        :number-of-months="props.numberOfMonths ?? (wide ? 2 : 1)"
        :model-value="value"
        :min="props.min"
        :max="props.max"
        :disabled="props.disabledDates"
        :week-starts-on="props.weekStartsOn"
        :locale="locale"
        :dir="dir"
        :calendar="props.calendar"
        @update:model-value="onPick"
      />
    </NqPopoverContent>
  </NqPopover>
</template>
