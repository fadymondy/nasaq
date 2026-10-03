<script setup lang="ts">
import { CalendarDays } from "lucide-vue-next";
import { computed, inject, ref, type HTMLAttributes } from "vue";
import { useNasaq } from "../../provider";
import { NqCalendar, type WeekDay } from "../calendar";
import { FIELD } from "../field/context";
import { formatDate, type FormatDateOptions } from "../numeric";
import { NqPopover, NqPopoverContent } from "../popover";
import { dateStrings, isoDate, pickerPopupClass } from "./date-picker-logic";
import NqPickerTrigger from "./NqPickerTrigger.vue";

// <NqDatePicker v-model="date" :min="new Date()" />
// An input-looking button that opens a NqCalendar in a popover. Closes on pick.
interface Props {
  /** Controlled value (v-model). */
  modelValue?: Date | null;
  defaultValue?: Date | null;
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
  /** Form field name: a hidden input carries the ISO date (YYYY-MM-DD). */
  name?: string;
  id?: string;
  /** Accessible name of the popup. */
  popupLabel?: string;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: null,
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
const emit = defineEmits<{ "update:modelValue": [value: Date | null] }>();

const nq = useNasaq();
const field = inject(FIELD, null);
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (nq.isRtl.value ? "rtl" : "ltr"));
const t = computed(() => dateStrings(locale.value));
const inner = ref<Date | null>(props.defaultValue);
const value = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const open = ref(false);
const label = computed(() =>
  value.value ? formatDate(value.value, locale.value, { dateStyle: "medium", ...(props.calendar ? { calendar: props.calendar } : {}), ...props.format }) : null,
);
const fieldName = computed(() => props.name ?? field?.name.value);

function onPick(next: unknown) {
  const date = (next as Date | null) ?? null;
  inner.value = date;
  emit("update:modelValue", date);
  open.value = false;
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
      :placeholder="props.placeholder ?? t.pickDate"
      :icon="CalendarDays"
    />
    <input v-if="fieldName" type="hidden" :name="fieldName" :value="value ? isoDate(value) : ''" />
    <NqPopoverContent align="start" :dir="dir" :lang="locale" :aria-label="props.popupLabel ?? t.chooseDate" :class="pickerPopupClass">
      <NqCalendar
        auto-focus
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
