<script lang="ts">
export interface DateRange {
  from: Date | null;
  to: Date | null;
}
</script>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, nextTick, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { formatDate, type FormatDateOptions } from "../numeric";
import {
  addDays,
  addMonths,
  clampDay,
  compareDays,
  dayKey,
  endOfWeek,
  getWeekStartsOn,
  isSameDay,
  isSameMonth,
  monthMatrix,
  startOfDay,
  startOfMonth,
  startOfWeek,
  weekOrder,
  type WeekDay,
} from "./calendar-math";

// A month grid for picking a day or a range. Native Date and Intl only: labels, week start and digits follow the
// active locale. Implements the ARIA grid keyboard pattern. `v-model` is a Date | null (single) or { from, to } (range).
export interface Props {
  mode?: "single" | "range";
  defaultValue?: Date | null | DateRange;
  defaultMonth?: Date;
  /** Months shown side by side. Outside days are hidden when more than one month is shown. */
  numberOfMonths?: 1 | 2;
  /** Earliest / latest selectable day. */
  min?: Date;
  max?: Date;
  /** Days that cannot be picked: a list of dates or a predicate. */
  disabled?: Date[] | ((date: Date) => boolean);
  /** Render the days of the neighbouring months that pad the first and last week. Default true. */
  showOutsideDays?: boolean;
  /** Always render six weeks so the grid keeps its height while the month changes. */
  fixedWeeks?: boolean;
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's first day of the week. */
  weekStartsOn?: WeekDay;
  /** BCP 47 locale. Defaults to the active NasaqProvider locale ("en" outside one). */
  locale?: string;
  /** Force a direction. Defaults to the direction of the locale. */
  dir?: "ltr" | "rtl";
  /** Intl calendar for the labels, e.g. "islamic-umalqura". Only the labels change; the grid stays Gregorian. */
  calendar?: string;
  /** Overrides "today" (for tests and stories). */
  today?: Date;
  /** Focus the selected (or today's) day on mount. */
  autoFocus?: boolean;
  previousMonthLabel?: string;
  nextMonthLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  mode: "single",
  defaultValue: undefined,
  defaultMonth: undefined,
  numberOfMonths: 1,
  min: undefined,
  max: undefined,
  disabled: undefined,
  showOutsideDays: true,
  fixedWeeks: false,
  weekStartsOn: undefined,
  locale: undefined,
  dir: undefined,
  calendar: undefined,
  today: undefined,
  autoFocus: false,
  previousMonthLabel: undefined,
  nextMonthLabel: undefined,
});
const model = defineModel<Date | null | DateRange>();
const monthModel = defineModel<Date>("month");

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const rtl = computed(() => (props.dir ? props.dir === "rtl" : RTL_LANGS.has(locale.value.split("-")[0] ?? "en")));
const strings = computed(() => (locale.value.startsWith("ar") ? { previous: "الشهر السابق", next: "الشهر التالي" } : { previous: "Previous month", next: "Next month" }));
const weekStartsOn = computed(() => props.weekStartsOn ?? getWeekStartsOn(locale.value));
const today = computed(() => startOfDay(props.today ?? new Date()));
const showOutside = computed(() => props.showOutsideDays && props.numberOfMonths === 1);
const isRange = computed(() => props.mode === "range");

const inner = ref<Date | null | DateRange>(props.defaultValue ?? (props.mode === "range" ? { from: null, to: null } : null));
const selection = computed(() => (model.value !== undefined ? model.value : inner.value));
const range = computed<DateRange | null>(() => (isRange.value ? ((selection.value as DateRange | null) ?? { from: null, to: null }) : null));
const single = computed(() => (isRange.value ? null : (selection.value as Date | null)));
const anchor = computed(() => single.value ?? range.value?.from ?? today.value);

const innerMonth = ref(startOfMonth(props.defaultMonth ?? clampDay(anchor.value, props.min, props.max)));
const month = computed(() => (monthModel.value ? startOfMonth(monthModel.value) : innerMonth.value));
const setMonth = (next: Date) => {
  const m = startOfMonth(next);
  const changed = !isSameMonth(m, month.value);
  innerMonth.value = m;
  if (changed) monthModel.value = m;
};

const focusDate = ref<Date>(clampDay(anchor.value, props.min, props.max));
const hover = ref<Date | null>(null);
const root = ref<HTMLElement>();

const months = computed(() => Array.from({ length: props.numberOfMonths }, (_, i) => addMonths(month.value, i)));
const lastDay = computed(() => {
  const last = months.value[months.value.length - 1] as Date;
  return new Date(last.getFullYear(), last.getMonth() + 1, 0);
});
const inView = (d: Date) => compareDays(d, month.value) >= 0 && compareDays(d, lastDay.value) <= 0;
// The one tabbable day: the focused day while it is on screen, else the first of the first month.
const tabDate = computed(() => (inView(focusDate.value) ? focusDate.value : clampDay(month.value, props.min, props.max)));

const focusDay = async (d: Date) => {
  await nextTick();
  root.value?.querySelector<HTMLElement>(`[data-date="${dayKey(d)}"]`)?.focus();
};
onMounted(() => {
  if (props.autoFocus) void focusDay(tabDate.value);
});

const isDisabled = (d: Date) => {
  if ((props.min && compareDays(d, props.min) < 0) || (props.max && compareDays(d, props.max) > 0)) return true;
  if (Array.isArray(props.disabled)) return props.disabled.some((x) => isSameDay(x, d));
  return props.disabled ? props.disabled(d) : false;
};

const commit = (next: Date | null | DateRange) => {
  inner.value = next;
  model.value = next;
};

const pick = (d: Date) => {
  if (isDisabled(d)) return;
  focusDate.value = d;
  if (!inView(d)) setMonth(d);
  if (range.value) {
    const { from, to } = range.value;
    if (!from || to) commit({ from: d, to: null });
    else commit(compareDays(d, from) < 0 ? { from: d, to: from } : { from, to: d });
  } else {
    commit(single.value && isSameDay(single.value, d) ? null : d);
  }
};

const moveFocus = (target: Date) => {
  const next = clampDay(target, props.min, props.max);
  focusDate.value = next;
  if (compareDays(next, month.value) < 0) setMonth(next);
  else if (!inView(next)) setMonth(addMonths(startOfMonth(next), -(props.numberOfMonths - 1)));
  void focusDay(next);
};

const onKeydown = (event: KeyboardEvent) => {
  if (event.defaultPrevented || !(event.target as HTMLElement).closest("[data-date]")) return;
  // Arrow keys are physical: in RTL, ArrowLeft is the next day.
  const step = rtl.value ? -1 : 1;
  const from = tabDate.value;
  const moves: Record<string, Date> = {
    ArrowRight: addDays(from, step),
    ArrowLeft: addDays(from, -step),
    ArrowDown: addDays(from, 7),
    ArrowUp: addDays(from, -7),
    Home: startOfWeek(from, weekStartsOn.value),
    End: endOfWeek(from, weekStartsOn.value),
    PageDown: addMonths(from, event.shiftKey ? 12 : 1),
    PageUp: addMonths(from, event.shiftKey ? -12 : -1),
  };
  const target = moves[event.key];
  if (!target) return;
  event.preventDefault();
  moveFocus(target);
};

// Range visuals: the committed range, or a preview to the hovered day while the end is still open.
const bounds = computed(() => {
  const r = range.value;
  if (!r?.from) return { lo: null as Date | null, hi: null as Date | null };
  const previewEnd = !r.to ? hover.value : r.to;
  const forward = previewEnd ? compareDays(r.from, previewEnd) <= 0 : true;
  return { lo: previewEnd && !forward ? previewEnd : r.from, hi: previewEnd && forward ? previewEnd : r.from };
});

const prevBlocked = computed(() => (props.min ? compareDays(addMonths(month.value, -1), new Date(props.min.getFullYear(), props.min.getMonth(), 1)) < 0 : false));
const nextBlocked = computed(() => (props.max ? compareDays(addMonths(month.value, props.numberOfMonths), props.max) > 0 : false));
const PrevIcon = computed(() => (rtl.value ? ChevronRight : ChevronLeft));
const NextIcon = computed(() => (rtl.value ? ChevronLeft : ChevronRight));

const fmt = (d: Date, options: FormatDateOptions) => formatDate(d, locale.value, { ...options, ...(props.calendar ? { calendar: props.calendar } : {}) });
// Any date with the wanted weekday: 2023-01-01 was a Sunday.
const weekdayDate = (wd: number) => new Date(2023, 0, 1 + wd);
const title = (m: Date) => fmt(new Date(m.getFullYear(), m.getMonth(), 15), { month: "long", year: "numeric" });

const cell = (d: Date) => {
  const { lo, hi } = bounds.value;
  const r = range.value;
  const selected = r ? Boolean((r.from && isSameDay(r.from, d)) || (r.to && isSameDay(r.to, d))) : Boolean(single.value && isSameDay(single.value, d));
  const inRange = Boolean(lo && hi && compareDays(d, lo) >= 0 && compareDays(d, hi) <= 0);
  const isStart = Boolean(lo && isSameDay(d, lo));
  const isEnd = Boolean(hi && isSameDay(d, hi));
  return { selected, band: inRange && !(isStart && isEnd), isStart, isEnd };
};
const hoverIfOpen = (d: Date) => {
  if (range.value?.from && !range.value.to) hover.value = d;
};
</script>

<template>
  <div
    ref="root"
    data-slot="calendar"
    :data-mode="isRange ? 'range' : 'single'"
    :dir="rtl ? 'rtl' : 'ltr'"
    :lang="locale"
    :class="cn('inline-flex w-fit flex-col gap-2 text-body-sm text-foreground', props.class)"
    @keydown="onKeydown"
    @mouseleave="hover = null"
  >
    <div class="flex flex-wrap gap-x-6 gap-y-4">
      <div v-for="(m, index) in months" :key="dayKey(m)" data-slot="calendar-month" class="flex flex-col gap-2">
        <div class="flex items-center justify-between gap-2">
          <NqButton v-if="index === 0" variant="ghost" size="icon-sm" :aria-label="props.previousMonthLabel ?? strings.previous" :disabled="prevBlocked" @click="setMonth(addMonths(month, -1))">
            <component :is="PrevIcon" aria-hidden="true" />
          </NqButton>
          <span v-else class="size-control-sm" />
          <div aria-live="polite" data-slot="calendar-title" class="text-label font-semibold">{{ title(m) }}</div>
          <NqButton v-if="index === months.length - 1" variant="ghost" size="icon-sm" :aria-label="props.nextMonthLabel ?? strings.next" :disabled="nextBlocked" @click="setMonth(addMonths(month, 1))">
            <component :is="NextIcon" aria-hidden="true" />
          </NqButton>
          <span v-else class="size-control-sm" />
        </div>
        <table role="grid" :aria-label="title(m)" data-slot="calendar-grid" class="border-separate border-spacing-0">
          <thead>
            <tr>
              <th v-for="wd in weekOrder(weekStartsOn)" :key="wd" scope="col" class="size-9 p-0 text-caption font-medium text-muted-foreground">
                <span aria-hidden="true">{{ fmt(weekdayDate(wd), { weekday: "narrow" }) }}</span>
                <span class="sr-only">{{ fmt(weekdayDate(wd), { weekday: "long" }) }}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="week in monthMatrix(m, weekStartsOn, props.fixedWeeks)" :key="dayKey(week[0] as Date)">
              <template v-for="d in week" :key="dayKey(d)">
                <td v-if="!isSameMonth(d, m) && !showOutside" role="gridcell" />
                <td
                  v-else
                  role="gridcell"
                  :aria-selected="cell(d).selected || undefined"
                  :data-in-range="cell(d).band ? '' : undefined"
                  :class="cn('p-0 text-center', cell(d).band && 'bg-nq-selected', cell(d).band && cell(d).isStart && 'rounded-s-control', cell(d).band && cell(d).isEnd && 'rounded-e-control')"
                >
                  <button
                    type="button"
                    :tabindex="isSameDay(d, tabDate) ? 0 : -1"
                    :data-date="dayKey(d)"
                    :data-selected="cell(d).selected ? '' : undefined"
                    :data-today="isSameDay(d, today) ? '' : undefined"
                    :data-outside="!isSameMonth(d, m) ? '' : undefined"
                    :data-disabled="isDisabled(d) ? '' : undefined"
                    :aria-disabled="isDisabled(d) || undefined"
                    :aria-current="isSameDay(d, today) ? 'date' : undefined"
                    :aria-label="fmt(d, { dateStyle: 'full' })"
                    class="inline-flex size-9 min-h-[var(--nq-touch-min,0px)] min-w-[var(--nq-touch-min,0px)] items-center justify-center rounded-control border border-transparent text-body-sm tabular-nums outline-none transition-colors duration-150 ease-nq hover:bg-nq-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus data-today:border-nq-focus data-outside:text-muted-foreground data-disabled:cursor-not-allowed data-disabled:text-muted-foreground data-disabled:opacity-40 data-disabled:hover:bg-transparent data-selected:border-transparent data-selected:bg-primary data-selected:text-primary-foreground data-selected:hover:bg-primary"
                    @click="pick(d)"
                    @focus="!isDisabled(d) && hoverIfOpen(d)"
                    @mouseenter="hoverIfOpen(d)"
                  >
                    {{ fmt(d, { day: "numeric" }) }}
                  </button>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
