<script lang="ts">
export const SCHEDULER_STRINGS = {
  en: {
    day: "Day",
    week: "Week",
    month: "Month",
    views: "View",
    today: "Today",
    previous: { day: "Previous day", week: "Previous week", month: "Previous month" },
    next: { day: "Next day", week: "Next week", month: "Next month" },
    more: (n: string) => `+${n} more`,
    eventsOn: (date: string) => `Events on ${date}`,
    slotsOn: (date: string) => `Available times on ${date}`,
    noSlots: "No times available on this day.",
  },
  ar: {
    day: "يوم",
    week: "أسبوع",
    month: "شهر",
    views: "العرض",
    today: "اليوم",
    previous: { day: "اليوم السابق", week: "الأسبوع السابق", month: "الشهر السابق" },
    next: { day: "اليوم التالي", week: "الأسبوع التالي", month: "الشهر التالي" },
    more: (n: string) => `+${n} أخرى`,
    eventsOn: (date: string) => `الأحداث في ${date}`,
    slotsOn: (date: string) => `الأوقات المتاحة في ${date}`,
    noSlots: "لا توجد أوقات متاحة في هذا اليوم.",
  },
} as const;

export const SCHEDULER_TONES = {
  neutral: "border-border bg-secondary text-foreground",
  brand: "border-nq-brand/40 bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-foreground",
  success: "border-nq-success/40 bg-nq-success-soft text-nq-success-text",
  warning: "border-nq-warning/40 bg-nq-warning-soft text-nq-warning-text",
  danger: "border-nq-danger/40 bg-nq-danger-soft text-nq-danger-text",
  info: "border-nq-info/40 bg-nq-info-soft text-nq-info-text",
} as const;
</script>

<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { addDays, dayKey, getWeekStartsOn, isSameDay, isSameMonth, monthMatrix, startOfDay, startOfWeek, type WeekDay } from "../calendar/calendar-math";
import { NqIcon } from "../icon";
import { formatDate, formatDateRange, formatNumber, type FormatDateOptions } from "../numeric";
import { NqPopover, NqPopoverContent, NqPopoverTitle, NqPopoverTrigger } from "../popover";
import { NqToggle, NqToggleGroup } from "../toggle-group";
import { eventBox, eventsForDay, layoutDayEvents, normalizeHours, splitChips, stepDate, timeSlots, type SchedulerEvent, type SchedulerView, type WorkingHours } from "./scheduler-math";

// A day, week or month schedule. Events render as blocks placed by time (overlaps split the column) or as
// month chips with a "+N more" popover. Read only: clicking an empty slot or an event reports it, nothing is
// dragged or resized.
export interface Props {
  events: SchedulerEvent[];
  defaultView?: SchedulerView;
  defaultDate?: Date;
  /** Visible hours of the day in the day and week views. Default 8 to 18. */
  workingHours?: WorkingHours;
  /** Length of one clickable slot in minutes. Default 30. */
  slotMinutes?: number;
  /** 0 = Sunday … 6 = Saturday. Defaults to the locale's first day of the week. */
  weekStartsOn?: WeekDay;
  /** Force 12 or 24 hour time. Defaults to the locale's format. */
  hour12?: boolean;
  /** Chips shown per day in the month view, the last replaced by "+N more" when there are more events. Default 3. */
  maxChips?: number;
  /** BCP 47 locale. Defaults to the NasaqProvider locale. */
  locale?: string;
  /** Force a direction. Defaults to the direction of the locale. */
  dir?: "ltr" | "rtl";
  /** Overrides "today" (for tests and stories). */
  today?: Date;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  defaultView: "week",
  defaultDate: undefined,
  workingHours: () => ({ start: 8, end: 18 }),
  slotMinutes: 30,
  weekStartsOn: undefined,
  hour12: undefined,
  maxChips: 3,
  locale: undefined,
  dir: undefined,
  today: undefined,
});
/** `v-model:view`: "day", "week" or "month". */
const viewModel = defineModel<SchedulerView>("view");
/** `v-model:date`: any date inside the visible day, week or month. */
const dateModel = defineModel<Date>("date");
const emit = defineEmits<{ slotSelect: [start: Date, end: Date]; eventClick: [event: SchedulerEvent] }>();

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);
const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const rtl = computed(() => (props.dir ? props.dir === "rtl" : RTL_LANGS.has(locale.value.split("-")[0] ?? "en")));
const dir = computed(() => (rtl.value ? "rtl" : "ltr"));
const t = computed(() => SCHEDULER_STRINGS[locale.value.split("-")[0] === "ar" ? "ar" : "en"]);
const weekStartsOn = computed(() => props.weekStartsOn ?? getWeekStartsOn(locale.value));
const today = computed(() => startOfDay(props.today ?? new Date()));

const innerView = ref<SchedulerView>(props.defaultView);
const innerDate = ref<Date>(startOfDay(props.defaultDate ?? today.value));
const view = computed(() => viewModel.value ?? innerView.value);
const date = computed(() => dateModel.value ?? innerDate.value);
function setView(next: SchedulerView) {
  innerView.value = next;
  viewModel.value = next;
}
function setDate(next: Date) {
  innerDate.value = next;
  dateModel.value = next;
}

const timeOptions = (minutes: boolean): FormatDateOptions => ({
  hour: "numeric",
  ...(minutes ? { minute: "2-digit" as const } : {}),
  ...(props.hour12 === undefined ? {} : { hour12: props.hour12 }),
});
const fmt = (d: Date, o: FormatDateOptions) => formatDate(d, locale.value, o);
const eventRange = (e: SchedulerEvent) => formatDateRange(e.start, e.end, locale.value, timeOptions(true));

const days = computed(() => {
  if (view.value === "month") return [] as Date[];
  const first = view.value === "day" ? startOfDay(date.value) : startOfWeek(date.value, weekStartsOn.value);
  return Array.from({ length: view.value === "day" ? 1 : 7 }, (_, i) => addDays(first, i));
});
const title = computed(() =>
  view.value === "day"
    ? fmt(date.value, { dateStyle: "full" })
    : view.value === "week"
      ? formatDateRange(days.value[0] as Date, days.value[6] as Date, locale.value, { dateStyle: "medium" })
      : fmt(date.value, { month: "long", year: "numeric" }),
);
const onView = (v: string[]) => v[0] && setView(v[0] as SchedulerView);

// Time grid
const hours = computed(() => normalizeHours(props.workingHours));
const slots = computed(() => timeSlots(hours.value, props.slotMinutes));
const step = computed(() => Math.max(Math.floor(props.slotMinutes), 5));
const rangeStart = computed(() => hours.value.start * 60);
const rangeEnd = computed(() => hours.value.end * 60);
const total = computed(() => rangeEnd.value - rangeStart.value);
const columns = computed(() => ({ gridTemplateColumns: `3.5rem repeat(${days.value.length}, minmax(0, 1fr))` }));
const at = (day: Date, minutes: number) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, minutes);
const slotLabel = (d: Date) => fmt(d, { weekday: "long", month: "long", day: "numeric", ...timeOptions(true) });
const body = ref<HTMLElement | null>(null);
const focus = ref({ col: 0, row: 0 });
function move(col: number, row: number) {
  const c = Math.min(Math.max(col, 0), days.value.length - 1);
  const r = Math.min(Math.max(row, 0), slots.value.length - 1);
  focus.value = { col: c, row: r };
  body.value?.querySelector<HTMLElement>(`[data-col="${c}"][data-row="${r}"]`)?.focus();
}
function onKeydown(event: KeyboardEvent) {
  const cell = (event.target as HTMLElement).closest<HTMLElement>("[data-row]");
  if (!cell) return;
  const col = Number(cell.dataset.col);
  const row = Number(cell.dataset.row);
  // Arrow keys are physical: in RTL the columns run right to left.
  const side = rtl.value ? -1 : 1;
  const target: Record<string, [number, number]> = {
    ArrowDown: [col, row + 1],
    ArrowUp: [col, row - 1],
    ArrowRight: [col + side, row],
    ArrowLeft: [col - side, row],
    Home: [col, 0],
    End: [col, slots.value.length - 1],
  };
  const next = target[event.key];
  if (!next) return;
  event.preventDefault();
  move(next[0], next[1]);
}
const placed = (day: Date) => layoutDayEvents(props.events, day, rangeStart.value, rangeEnd.value).map((p) => ({ p, box: eventBox(p, total.value) }));

// Month grid
const rows = computed(() => (view.value === "month" ? monthMatrix(date.value, weekStartsOn.value) : []));
const dayInfo = (day: Date) => {
  const list = eventsForDay(props.events, day);
  return { list, ...splitChips(list, props.maxChips), label: fmt(day, { dateStyle: "full" }) };
};

const FOCUS = "outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-nq-focus";
const CHIP = "flex w-full min-w-0 items-center gap-1 rounded-[4px] border px-1.5 py-0.5 text-start text-caption";
</script>

<template>
  <div data-slot="scheduler" :data-view="view" :dir="dir" :lang="locale" :class="cn('flex w-full flex-col gap-3 text-body-sm text-foreground', props.class)">
    <div data-slot="scheduler-toolbar" class="flex flex-wrap items-center gap-2">
      <div class="flex items-center gap-1">
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.previous[view]" @click="setDate(stepDate(view, date, -1))">
          <NqIcon :icon="ChevronLeft" />
        </NqButton>
        <NqButton variant="ghost" size="icon-sm" :aria-label="t.next[view]" @click="setDate(stepDate(view, date, 1))">
          <NqIcon :icon="ChevronRight" />
        </NqButton>
        <NqButton size="sm" @click="setDate(view === 'month' ? new Date(today.getFullYear(), today.getMonth(), 1) : today)">{{ t.today }}</NqButton>
      </div>
      <h2 aria-live="polite" class="me-auto text-body font-semibold"><bdi>{{ title }}</bdi></h2>
      <NqToggleGroup :aria-label="t.views" :model-value="[view]" @update:model-value="onView">
        <NqToggle value="day">{{ t.day }}</NqToggle>
        <NqToggle value="week">{{ t.week }}</NqToggle>
        <NqToggle value="month">{{ t.month }}</NqToggle>
      </NqToggleGroup>
    </div>

    <div v-if="view !== 'month'" data-slot="scheduler-grid" class="overflow-auto rounded-card border border-border bg-card">
      <div class="sticky top-0 z-20 grid border-b border-border bg-card" :style="columns">
        <div />
        <div v-for="day in days" :key="dayKey(day)" :data-today="isSameDay(day, today) || undefined" class="flex flex-col items-center gap-0.5 border-s border-border py-1.5">
          <span class="text-caption text-muted-foreground">{{ fmt(day, { weekday: "short" }) }}</span>
          <span :class="cn('flex size-6 items-center justify-center rounded-full text-label tabular-nums', isSameDay(day, today) && 'bg-primary text-primary-foreground')">
            {{ formatNumber(day.getDate(), locale) }}
          </span>
        </div>
      </div>
      <div ref="body" class="grid" :style="columns" @keydown="onKeydown">
        <div aria-hidden="true">
          <div v-for="m in slots" :key="m" class="h-8 pe-2 text-end text-caption text-muted-foreground tabular-nums">
            <span v-if="m % 60 === 0" :class="cn('relative bg-card', m !== rangeStart && '-top-2')">{{ fmt(at(days[0] as Date, m), timeOptions(false)) }}</span>
          </div>
        </div>
        <div v-for="(day, col) in days" :key="dayKey(day)" :data-date="dayKey(day)" class="relative border-s border-border">
          <button
            v-for="(m, row) in slots"
            :key="m"
            type="button"
            data-slot="scheduler-slot"
            :data-col="col"
            :data-row="row"
            :tabindex="focus.col === col && focus.row === row ? 0 : -1"
            :aria-label="slotLabel(at(day, m))"
            :class="cn('block h-8 w-full border-b border-border transition-colors duration-150 ease-nq hover:bg-nq-hover', FOCUS, m % 60 !== 0 && 'border-dashed')"
            @focus="focus = { col, row }"
            @click="emit('slotSelect', at(day, m), at(day, m + step))"
          />
          <button
            v-for="{ p, box } in placed(day)"
            :key="p.event.id"
            type="button"
            data-slot="scheduler-event"
            :data-tone="p.event.tone ?? 'neutral'"
            :aria-label="`${p.event.title}, ${eventRange(p.event)}`"
            :class="cn('absolute z-10 flex min-h-0 flex-col items-start overflow-hidden rounded-[4px] border px-1.5 py-0.5 text-start text-caption', SCHEDULER_TONES[p.event.tone ?? 'neutral'], FOCUS)"
            :style="{ top: `${box.top}%`, height: `${box.height}%`, insetInlineStart: `calc(${box.insetInlineStart}% + 1px)`, width: `calc(${box.width}% - 2px)` }"
            @click="emit('eventClick', p.event)"
          >
            <span class="w-full truncate font-medium">{{ p.event.title }}</span>
            <span v-if="p.height >= 45" class="w-full truncate tabular-nums opacity-80"><bdi>{{ eventRange(p.event) }}</bdi></span>
          </button>
        </div>
      </div>
    </div>

    <div v-else data-slot="scheduler-grid" class="overflow-hidden rounded-card border border-border bg-card">
      <div class="grid grid-cols-7 border-b border-border">
        <div v-for="d in rows[0] ?? []" :key="d.getDay()" class="px-2 py-1.5 text-caption text-muted-foreground">{{ fmt(d, { weekday: "short" }) }}</div>
      </div>
      <div v-for="row in rows" :key="dayKey(row[0] as Date)" class="grid grid-cols-7">
        <div
          v-for="day in row"
          :key="dayKey(day)"
          data-slot="scheduler-day"
          :data-date="dayKey(day)"
          :data-outside="!isSameMonth(day, date) || undefined"
          :data-today="isSameDay(day, today) || undefined"
          :class="cn('flex min-h-24 min-w-0 flex-col gap-0.5 border-b border-s border-border p-1', !isSameMonth(day, date) && 'bg-secondary/40')"
        >
          <button
            type="button"
            :aria-label="dayInfo(day).label"
            :class="cn(
              'flex size-6 items-center justify-center self-start rounded-full text-label tabular-nums hover:bg-nq-hover',
              FOCUS,
              !isSameMonth(day, date) && 'text-muted-foreground',
              isSameDay(day, today) && 'bg-primary text-primary-foreground hover:bg-primary',
            )"
            @click="emit('slotSelect', day, addDays(day, 1))"
          >
            {{ formatNumber(day.getDate(), locale) }}
          </button>
          <button
            v-for="e in dayInfo(day).visible"
            :key="e.id"
            type="button"
            data-slot="scheduler-chip"
            :data-tone="e.tone ?? 'neutral'"
            :aria-label="`${e.title}, ${eventRange(e)}`"
            :class="cn(CHIP, SCHEDULER_TONES[e.tone ?? 'neutral'], FOCUS)"
            @click="emit('eventClick', e)"
          >
            <span class="shrink-0 tabular-nums opacity-80"><bdi>{{ fmt(e.start, timeOptions(true)) }}</bdi></span>
            <span class="truncate font-medium">{{ e.title }}</span>
          </button>
          <NqPopover v-if="dayInfo(day).hidden > 0">
            <NqPopoverTrigger :class="cn('rounded-[4px] px-1.5 py-0.5 text-start text-caption font-medium text-muted-foreground hover:bg-nq-hover hover:text-foreground', FOCUS)">
              <bdi>{{ t.more(formatNumber(dayInfo(day).hidden, locale)) }}</bdi>
            </NqPopoverTrigger>
            <NqPopoverContent align="start" class="flex w-64 flex-col gap-1">
              <NqPopoverTitle>{{ t.eventsOn(dayInfo(day).label) }}</NqPopoverTitle>
              <button
                v-for="e in dayInfo(day).list"
                :key="e.id"
                type="button"
                data-slot="scheduler-chip"
                :data-tone="e.tone ?? 'neutral'"
                :aria-label="`${e.title}, ${eventRange(e)}`"
                :class="cn(CHIP, SCHEDULER_TONES[e.tone ?? 'neutral'], FOCUS)"
                @click="emit('eventClick', e)"
              >
                <span class="shrink-0 tabular-nums opacity-80"><bdi>{{ fmt(e.start, timeOptions(true)) }}</bdi></span>
                <span class="truncate font-medium">{{ e.title }}</span>
              </button>
            </NqPopoverContent>
          </NqPopover>
        </div>
      </div>
    </div>
  </div>
</template>
