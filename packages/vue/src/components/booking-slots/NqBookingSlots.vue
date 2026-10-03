<script setup lang="ts">
import { Ban, CalendarSearch, Lock } from "lucide-vue-next";
import { RadioGroupItem } from "reka-ui";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { NqCalendar, type WeekDay } from "../calendar";
import { formatDate } from "../numeric";
import { NqRadioGroup } from "../radio-group";
import { NqSkeleton } from "../states";
import { bookingDayKey, countSlots, dayPart, firstAvailableDay, type BookingSlot } from "./booking-math";
import { strings, type Labels } from "./booking-slots-strings";

// The date and time step of a booking: a calendar (days with nothing free are disabled) beside the day's times.
// Each time is one of available, full or held. A full day offers a jump to the next free day. Arrow keys move
// and select inside the list; Tab leaves it.
interface Props {
  /** Every time across the days you want to show, with its state. Past times are not listed. */
  slots: readonly BookingSlot[];
  defaultValue?: Date | null;
  defaultDay?: Date;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  /** Show skeleton times while the day loads. */
  loading?: boolean;
  /** Group the times as morning, afternoon and evening when the day has more than 8. Default true. */
  grouped?: boolean;
  weekStartsOn?: WeekDay;
  hour12?: boolean;
  locale?: string;
  dir?: "ltr" | "rtl";
  labels?: Labels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { defaultValue: null, defaultDay: undefined, now: undefined, loading: false, grouped: true, weekStartsOn: undefined, hour12: undefined, locale: undefined, dir: undefined, labels: undefined });
/** The chosen slot's start: `v-model`. */
const value = defineModel<Date | null | undefined>();
/** The day whose times are listed: `v-model:day`. */
const dayModel = defineModel<Date>("day");
const emit = defineEmits<{ "value-change": [start: Date]; "day-change": [day: Date] }>();

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const RTL = new Set(["ar", "he", "fa", "ur"]);
const nq = useNasaq();
const locale = computed(() => props.locale ?? nq.locale.value);
const dir = computed(() => props.dir ?? (RTL.has(locale.value.split("-")[0] ?? "en") ? "rtl" : "ltr"));
const t = computed(() => ({ ...strings(locale.value), ...props.labels }) as ReturnType<typeof strings>);
const today = computed(() => startOfDay(props.now ?? new Date()));

const valueInner = ref<Date | null>(props.defaultValue);
const chosen = computed(() => (value.value !== undefined ? value.value : valueInner.value));
const firstOpen = computed(() => firstAvailableDay(props.slots, today.value));
const dayInner = ref<Date>(startOfDay(props.defaultDay ?? chosen.value ?? firstOpen.value ?? today.value));
const day = computed(() => dayModel.value ?? dayInner.value);
function setDay(next: Date) {
  dayInner.value = next;
  dayModel.value = next;
  emit("day-change", next);
}

const openDays = computed(() => new Set(props.slots.filter((s) => s.state === "available").map((s) => bookingDayKey(s.start))));
const daySlots = computed(() => props.slots.filter((s) => s.state !== "past" && bookingDayKey(s.start) === bookingDayKey(day.value)).sort((a, b) => a.start.getTime() - b.start.getTime()));
const counts = computed(() => countSlots(daySlots.value));
const dayLabel = computed(() => formatDate(day.value, locale.value, { dateStyle: "full" }));
const fmtTime = (d: Date) => formatDate(d, locale.value, { hour: "numeric", minute: "2-digit", ...(props.hour12 === undefined ? {} : { hour12: props.hour12 }) });
const stateLabel = (s: BookingSlot) => (s.state === "full" ? t.value.full : s.state === "held" ? t.value.held : t.value.available);
const nextFree = computed(() => firstAvailableDay(props.slots, new Date(day.value.getFullYear(), day.value.getMonth(), day.value.getDate() + 1)));

const groups = computed(() => {
  const split = props.grouped && daySlots.value.length > 8;
  return split
    ? (["morning", "afternoon", "evening"] as const).map((k) => ({ key: k as string, label: t.value[k] as string | undefined, items: daySlots.value.filter((s) => dayPart(s.start) === k) })).filter((g) => g.items.length > 0)
    : [{ key: "all", label: undefined as string | undefined, items: daySlots.value }];
});

const radioValue = computed(() => (chosen.value && bookingDayKey(chosen.value) === bookingDayKey(day.value) ? String(chosen.value.getTime()) : undefined));
function pick(v: string) {
  const slot = daySlots.value.find((s) => String(s.start.getTime()) === v);
  if (!slot || slot.state !== "available") return;
  valueInner.value = slot.start;
  value.value = slot.start;
  emit("value-change", slot.start);
}
</script>

<template>
  <div data-slot="booking-slots" :dir="dir" :lang="locale" :class="cn('flex flex-col gap-4 sm:flex-row', props.class)">
    <NqCalendar
      :model-value="day"
      :locale="locale"
      :dir="dir"
      :week-starts-on="props.weekStartsOn"
      :today="today"
      :disabled="(d: Date) => d < today || !openDays.has(bookingDayKey(d))"
      class="self-start"
      @update:model-value="(d: unknown) => d instanceof Date && setDay(startOfDay(d))"
    />
    <div data-slot="booking-slots-times" class="flex min-w-0 flex-1 flex-col gap-3" :aria-busy="props.loading || undefined">
      <div class="flex flex-col gap-0.5">
        <h3 aria-live="polite" class="text-label font-semibold">
          <bdi>{{ dayLabel }}</bdi>
        </h3>
        <p v-if="!props.loading && daySlots.length > 0" class="text-caption text-muted-foreground">
          {{ counts.available > 0 ? t.openCount(counts.available) : t.dayFull }}
        </p>
      </div>

      <div v-if="props.loading" class="grid grid-cols-3 gap-2" role="status" aria-label="…">
        <NqSkeleton v-for="i in 9" :key="i" class="h-control" />
      </div>
      <p v-else-if="daySlots.length === 0" class="text-body-sm text-muted-foreground">{{ t.dayClosed }}</p>
      <NqRadioGroup v-else :aria-label="t.timesOn(dayLabel)" class="gap-4" :model-value="radioValue" @update:model-value="pick">
        <div v-for="g in groups" :key="g.key" class="flex flex-col gap-2">
          <p v-if="g.label" class="text-caption font-medium text-muted-foreground">{{ g.label }}</p>
          <div class="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-2">
            <RadioGroupItem
              v-for="s in g.items"
              :key="s.start.getTime()"
              :value="String(s.start.getTime())"
              :disabled="s.state !== 'available'"
              data-slot="booking-slot"
              :data-state="s.state"
              :aria-label="t.slotLabel(fmtTime(s.start), stateLabel(s))"
              :title="s.state === 'held' ? t.heldHint : undefined"
              :class="
                cn(
                  'inline-flex min-h-control flex-col items-center justify-center gap-0.5 rounded-control border border-border bg-card px-2 py-1.5 text-label tabular-nums outline-none',
                  'transition-colors duration-150 ease-nq hover:bg-nq-hover',
                  'data-[state=checked]:border-primary data-[state=checked]:bg-nq-selected',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
                  'data-disabled:cursor-not-allowed data-disabled:hover:bg-card',
                  s.state === 'full' && 'bg-secondary text-muted-foreground',
                  s.state === 'held' && 'border-dashed text-muted-foreground',
                )
              "
            >
              <bdi :class="cn(s.state === 'full' && 'line-through')">{{ fmtTime(s.start) }}</bdi>
              <span v-if="s.state !== 'available'" class="inline-flex items-center gap-1 text-caption font-normal">
                <Ban v-if="s.state === 'full'" aria-hidden="true" class="size-3" />
                <Lock v-else aria-hidden="true" class="size-3" />
                {{ stateLabel(s) }}
              </span>
            </RadioGroupItem>
          </div>
        </div>
      </NqRadioGroup>

      <template v-if="!props.loading && daySlots.length > 0 && counts.available === 0">
        <NqButton v-if="nextFree" variant="secondary" size="sm" class="self-start" @click="setDay(startOfDay(nextFree))">
          <CalendarSearch aria-hidden="true" />
          {{ t.nextDay }}
        </NqButton>
        <p v-else class="text-body-sm text-muted-foreground">{{ t.noneAhead }}</p>
      </template>

      <ul :aria-label="t.legend" class="m-0 mt-auto flex list-none flex-wrap gap-x-4 gap-y-1 p-0 text-caption text-muted-foreground">
        <li class="inline-flex items-center gap-1.5">
          <span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-card" />
          {{ t.available }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span aria-hidden="true" class="size-3 rounded-[3px] border border-border bg-secondary" />
          {{ t.full }}
        </li>
        <li class="inline-flex items-center gap-1.5">
          <span aria-hidden="true" class="size-3 rounded-[3px] border border-dashed border-border bg-card" />
          {{ t.held }}
        </li>
      </ul>
    </div>
  </div>
</template>
