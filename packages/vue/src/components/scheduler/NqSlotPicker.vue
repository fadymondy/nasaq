<script lang="ts">
export interface SchedulerSlot {
  start: Date;
  end?: Date;
  disabled?: boolean;
}
</script>

<script setup lang="ts">
import { RadioGroupItem } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqCalendar } from "../calendar";
import { compareDays, isSameDay, startOfDay, type WeekDay } from "../calendar/calendar-math";
import { formatDate } from "../numeric";
import { NqRadioGroup } from "../radio-group";
import { SCHEDULER_STRINGS } from "./NqScheduler.vue";

// A booking picker: a Calendar (days with no free slot are disabled) beside a radio group of the chosen
// day's times. Arrow keys move and select inside the list; Tab leaves it.
export interface Props {
  /** The bookable times, across any number of days. */
  slots: SchedulerSlot[];
  defaultValue?: Date | null;
  defaultDay?: Date;
  weekStartsOn?: WeekDay;
  /** Force 12 or 24 hour time. Defaults to the locale's format. */
  hour12?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  today?: Date;
  /** Text when the chosen day has no slots. */
  emptyLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultValue: null, defaultDay: undefined, weekStartsOn: undefined, hour12: undefined, locale: undefined, dir: undefined, today: undefined, emptyLabel: undefined });
/** `v-model`: the selected slot's start. */
const model = defineModel<Date | null>();
/** `v-model:day`: the day whose slots are listed. */
const dayModel = defineModel<Date>("day");

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (RTL_LANGS.has(locale.value.split("-")[0] ?? "en") ? "rtl" : "ltr"));
const t = computed(() => SCHEDULER_STRINGS[locale.value.split("-")[0] === "ar" ? "ar" : "en"]);
const today = computed(() => startOfDay(props.today ?? new Date()));
const open = computed(() => props.slots.filter((s) => !s.disabled));
const firstOpen = computed(() => open.value.map((s) => startOfDay(s.start)).sort((a, b) => a.getTime() - b.getTime())[0]);

const innerValue = ref<Date | null>(props.defaultValue);
const value = computed(() => (model.value !== undefined ? model.value : innerValue.value));
const innerDay = ref<Date>(startOfDay(props.defaultDay ?? value.value ?? firstOpen.value ?? today.value));
const day = computed(() => dayModel.value ?? innerDay.value);
function setDay(next: Date) {
  innerDay.value = next;
  dayModel.value = next;
}

const daySlots = computed(() => props.slots.filter((s) => isSameDay(s.start, day.value)).sort((a, b) => a.start.getTime() - b.start.getTime()));
const dayLabel = computed(() => formatDate(day.value, locale.value, { dateStyle: "full" }));
const fmtTime = (d: Date) => formatDate(d, locale.value, { hour: "numeric", minute: "2-digit", ...(props.hour12 === undefined ? {} : { hour12: props.hour12 }) });
const current = computed(() => (value.value && isSameDay(value.value, day.value) ? String(value.value.getTime()) : undefined));
function onPick(v: string) {
  const chosen = daySlots.value.find((s) => String(s.start.getTime()) === v);
  if (!chosen) return;
  innerValue.value = chosen.start;
  model.value = chosen.start;
}
const isDisabled = (d: Date) => compareDays(d, today.value) < 0 || !open.value.some((s) => isSameDay(s.start, d));
</script>

<template>
  <div data-slot="slot-picker" :dir="dir" :lang="locale" :class="cn('flex flex-col gap-4 sm:flex-row', props.class)">
    <NqCalendar
      :model-value="day"
      :locale="locale"
      :dir="dir"
      :week-starts-on="props.weekStartsOn"
      :today="today"
      :disabled="isDisabled"
      @update:model-value="(d) => d instanceof Date && setDay(startOfDay(d))"
    />
    <div data-slot="slot-picker-times" class="flex min-w-48 flex-1 flex-col gap-2">
      <h3 aria-live="polite" class="text-label font-semibold"><bdi>{{ dayLabel }}</bdi></h3>
      <p v-if="daySlots.length === 0" class="text-body-sm text-muted-foreground">{{ props.emptyLabel ?? t.noSlots }}</p>
      <NqRadioGroup v-else :aria-label="t.slotsOn(dayLabel)" class="grid grid-cols-2 gap-2" :model-value="current" @update:model-value="onPick">
        <RadioGroupItem
          v-for="s in daySlots"
          :key="s.start.getTime()"
          :value="String(s.start.getTime())"
          :disabled="s.disabled"
          data-slot="slot-picker-slot"
          :data-checked="current === String(s.start.getTime()) ? '' : undefined"
          :data-unchecked="current === String(s.start.getTime()) ? undefined : ''"
          :aria-label="fmtTime(s.start)"
          :class="cn(
            'inline-flex h-control cursor-pointer items-center justify-center rounded-control border border-border bg-card px-3 text-label tabular-nums',
            'transition-colors duration-150 ease-nq hover:bg-nq-hover',
            'data-checked:border-primary data-checked:bg-nq-selected',
            'data-disabled:cursor-not-allowed data-disabled:opacity-50 data-disabled:line-through',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
          )"
        >
          <bdi>{{ fmtTime(s.start) }}</bdi>
        </RadioGroupItem>
      </NqRadioGroup>
    </div>
  </div>
</template>
