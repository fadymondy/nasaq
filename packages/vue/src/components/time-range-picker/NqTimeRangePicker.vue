<script setup lang="ts">
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCalendar, type DateRange, type WeekDay } from "../calendar";
import { useAnalyticsLabels } from "../metric-tiles/analytics-shared";
import { formatDateRange, type FormatDateOptions } from "../numeric";
import { NqPopover, NqPopoverClose, NqPopoverContent, NqPopoverTrigger } from "../popover";
import { NqSelect, NqSelectContent, NqSelectItem, NqSelectTrigger, NqSelectValue } from "../select";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import {
  TIME_RANGE_PRESETS,
  addDays,
  comparisonRange,
  currentWeek,
  dayInZone,
  isFutureWeek,
  orderDays,
  parsePreset,
  resolveTimeRange,
  sameTimeRange,
  shiftWeek,
  zoneOffsetLabel,
  type RelativePreset,
  type ResolvedTimeRange,
  type TimeComparison,
  type TimeRangeContext,
  type TimeRangeValue,
  type TimeRangeWeekday,
} from "./time-range-math";

// Picks the window a dashboard or report covers: relative presets (1h, 6h, 24h, 7d, 30d), a week navigator, or custom days,
// with an optional comparison period. The value is plain data ({ kind: "relative", preset: "24h" }, a week start day, or
// inclusive days) that reads and writes to a URL; days are read in a named time zone so a range means the same thing everywhere.

const STRINGS = {
  en: {
    label: "Time range",
    week: "Week",
    custom: "Custom",
    customTitle: "Custom range",
    apply: "Apply",
    cancel: "Cancel",
    previousWeek: "Previous week",
    nextWeek: "Next week",
    thisWeek: "This week",
    compare: "Compare with",
    none: "No comparison",
    previous: "Previous period",
    year: "Same period last year",
    versus: "Compared with",
    pickDays: "Pick the first and last day",
    shortPreset: (n: number, unit: "m" | "h" | "d") => `${n}${unit}`,
    longPreset: (n: number, unit: "m" | "h" | "d") => {
      const word = { m: ["minute", "minutes"], h: ["hour", "hours"], d: ["day", "days"] }[unit];
      return n === 1 ? `Last ${word[0]}` : `Last ${n} ${word[1]}`;
    },
  },
  ar: {
    label: "النطاق الزمني",
    week: "أسبوع",
    custom: "مخصص",
    customTitle: "نطاق مخصص",
    apply: "تطبيق",
    cancel: "إلغاء",
    previousWeek: "الأسبوع السابق",
    nextWeek: "الأسبوع التالي",
    thisWeek: "هذا الأسبوع",
    compare: "المقارنة مع",
    none: "بلا مقارنة",
    previous: "الفترة السابقة",
    year: "الفترة نفسها من العام الماضي",
    versus: "مقارنة مع",
    pickDays: "اختر أول يوم وآخر يوم",
    shortPreset: (n: number, unit: "m" | "h" | "d") => `${n} ${{ m: "د", h: "س", d: "ي" }[unit]}`,
    longPreset: (n: number, unit: "m" | "h" | "d") => {
      const forms = { m: ["دقيقة", "دقيقتين", "دقائق", "دقيقة"], h: ["ساعة", "ساعتين", "ساعات", "ساعة"], d: ["يوم", "يومين", "أيام", "يومًا"] }[unit];
      if (n === 1) return `آخر ${forms[0]}`;
      if (n === 2) return `آخر ${forms[1]}`;
      const cat = new Intl.PluralRules("ar").select(n);
      return `آخر ${n} ${cat === "few" ? forms[2] : forms[3]}`;
    },
  },
};

export type TimeRangePickerLabels = typeof STRINGS.en;

interface Props {
  /** The selected range (controlled, `v-model`). */
  modelValue?: TimeRangeValue;
  /** Initial range when uncontrolled. Default: the last 24 hours. */
  defaultValue?: TimeRangeValue;
  /** Called with the new value and the instants it covers right now (`to` is exclusive). Also emitted as `change`. */
  onValueChange?: (value: TimeRangeValue, range: ResolvedTimeRange) => void;
  /** Relative presets to offer, such as `["1h", "6h", "24h", "7d", "30d"]` (the default). */
  presets?: readonly RelativePreset[];
  /** Offer the week navigator. Default true. */
  allowWeek?: boolean;
  /** Offer a custom day range. Default true. */
  allowCustom?: boolean;
  /** Let weeks and custom days reach into the future. Default false. */
  allowFuture?: boolean;
  /** IANA zone the days are read in. Default: the browser's zone. Pass it on the server, and show it to users in shared reports. */
  timeZone?: string;
  /** First day of the week, 0 = Sunday. Default: the locale's. */
  weekStartsOn?: TimeRangeWeekday;
  /** Comparison period (controlled, `v-model:comparison`). Passing this or `onComparisonChange` shows the "Compare with" select. */
  comparison?: TimeComparison;
  defaultComparison?: TimeComparison;
  onComparisonChange?: (mode: TimeComparison, range: ResolvedTimeRange | null) => void;
  /** Show the resolved dates under the controls. Default true. */
  showSummary?: boolean;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  class?: HTMLAttributes["class"];
  labels?: Partial<TimeRangePickerLabels>;
}
const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
  defaultValue: () => ({ kind: "relative", preset: "24h" }),
  onValueChange: undefined,
  presets: () => TIME_RANGE_PRESETS,
  allowWeek: true,
  allowCustom: true,
  allowFuture: false,
  timeZone: undefined,
  weekStartsOn: undefined,
  comparison: undefined,
  defaultComparison: "none",
  onComparisonChange: undefined,
  showSummary: true,
  now: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:modelValue": [value: TimeRangeValue];
  change: [value: TimeRangeValue, range: ResolvedTimeRange];
  "update:comparison": [mode: TimeComparison];
}>();

const dayToDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y!, m! - 1, d!);
};
const dateToDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function browserZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function localeWeekStart(locale: string): TimeRangeWeekday {
  try {
    const l = new Intl.Locale(locale) as Intl.Locale & { getWeekInfo?: () => { firstDay: number }; weekInfo?: { firstDay: number } };
    const first = l.getWeekInfo?.().firstDay ?? l.weekInfo?.firstDay;
    if (first) return (first % 7) as TimeRangeWeekday;
  } catch {
    /* fall through */
  }
  return 1;
}

const t = useAnalyticsLabels(STRINGS, () => props.labels);
const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const isRtl = computed(() => nq.isRtl.value);
const timeZone = computed(() => props.timeZone ?? browserZone());
const weekStartsOn = computed(() => props.weekStartsOn ?? localeWeekStart(locale.value));
const inner = ref<TimeRangeValue>(props.defaultValue);
const value = computed(() => props.modelValue ?? inner.value);
const innerCompare = ref<TimeComparison>(props.defaultComparison);
const compare = computed(() => props.comparison ?? innerCompare.value);
const open = ref(false);
const draft = ref<DateRange>({ from: null, to: null });

const ctxFor = (): TimeRangeContext => ({ now: props.now ?? new Date(), timeZone: timeZone.value, weekStartsOn: weekStartsOn.value });
const ctx = computed(() => ctxFor());
const range = computed(() => resolveTimeRange(value.value, ctx.value));
const compared = computed(() => comparisonRange(value.value, compare.value, ctx.value));

function commit(next: TimeRangeValue) {
  if (sameTimeRange(next, value.value)) return;
  inner.value = next;
  const resolved = resolveTimeRange(next, ctxFor());
  emit("update:modelValue", next);
  emit("change", next, resolved);
  props.onValueChange?.(next, resolved);
}

const today = computed(() => dayInZone(ctx.value.now!, timeZone.value));
const todayDate = computed(() => dayToDate(today.value));
const showCompare = computed(() => props.comparison !== undefined || props.onComparisonChange !== undefined);
const pressed = computed(() => (value.value.kind === "relative" ? value.value.preset : value.value.kind === "week" ? "week" : ""));
const dayBased = computed(() => value.value.kind !== "relative");

const summary = (r: ResolvedTimeRange, days: boolean) => {
  const dayOptions: FormatDateOptions = { timeZone: timeZone.value, dateStyle: "medium" };
  return days
    ? formatDateRange(r.from, new Date(r.to.getTime() - 1), locale.value, dayOptions)
    : formatDateRange(r.from, r.to, locale.value, { timeZone: timeZone.value, dateStyle: "medium", timeStyle: "short" });
};

const presetLabel = (p: RelativePreset) => {
  const parsed = parsePreset(p)!;
  return { short: t.value.shortPreset(parsed.amount, parsed.unit), long: t.value.longPreset(parsed.amount, parsed.unit) };
};

const weekLabel = computed(() => {
  const v = value.value;
  return v.kind === "week" ? formatDateRange(dayToDate(v.start), dayToDate(addDays(v.start, 6)), locale.value, { dateStyle: "medium" }) : "";
});
const canNextWeek = computed(() => value.value.kind === "week" && (props.allowFuture || !isFutureWeek(shiftWeek(value.value, 1), ctx.value)));
const isThisWeek = computed(() => value.value.kind === "week" && value.value.start === (currentWeek(ctx.value) as { start: string }).start);

const customLabel = computed(() => {
  const v = value.value;
  if (v.kind !== "custom") return t.value.custom;
  const o = orderDays(v.from, v.to);
  return formatDateRange(dayToDate(o.from), dayToDate(o.to), locale.value, { dateStyle: "medium" });
});

const compareItems = computed<{ value: TimeComparison; label: string }[]>(() => [
  { value: "none", label: t.value.none },
  { value: "previous", label: t.value.previous },
  { value: "year", label: t.value.year },
]);

function onPresets(v: string[]) {
  const next = v[0];
  if (!next) return;
  if (next === "week") commit(currentWeek(ctxFor()));
  else commit({ kind: "relative", preset: next as RelativePreset });
}

function onOpen(next: boolean) {
  open.value = next;
  if (!next) return;
  const v = value.value;
  if (v.kind === "custom") {
    const o = orderDays(v.from, v.to);
    draft.value = { from: dayToDate(o.from), to: dayToDate(o.to) };
  } else {
    draft.value = { from: null, to: null };
  }
}

function apply() {
  const { from, to } = draft.value;
  if (!from || !to) return;
  commit({ kind: "custom", ...orderDays(dateToDay(from), dateToDay(to)) });
  open.value = false;
}

function onCompare(v: string | number | null) {
  if (!v) return;
  const mode = v as TimeComparison;
  innerCompare.value = mode;
  emit("update:comparison", mode);
  props.onComparisonChange?.(mode, comparisonRange(value.value, mode, ctxFor()));
}

const draftLabel = computed(() => (draft.value.from && draft.value.to ? formatDateRange(draft.value.from, draft.value.to, locale.value, { dateStyle: "medium" }) : t.value.pickDays));
</script>

<template>
  <div data-slot="time-range-picker" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <NqToggleGroup :aria-label="t.label" class="max-w-full overflow-x-auto" :model-value="pressed ? [pressed] : []" @update:model-value="onPresets">
        <NqToggle v-for="p in props.presets" :key="p" :value="p" :aria-label="presetLabel(p).long" :title="presetLabel(p).long">
          <span dir="auto">{{ presetLabel(p).short }}</span>
        </NqToggle>
        <NqToggle v-if="props.allowWeek" value="week">{{ t.week }}</NqToggle>
      </NqToggleGroup>

      <NqPopover v-if="props.allowCustom" :open="open" @update:open="onOpen">
        <NqPopoverTrigger as-child>
          <NqButton variant="secondary" size="sm" :data-active="value.kind === 'custom' ? '' : undefined" :class="cn('tabular-nums', value.kind === 'custom' && 'border-primary bg-nq-selected')">
            <CalendarDays aria-hidden="true" />
            {{ customLabel }}
          </NqButton>
        </NqPopoverTrigger>
        <NqPopoverContent align="start" :aria-label="t.customTitle" class="w-auto max-w-[var(--available-width)] p-3" :dir="isRtl ? 'rtl' : 'ltr'" :lang="locale">
          <NqCalendar
            mode="range"
            auto-focus
            :number-of-months="1"
            :model-value="draft"
            :today="todayDate"
            :max="props.allowFuture ? undefined : todayDate"
            :week-starts-on="weekStartsOn as WeekDay"
            :locale="locale"
            :dir="isRtl ? 'rtl' : 'ltr'"
            @update:model-value="draft = $event as DateRange"
          />
          <div class="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
            <p class="min-w-0 text-caption text-muted-foreground" aria-live="polite">{{ draftLabel }}</p>
            <div class="flex shrink-0 items-center gap-2">
              <NqPopoverClose as-child>
                <NqButton variant="ghost" size="sm">{{ t.cancel }}</NqButton>
              </NqPopoverClose>
              <NqButton variant="primary" size="sm" :disabled="!draft.from || !draft.to" @click="apply">{{ t.apply }}</NqButton>
            </div>
          </div>
        </NqPopoverContent>
      </NqPopover>

      <NqSelect v-if="showCompare" :model-value="compare" @update:model-value="onCompare">
        <NqSelectTrigger :aria-label="t.compare" class="h-control-sm w-auto min-w-40 max-w-full">
          <NqSelectValue />
        </NqSelectTrigger>
        <NqSelectContent>
          <NqSelectItem v-for="o in compareItems" :key="o.value" :value="o.value">{{ o.label }}</NqSelectItem>
        </NqSelectContent>
      </NqSelect>
    </div>

    <div v-if="value.kind === 'week'" data-slot="time-range-week" class="flex flex-wrap items-center gap-1.5">
      <NqButton variant="secondary" size="icon-sm" :aria-label="t.previousWeek" @click="commit(shiftWeek(value, -1))">
        <component :is="isRtl ? ChevronRight : ChevronLeft" aria-hidden="true" />
      </NqButton>
      <span class="min-w-40 text-center text-label tabular-nums" aria-live="polite">{{ weekLabel }}</span>
      <NqButton variant="secondary" size="icon-sm" :aria-label="t.nextWeek" :disabled="!canNextWeek" @click="commit(shiftWeek(value, 1))">
        <component :is="isRtl ? ChevronLeft : ChevronRight" aria-hidden="true" />
      </NqButton>
      <NqButton variant="ghost" size="sm" :disabled="isThisWeek" @click="commit(currentWeek(ctxFor()))">{{ t.thisWeek }}</NqButton>
    </div>

    <p v-if="props.showSummary" data-slot="time-range-summary" class="flex flex-wrap items-center gap-x-2 text-caption text-muted-foreground">
      <bdi class="tabular-nums text-foreground">{{ summary(range, dayBased) }}</bdi>
      <bdi dir="ltr" :title="timeZone">{{ zoneOffsetLabel(ctx.now!, timeZone) }}</bdi>
      <span v-if="compared">
        {{ t.versus }} <bdi class="tabular-nums">{{ summary(compared, dayBased) }}</bdi>
      </span>
    </p>
  </div>
</template>
