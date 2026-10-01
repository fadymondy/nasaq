<script setup lang="ts">
import { Clock } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { useFieldControl } from "../field/context";
import { formatNumber } from "../numeric";
import { dateStrings, dayPeriods, segmentClass } from "./date-picker-logic";

// <NqTimePicker v-model="time" :minute-step="15" />
// Hour, minute (and AM/PM) selects. The hour select is the NqField control. The value is a 24-hour "HH:mm" string.
interface Props {
  /** "HH:mm" in 24-hour form, or null/"" for empty (v-model). */
  modelValue?: string | null;
  defaultValue?: string | null;
  /** 12 or 24 hour display. Default: what the locale uses. */
  hourCycle?: 12 | 24;
  /** Minutes between options. Default 1. */
  minuteStep?: number;
  disabled?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  name?: string;
  id?: string;
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { modelValue: undefined, defaultValue: null, hourCycle: undefined, minuteStep: 1, disabled: undefined });
const emit = defineEmits<{ "update:modelValue": [value: string | null] }>();

const nq = useNasaq();
const field = useFieldControl(() => props.id);
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (nq.isRtl.value ? "rtl" : "ltr"));
const t = computed(() => dateStrings(locale.value));
const inner = ref<string | null>(props.defaultValue);
const value = computed(() => (props.modelValue !== undefined ? props.modelValue : inner.value));
const isDisabled = computed(() => props.disabled ?? field.disabled.value);

const cycle = computed<12 | 24>(() => {
  if (props.hourCycle) return props.hourCycle;
  const localeCycle = new Intl.DateTimeFormat(locale.value, { hour: "numeric" }).resolvedOptions().hourCycle;
  return localeCycle === "h23" || localeCycle === "h24" ? 24 : 12;
});
const parts = computed(() => (value.value ? value.value.split(":").map(Number) : [null, null]));
const hour24 = computed<number | null>(() => parts.value[0] ?? null);
const minute = computed<number | null>(() => parts.value[1] ?? null);
const isPm = computed(() => hour24.value !== null && hour24.value >= 12);
const periods = computed(() => dayPeriods(locale.value));
const two = (n: number) => formatNumber(n, locale.value, { minimumIntegerDigits: 2 });
const hours = computed(() => (cycle.value === 12 ? Array.from({ length: 12 }, (_, i) => (i === 0 ? 12 : i)) : Array.from({ length: 24 }, (_, i) => i)));
const shownHour = computed(() => (hour24.value === null ? "" : String(cycle.value === 12 ? hour24.value % 12 || 12 : hour24.value)));
const minutes = computed(() => Array.from({ length: Math.ceil(60 / props.minuteStep) }, (_, i) => i * props.minuteStep));
const hourNumber = (n: number) => (cycle.value === 12 ? formatNumber(n, locale.value) : two(n));

function emitTime(h: number | null, m: number | null, pmFlag: boolean) {
  // A half-filled time is kept as 00 for the missing segment, so the value is always valid.
  let hour = h ?? 0;
  if (cycle.value === 12) hour = (hour % 12) + (pmFlag ? 12 : 0);
  const next = `${String(hour).padStart(2, "0")}:${String(m ?? 0).padStart(2, "0")}`;
  inner.value = next;
  emit("update:modelValue", next);
}

// Each select is a v-model on a computed: the shown segment in, the emitted "HH:mm" out.
const hourModel = computed({ get: () => shownHour.value, set: (v: string) => emitTime(Number(v), minute.value, isPm.value) });
const minuteModel = computed({ get: () => (minute.value === null ? "" : String(minute.value)), set: (v: string) => emitTime(hour24.value, Number(v), isPm.value) });
const periodModel = computed({ get: () => (isPm.value ? "pm" : "am"), set: (v: string) => emitTime(hour24.value, minute.value, v === "pm") });
const fieldName = computed(() => props.name);
</script>

<template>
  <div role="group" :aria-label="props.ariaLabel" :dir="dir" :lang="locale" data-slot="time-picker" :class="cn('inline-flex items-center gap-1.5', props.class)">
    <select
      v-model="hourModel"
      :id="field.id.value"
      :disabled="isDisabled || undefined"
      :aria-label="t.hour"
      :aria-describedby="field.describedBy.value"
      :aria-invalid="field.invalid.value || undefined"
      :data-invalid="field.invalid.value ? '' : undefined"
      data-slot="time-picker-hour"
      :class="cn(segmentClass)"
    >
      <option value="" disabled hidden>--</option>
      <option v-for="n in hours" :key="n" :value="String(n)">{{ hourNumber(n) }}</option>
    </select>
    <span aria-hidden="true" class="text-muted-foreground">:</span>
    <select v-model="minuteModel" :aria-label="t.minute" :disabled="isDisabled || undefined" data-slot="time-picker-minute" :class="cn(segmentClass)">
      <option value="" disabled hidden>--</option>
      <option v-for="n in minutes" :key="n" :value="String(n)">{{ two(n) }}</option>
    </select>
    <select v-if="cycle === 12" v-model="periodModel" :aria-label="t.period" :disabled="isDisabled || undefined" data-slot="time-picker-period" :class="cn(segmentClass)">
      <option value="am">{{ periods[0] }}</option>
      <option value="pm">{{ periods[1] }}</option>
    </select>
    <input v-if="fieldName" type="hidden" :name="fieldName" :value="value ?? ''" />
    <Clock aria-hidden="true" class="ms-1 size-4 shrink-0 text-muted-foreground" />
  </div>
</template>
