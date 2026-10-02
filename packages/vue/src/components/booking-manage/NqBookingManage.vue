<script setup lang="ts">
import { CalendarClock } from "lucide-vue-next";
import { computed, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBookingSlots } from "../booking-slots";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogFooter, NqDialogHeader, NqDialogTitle } from "../dialog";
import { evaluatePolicy, type BookingPolicy, type BookingSlot } from "./booking-math";
import { STRINGS, type BookingManageLabels } from "./strings";
import type { BookingRecord } from "./types";
import NqBookingTicket from "./NqBookingTicket.vue";

// A patient's own booking page: the ticket plus reschedule and cancel. The buttons follow the policy: reschedule
// closes some hours before the visit, cancelling late may cost a fee and the dialog says how much before the patient confirms.
interface Props {
  booking: BookingRecord;
  /** Cancel and reschedule limits. */
  policy: BookingPolicy;
  /** The times the patient can move to. Called when the reschedule dialog opens. */
  getSlots: (booking: BookingRecord) => Promise<readonly BookingSlot[]>;
  /** Move the booking. Return `{ error }` to show a message and keep the dialog open. */
  onReschedule: (start: Date) => Promise<void | { error?: string }>;
  /** Cancel the booking. Return `{ error }` to show a message. */
  onCancel: () => Promise<void | { error?: string }>;
  /** Overrides "now" (for tests and stories). */
  now?: Date;
  labels?: Partial<BookingManageLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { now: undefined, labels: undefined });

const nq = useNasaq();
const t = computed(() => ({ ...STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }) as BookingManageLabels);
const now = computed(() => props.now ?? new Date());
const rule = computed(() => evaluatePolicy(props.booking.start, now.value, props.policy, props.booking.status));
const open = ref(false);
const slots = ref<readonly BookingSlot[] | null>(null);
const pick = ref<Date | null>(null);
const saving = ref(false);
const error = ref<string | null>(null);

async function openDialog() {
  open.value = true;
  pick.value = null;
  error.value = null;
  if (!slots.value) slots.value = await props.getSlots(props.booking);
}
async function move() {
  if (!pick.value) return;
  saving.value = true;
  error.value = null;
  try {
    const r = await props.onReschedule(pick.value);
    if (r && r.error) error.value = r.error;
    else open.value = false;
  } catch {
    error.value = t.value.failed;
  } finally {
    saving.value = false;
  }
}
async function cancel() {
  const r = await props.onCancel();
  if (r && r.error) {
    error.value = r.error;
    throw new Error(r.error);
  }
}
function setOpen(v: boolean) {
  if (!saving.value) open.value = v;
}

const policyText = computed(() => {
  const r = rule.value;
  if (r.canCancel) return r.freeCancel ? t.value.freeCancel(props.policy.cancelHours) : r.feePercent > 0 ? t.value.lateFee(r.feePercent) : t.value.lateNoFee;
  return props.booking.status === "cancelled" ? t.value.cancelledNote : t.value.tooLate;
});
</script>

<template>
  <div data-slot="booking-manage" :class="cn('flex flex-col gap-4', props.class)">
    <NqAlert v-if="booking.status === 'cancelled'" tone="danger">{{ t.cancelledNote }}</NqAlert>
    <NqBookingTicket :booking="booking" :labels="labels" :hide-calendar="booking.status === 'cancelled'">
      <NqButton v-if="rule.canReschedule" variant="secondary" size="sm" @click="openDialog">
        <CalendarClock aria-hidden="true" />
        {{ t.reschedule }}
      </NqButton>
      <NqConfirmButton v-if="rule.canCancel" size="sm" variant="danger" :title="t.cancelTitle" :description="policyText" :confirm-label="t.cancelConfirm" :on-confirm="cancel">
        {{ t.cancel }}
      </NqConfirmButton>
    </NqBookingTicket>
    <p class="text-caption text-muted-foreground" data-slot="booking-policy">
      {{ policyText }}{{ rule.canCancel && !rule.canReschedule ? ` ${t.noReschedule(policy.rescheduleHours ?? policy.cancelHours)}` : "" }}
    </p>
    <p v-if="error && !open" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>

    <NqDialog :open="open" @update:open="setOpen">
      <NqDialogContent class="max-w-3xl">
        <NqDialogHeader>
          <NqDialogTitle>{{ t.rescheduleTitle }}</NqDialogTitle>
          <NqDialogDescription>{{ t.rescheduleText }}</NqDialogDescription>
        </NqDialogHeader>
        <NqBookingSlots v-model="pick" :slots="slots ?? []" :loading="slots === null" :now="now" :default-day="booking.start" />
        <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
        <NqDialogFooter>
          <NqButton variant="ghost" :disabled="saving" @click="open = false">{{ t.close }}</NqButton>
          <NqButton :disabled="!pick || saving" @click="move">{{ t.confirmMove }}</NqButton>
        </NqDialogFooter>
      </NqDialogContent>
    </NqDialog>
  </div>
</template>
