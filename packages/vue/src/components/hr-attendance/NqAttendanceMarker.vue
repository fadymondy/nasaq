<script setup lang="ts">
import { CircleX, Clock, Coffee, LogIn, LogOut, MapPin, Undo2 } from "lucide-vue-next";
import { computed, onBeforeUnmount, onMounted, ref, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { formatNumber, NqDateTime } from "../numeric";
import { NqSkeleton } from "../states";
import { NqStatus, type StatusTone } from "../status";
import { attendanceLateMinutes, attendanceMinutes, attendanceState, type PunchLike } from "./hr-math";
import { hrFail, useHrStrings, type HrAttendanceLabels } from "./strings";
import type { AttendancePunch, AttendancePunchKind, HrResult } from "./types";

// A clock-in card: the state (working, on break, clocked out), hours worked today, the punch buttons that fit that
// state and today's punch list. Lateness is judged from the first clock-in against the shift.
const props = withDefaults(
  defineProps<{
    /** Today's punches, in any order. */
    punches: readonly AttendancePunch[];
    /** The shift, used to say whether the first clock-in was late. `start` and `end` are "09:00". */
    shift?: { start: string; end: string; graceMinutes?: number };
    /** Where the person is now, shown under the clock: "Riyadh HQ". */
    place?: string;
    /** Records a punch. Resolve `{ error }` or reject to show the message. The component never stores punches. */
    onPunch: (kind: AttendancePunchKind) => Promise<HrResult> | HrResult;
    /** Show Start break and End break. Default true. */
    breaks?: boolean;
    /** The current time in ms. Default: the real clock, ticking every 15 seconds. */
    now?: number;
    loading?: boolean;
    labels?: HrAttendanceLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { shift: undefined, place: undefined, breaks: true, now: undefined, loading: false, labels: undefined },
);

const { t, locale, duration } = useHrStrings(() => props.labels);
const tick = ref(Date.now());
const busy = ref<AttendancePunchKind | null>(null);
const error = ref<string | null>(null);
let timer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  if (props.now === undefined) timer = setInterval(() => (tick.value = Date.now()), 15_000);
});
onBeforeUnmount(() => clearInterval(timer));

const toMs = (v: Date | number) => (v instanceof Date ? v.getTime() : v);
const now = computed(() => props.now ?? tick.value);
const sorted = computed(() => [...props.punches].map((p) => ({ ...p, ms: toMs(p.at) })).sort((a, b) => a.ms - b.ms));
const like = computed<PunchLike[]>(() => sorted.value.map((p) => ({ kind: p.kind, at: p.ms })));
const state = computed(() => attendanceState(like.value));
const worked = computed(() => attendanceMinutes(like.value, now.value));
const firstIn = computed(() => sorted.value.find((p) => p.kind === "in"));
const late = computed(() => (firstIn.value && props.shift ? attendanceLateMinutes(firstIn.value.ms, props.shift.start, props.shift.graceMinutes ?? 0) : 0));
const lastIn = computed(() => [...sorted.value].reverse().find((p) => p.kind === "in" || p.kind === "break-end"));
const label = computed<Record<AttendancePunchKind, string>>(() => ({ in: t.value.punchIn, out: t.value.punchOut, "break-start": t.value.punchBreakStart, "break-end": t.value.punchBreakEnd }));
const tone = computed<StatusTone>(() => (state.value === "in" ? "success" : state.value === "break" ? "warning" : "neutral"));
const stateLabel = computed(() => (state.value === "in" ? t.value.clockedIn : state.value === "break" ? t.value.onBreak : t.value.clockedOut));
const lateText = computed(() => (late.value ? t.value.late(`${formatNumber(late.value, locale.value)}${t.value.minutesShort}`) : t.value.onTime));
const PUNCH_ICON: Record<AttendancePunchKind, Component> = { in: LogIn, out: LogOut, "break-start": Coffee, "break-end": Clock };

async function punch(kind: AttendancePunchKind) {
  if (busy.value) return;
  busy.value = kind;
  error.value = null;
  try {
    const result = await props.onPunch(kind);
    if (result && result.error) error.value = result.error;
  } catch (e) {
    error.value = hrFail(e, t.value.failed);
  } finally {
    busy.value = null;
  }
}
</script>

<template>
  <NqCard data-slot="attendance-marker" :data-state="state" :aria-busy="props.loading || undefined" :class="cn('gap-4 px-0', props.class)">
    <NqCardHeader>
      <NqCardTitle as="h2" class="flex items-center gap-2 text-muted-foreground">
        <Clock aria-hidden="true" class="size-4" />
        {{ t.attendance }}
      </NqCardTitle>
      <div class="col-start-2 row-span-2 row-start-1 self-start justify-self-end">
        <NqStatus :tone="tone">{{ stateLabel }}</NqStatus>
      </div>
    </NqCardHeader>
    <NqCardContent class="flex flex-col gap-1">
      <NqSkeleton v-if="props.loading" class="h-9 w-32" />
      <p v-else class="text-h1 font-semibold tracking-tight text-foreground" aria-live="off">
        <bdi class="tabular-nums" dir="ltr">{{ duration(worked) }}</bdi>
      </p>
      <p class="text-body-sm text-muted-foreground">
        {{ t.workedToday }}
        <template v-if="state !== 'out' && lastIn">
          {{ " · " }}{{ t.since("") }}<NqDateTime :value="lastIn.ms" :format="{ timeStyle: 'short' }" />
        </template>
      </p>
      <p v-if="props.shift" class="text-caption text-muted-foreground">
        <bdi dir="ltr">{{ t.shift(props.shift.start, props.shift.end) }}</bdi>
      </p>
      <p v-if="props.place" class="flex items-center gap-1 text-caption text-muted-foreground">
        <MapPin aria-hidden="true" class="size-3" />
        {{ props.place }}
      </p>
      <p v-if="firstIn && props.shift" :class="cn('text-caption', late ? 'text-nq-warning-text' : 'text-nq-success-text')">{{ lateText }}</p>
    </NqCardContent>
    <NqCardContent class="flex flex-wrap gap-2">
      <NqButton v-if="state === 'out'" variant="primary" :loading="busy === 'in'" :disabled="props.loading || Boolean(busy)" @click="punch('in')">
        <LogIn aria-hidden="true" />
        {{ t.clockIn }}
      </NqButton>
      <template v-else>
        <template v-if="props.breaks">
          <NqButton v-if="state === 'in'" :loading="busy === 'break-start'" :disabled="Boolean(busy)" @click="punch('break-start')">
            <Coffee aria-hidden="true" />
            {{ t.startBreak }}
          </NqButton>
          <NqButton v-else variant="primary" :loading="busy === 'break-end'" :disabled="Boolean(busy)" @click="punch('break-end')">
            <Undo2 aria-hidden="true" class="rtl:-scale-x-100" />
            {{ t.endBreak }}
          </NqButton>
        </template>
        <NqButton :loading="busy === 'out'" :disabled="Boolean(busy)" @click="punch('out')">
          <LogOut aria-hidden="true" />
          {{ t.clockOut }}
        </NqButton>
      </template>
    </NqCardContent>
    <NqCardContent v-if="error">
      <p role="alert" class="flex items-center gap-2 text-body-sm text-nq-danger-text">
        <CircleX aria-hidden="true" class="size-4" />
        {{ error }}
      </p>
    </NqCardContent>
    <NqCardContent class="flex flex-col gap-2">
      <h3 class="text-caption font-medium text-muted-foreground">{{ t.punches }}</h3>
      <p v-if="sorted.length === 0" class="text-body-sm text-muted-foreground">{{ t.noPunches }}</p>
      <ol v-else class="flex flex-col divide-y divide-border rounded-card bg-nq-surface">
        <li v-for="p in sorted" :key="p.id" class="flex items-center gap-3 px-3 py-2 text-body-sm">
          <component :is="PUNCH_ICON[p.kind]" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground rtl:-scale-x-100" />
          <span class="min-w-0 flex-1 truncate text-foreground">{{ label[p.kind] }}</span>
          <span v-if="p.place" class="hidden truncate text-caption text-muted-foreground sm:inline">{{ p.place }}</span>
          <NqDateTime :value="p.ms" :format="{ timeStyle: 'short' }" class="text-muted-foreground" />
        </li>
      </ol>
    </NqCardContent>
  </NqCard>
</template>
