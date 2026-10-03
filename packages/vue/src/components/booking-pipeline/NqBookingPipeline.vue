<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqConfirmButton } from "../alert-dialog";
import { NqButton } from "../button";
import { NqStepper, NqStepperItem } from "../stepper";
import { NqTimeline, NqTimelineItem } from "../timeline";
import { BOOKING_STATUSES, nextStatuses, pipelineIndex, primaryNext, type BookingStatus, type BookingTransition } from "./booking-math";
import { STATUS_ICONS, useBookingStatusLabel } from "./booking-status";

// The staff view of one booking: the five stages, the moves the workflow allows from here as buttons, and the history as a
// timeline. No-show and cancelled show where the booking stopped. Only allowed moves are offered.
const STRINGS = {
  en: {
    stages: "Booking progress",
    history: "History",
    actions: "Move the booking",
    by: (n: string) => `by ${n}`,
    advanceTo: { confirmed: "Confirm", checked_in: "Check in", in_visit: "Start visit", done: "Finish visit", no_show: "Mark no-show", cancelled: "Cancel booking", requested: "Reopen" } as Record<BookingStatus, string>,
    reopen: "Reopen as confirmed",
    confirmTitle: (to: string) => `${to}?`,
    confirmText: { no_show: "The patient did not come. You can reopen it later if they arrive.", cancelled: "The slot is released. This cannot be undone." } as Partial<Record<BookingStatus, string>>,
    empty: "Nothing has happened yet.",
    failed: "That did not work. Try again.",
  },
  ar: {
    stages: "تقدّم الحجز",
    history: "السجل",
    actions: "نقل الحجز",
    by: (n: string) => `بواسطة ${n}`,
    advanceTo: { confirmed: "تأكيد", checked_in: "تسجيل الوصول", in_visit: "بدء الزيارة", done: "إنهاء الزيارة", no_show: "تسجيل عدم الحضور", cancelled: "إلغاء الحجز", requested: "إعادة الفتح" } as Record<BookingStatus, string>,
    reopen: "إعادة الفتح كمؤكد",
    confirmTitle: (to: string) => `${to}؟`,
    confirmText: { no_show: "المريض لم يحضر. يمكنك إعادة فتح الحجز إذا وصل لاحقًا.", cancelled: "سيتم تحرير الموعد. لا يمكن التراجع." } as Partial<Record<BookingStatus, string>>,
    empty: "لم يحدث شيء بعد.",
    failed: "لم تنجح العملية. حاول مجددًا.",
  },
};
export type BookingPipelineLabels = Partial<(typeof STRINGS)["en"]>;

type Result = void | { error?: string };
interface Props {
  /** Where the booking is now. */
  status: BookingStatus;
  /** Every move so far, oldest first. Drives the timeline. */
  history?: readonly BookingTransition[];
  /** Called with the status to move to. Return `{ error }` (or throw) to show the message and stay put. Omit for a read-only pipeline: no buttons. */
  onAdvance?: (to: BookingStatus) => Promise<Result>;
  /** Show the history timeline under the stages. Default true. */
  showHistory?: boolean;
  orientation?: "horizontal" | "vertical";
  labels?: BookingPipelineLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { history: () => [], showHistory: true, orientation: "horizontal" });

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as (typeof STRINGS)["en"]);
const name = useBookingStatusLabel();
const busy = ref<BookingStatus | null>(null);
const error = ref<string | null>(null);

const stopped = computed(() => props.status === "no_show" || props.status === "cancelled");
const current = computed(() => {
  if (!stopped.value) return pipelineIndex(props.status);
  for (let i = props.history.length - 1; i >= 0; i--) {
    const idx = pipelineIndex(props.history[i]!.status);
    if (idx >= 0) return idx;
  }
  return 0;
});

async function go(to: BookingStatus) {
  if (!props.onAdvance) return;
  busy.value = to;
  error.value = null;
  try {
    const result = await props.onAdvance(to);
    if (result && result.error) error.value = result.error;
  } catch {
    error.value = t.value.failed;
  } finally {
    busy.value = null;
  }
}

const next = computed(() => nextStatuses(props.status));
const primary = computed(() => primaryNext(props.status));
const label = (to: BookingStatus) => (props.status === "no_show" && to === "confirmed" ? t.value.reopen : t.value.advanceTo[to]);
const reversed = computed(() => [...props.history].reverse());
const describe = (h: BookingTransition) => [h.by ? t.value.by(h.by) : null, h.note ?? null].filter(Boolean).join(" · ") || undefined;
</script>

<template>
  <div data-slot="booking-pipeline" :data-status="props.status" :class="cn('flex flex-col gap-5', props.class)">
    <div tabindex="0" class="max-w-full overflow-x-auto rounded-control pb-1 outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <NqStepper :current="current" :orientation="props.orientation" :aria-label="t.stages">
        <NqStepperItem v-for="(s, i) in BOOKING_STATUSES" :key="s" :title="name(s)" :error="stopped && i === current" :description="stopped && i === current ? name(props.status) : undefined" />
      </NqStepper>
    </div>

    <div v-if="props.onAdvance && next.length > 0" role="group" :aria-label="t.actions" class="flex flex-wrap items-center gap-2">
      <template v-for="to in next" :key="to">
        <NqConfirmButton
          v-if="to === 'cancelled' || to === 'no_show'"
          variant="secondary"
          size="sm"
          :disabled="busy !== null"
          :title="t.confirmTitle(name(to))"
          :description="t.confirmText[to]"
          :confirm-label="label(to)"
          :on-confirm="() => go(to)"
        >
          {{ label(to) }}
        </NqConfirmButton>
        <NqButton v-else :variant="to === primary ? 'primary' : 'secondary'" size="sm" :disabled="busy !== null" @click="go(to)">{{ label(to) }}</NqButton>
      </template>
    </div>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>

    <section v-if="props.showHistory" :aria-label="t.history" class="flex flex-col gap-2">
      <h3 class="text-label font-semibold">{{ t.history }}</h3>
      <p v-if="props.history.length === 0" class="text-body-sm text-muted-foreground">{{ t.empty }}</p>
      <NqTimeline v-else>
        <NqTimelineItem v-for="(h, i) in reversed" :key="`${h.status}-${h.at.getTime()}-${i}`" :title="name(h.status)" :description="describe(h)" :time="h.at">
          <template #icon><component :is="STATUS_ICONS[h.status]" aria-hidden="true" class="size-3.5" /></template>
        </NqTimelineItem>
      </NqTimeline>
    </section>
  </div>
</template>
