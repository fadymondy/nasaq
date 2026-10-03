<script lang="ts">
export const CLINIC_SCHEDULE_STRINGS = {
  en: {
    summary: "Today at a glance",
    total: "Booked",
    remaining: "Still to see",
    minutes: (n: number) => `${n} min`,
    booked: "Booked time",
    hours: (m: number) => `${Math.floor(m / 60)} h ${m % 60} min`,
    next: "Next up",
    nothing: "No one is waiting.",
    late: (n: number) => `${n} min late`,
    overlap: (n: number) => `${n} ${n === 1 ? "pair of appointments overlaps" : "pairs of appointments overlap"}.`,
    open: "Open",
    inVisit: "In visit now",
    legend: "Status legend",
    empty: "No appointments on this day.",
    room: (r: string) => `Room ${r}`,
    followUp: "Follow-up",
  },
  ar: {
    summary: "اليوم في لمحة",
    total: "محجوز",
    remaining: "متبقٍ",
    minutes: (n: number) => `${n} دقيقة`,
    booked: "الوقت المحجوز",
    hours: (m: number) => `${Math.floor(m / 60)} س ${m % 60} د`,
    next: "التالي",
    nothing: "لا أحد في الانتظار.",
    late: (n: number) => `متأخر ${n} دقيقة`,
    overlap: (n: number) => (n === 1 ? "يوجد موعدان متداخلان." : `يوجد ${n} أزواج من المواعيد المتداخلة.`),
    open: "فتح",
    inVisit: "في الزيارة الآن",
    legend: "دليل الحالات",
    empty: "لا مواعيد في هذا اليوم.",
    room: (r: string) => `الغرفة ${r}`,
    followUp: "متابعة",
  },
};

export type ClinicScheduleLabels = (typeof CLINIC_SCHEDULE_STRINGS)["en"];
</script>

<script setup lang="ts">
import { AlertTriangle, ArrowRight, Clock } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqBookingStatusBadge, useBookingStatusLabel } from "../booking-pipeline";
import { BOOKING_STATUSES, type BookingStatus } from "../booking-pipeline/booking-math";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { formatDate, NqNum } from "../numeric";
import { NqScheduler, type SchedulerEvent } from "../scheduler";
import { currentAppointment, CLINIC_STATUS_TONE, findOverlaps, minutesLate, nextAppointment, summariseAppointments, type ClinicAppointment } from "./schedule-math";

// A doctor's day: a day timeline with each appointment coloured and named by status (the status word is in the block title, so colour is never the only cue),
// a count per status, the next patient with how late they are, and a warning when appointments overlap.
// Read only: selecting an appointment or an empty slot emits, and the host decides what happens.
const props = withDefaults(
  defineProps<{
    /** The doctor's appointments. Any day; the schedule shows the one in `date`. */
    appointments: readonly ClinicAppointment[];
    /** The day shown. `v-model:date`. */
    date?: Date;
    defaultDate?: Date;
    /** Visible hours. Default 8 to 18. */
    workingHours?: { start: number; end: number };
    /** Overrides "now" (for tests and stories). */
    now?: Date;
    labels?: Partial<ClinicScheduleLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { date: undefined, defaultDate: undefined, workingHours: () => ({ start: 8, end: 18 }), now: undefined, labels: undefined },
);
const emit = defineEmits<{
  /** An appointment block or the "Open" button was used. */
  select: [appointment: ClinicAppointment];
  /** An empty slot was chosen, for adding a walk-in or a break. */
  slotSelect: [start: Date, end: Date];
  "update:date": [date: Date];
}>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...CLINIC_SCHEDULE_STRINGS[locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as ClinicScheduleLabels);
const statusName = useBookingStatusLabel();
const clock = computed(() => props.now ?? new Date());
const dateInner = ref<Date>(props.defaultDate ?? clock.value);
const date = computed(() => props.date ?? dateInner.value);
// The Open buttons only show when the host listens for "select", like React's optional onSelect.
const canOpen = computed(() => !!getCurrentInstance()?.vnode.props?.onSelect);
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
const day = computed(() => props.appointments.filter((a) => sameDay(a.start, date.value)));
const summary = computed(() => summariseAppointments(day.value));
const current = computed(() => currentAppointment(day.value));
const next = computed(() => nextAppointment(day.value, clock.value));
const overlaps = computed(() => findOverlaps(day.value));
const late = computed(() => (next.value ? minutesLate(next.value, clock.value) : 0));
const events = computed<SchedulerEvent[]>(() => day.value.map((a) => ({ id: a.id, title: `${a.patient} · ${statusName(a.status)}`, start: a.start, end: a.end, tone: CLINIC_STATUS_TONE[a.status] })));
const byId = computed(() => new Map(day.value.map((a) => [a.id, a])));
const shown: BookingStatus[] = [...BOOKING_STATUSES, "no_show", "cancelled"];
const legend = computed(() => shown.filter((s) => summary.value.byStatus[s] > 0));

function setDate(d: Date | undefined) {
  if (!d) return;
  dateInner.value = d;
  emit("update:date", d);
}
function pick(e: SchedulerEvent) {
  const a = byId.value.get(e.id);
  if (a) emit("select", a);
}
</script>

<template>
  <div data-slot="clinic-schedule" :class="cn('grid gap-4 lg:grid-cols-[1fr_18rem] lg:items-start', props.class)">
    <div class="min-w-0">
      <NqScheduler
        :events="events"
        :view="'day'"
        :date="date"
        :working-hours="props.workingHours"
        :slot-minutes="15"
        :today="clock"
        @update:date="setDate"
        @slot-select="(s: Date, e: Date) => emit('slotSelect', s, e)"
        @event-click="pick"
      />
      <p v-if="day.length === 0" class="mt-3 text-body-sm text-muted-foreground">{{ t.empty }}</p>
    </div>

    <div class="flex flex-col gap-4">
      <NqCard>
        <NqCardHeader>
          <NqCardTitle as="h3">{{ t.summary }}</NqCardTitle>
          <NqCardDescription>
            <bdi>{{ formatDate(date, locale, { weekday: "long", day: "numeric", month: "long" }) }}</bdi>
          </NqCardDescription>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-3">
          <dl class="m-0 grid grid-cols-2 gap-3">
            <div>
              <dt class="text-caption text-muted-foreground">{{ t.total }}</dt>
              <dd class="m-0 text-h2 tabular-nums"><NqNum :value="summary.total" /></dd>
            </div>
            <div>
              <dt class="text-caption text-muted-foreground">{{ t.remaining }}</dt>
              <dd class="m-0 text-h2 tabular-nums"><NqNum :value="summary.remaining" /></dd>
            </div>
            <div class="col-span-2">
              <dt class="text-caption text-muted-foreground">{{ t.booked }}</dt>
              <dd class="m-0 text-body-sm tabular-nums">{{ t.hours(summary.bookedMinutes) }}</dd>
            </div>
          </dl>
          <ul :aria-label="t.legend" class="m-0 flex list-none flex-wrap gap-1.5 p-0">
            <li v-for="s in legend" :key="s" class="inline-flex items-center gap-1">
              <NqBookingStatusBadge :status="s" />
              <span class="text-caption tabular-nums text-muted-foreground"><NqNum :value="summary.byStatus[s]" /></span>
            </li>
          </ul>
        </NqCardContent>
      </NqCard>

      <NqCard v-if="current" data-slot="clinic-current">
        <NqCardHeader>
          <NqCardTitle as="h3">{{ t.inVisit }}</NqCardTitle>
          <NqCardDescription>{{ current.service }}</NqCardDescription>
        </NqCardHeader>
        <NqCardContent class="flex items-center justify-between gap-2">
          <span class="text-label">{{ current.patient }}</span>
          <NqButton v-if="canOpen" size="sm" variant="secondary" @click="emit('select', current)">
            {{ t.open }}
            <ArrowRight aria-hidden="true" class="rtl:rotate-180" />
          </NqButton>
        </NqCardContent>
      </NqCard>

      <NqCard data-slot="clinic-next">
        <NqCardHeader>
          <NqCardTitle as="h3">{{ t.next }}</NqCardTitle>
        </NqCardHeader>
        <NqCardContent class="flex flex-col gap-2">
          <template v-if="next">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-label">{{ next.patient }}</p>
                <p class="text-caption text-muted-foreground">{{ next.service }}{{ next.followUp ? ` · ${t.followUp}` : "" }}</p>
              </div>
              <NqBookingStatusBadge :status="next.status" />
            </div>
            <p class="inline-flex items-center gap-1.5 text-body-sm">
              <Clock aria-hidden="true" class="size-4 text-muted-foreground" />
              <bdi>{{ formatDate(next.start, locale, { hour: "numeric", minute: "2-digit" }) }}</bdi>
              <span v-if="next.room" class="text-muted-foreground">· {{ t.room(next.room) }}</span>
              <span v-if="late > 0" class="font-medium text-nq-warning-text">· {{ t.late(late) }}</span>
            </p>
            <NqButton v-if="canOpen" size="sm" variant="secondary" @click="emit('select', next)">{{ t.open }}</NqButton>
          </template>
          <p v-else class="text-body-sm text-muted-foreground">{{ t.nothing }}</p>
        </NqCardContent>
      </NqCard>

      <NqAlert v-if="overlaps.length > 0" tone="warning" :icon="AlertTriangle">{{ t.overlap(overlaps.length) }}</NqAlert>
    </div>
  </div>
</template>
