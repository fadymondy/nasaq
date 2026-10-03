<script setup lang="ts">
import { ShieldCheck, TriangleAlert } from "lucide-vue-next";
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqDangerZone, NqSettingsSection } from "../account-settings";
import { NqAlert } from "../alert";
import { NqButton } from "../button";
import { formatNumber, NqDateTime } from "../numeric";
import { NqProgress } from "../progress";
import { daysRemaining, deletionDate, deletionPhase, graceElapsed } from "./privacy-rules";
import { dataPrivacyStrings, type DataPrivacyLabels } from "./strings";
import type { PrivacyDate } from "./types";

// Delete the account with a grace period. Asking needs the confirm text typed; the account is then only scheduled.
// While scheduled the screen shows the date, the days left and a Cancel deletion button; after the date it says the
// account is being deleted.
interface Props {
  /** When the account will be deleted, or `null` if nothing is scheduled. */
  scheduledFor?: PrivacyDate | null;
  /** Days between asking and deleting. Default 30. */
  graceDays?: number;
  /** The text to type to confirm, usually the email. */
  confirmText: string;
  /** Schedule the deletion. Resolve `{ scheduledFor }` to show the real date; throw to keep the dialog open. */
  onSchedule: () => Promise<void | { scheduledFor?: PrivacyDate }>;
  /** Cancel a scheduled deletion. Resolve `{ error }` (or throw) to show a failure. */
  onCancel: () => Promise<void | { error?: string }>;
  /** Clock for the countdown. Default the current time. */
  now?: Date;
  labels?: DataPrivacyLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { scheduledFor: null, graceDays: 30, now: undefined, labels: undefined });

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const t = computed(() => ({ ...dataPrivacyStrings(locale.value), ...props.labels }));
const date = ref<PrivacyDate | null>(props.scheduledFor ?? null);
const busy = ref(false);
const notice = ref<{ tone: "success" | "danger"; text: string } | null>(null);
watch(
  () => props.scheduledFor,
  (d) => (date.value = d ?? null),
);

const clock = computed(() => props.now ?? new Date());
const phase = computed(() => deletionPhase(date.value, clock.value));
const days = computed(() => formatNumber(props.graceDays, locale.value));
const left = computed(() => (date.value ? daysRemaining(date.value, clock.value) : 0));
const dangerLabels = computed(() => ({
  button: t.value.deleteButton,
  confirmTitle: t.value.deleteConfirmTitle,
  confirmDescription: t.value.deleteConfirmBody(days.value),
  confirmPrompt: t.value.deletePrompt,
  confirmAction: t.value.deleteAction,
  cancel: t.value.cancel,
  failed: t.value.deleteFailed,
}));

async function schedule() {
  const r = await props.onSchedule();
  date.value = (r && r.scheduledFor) || deletionDate(clock.value, props.graceDays);
  notice.value = null;
}

async function cancel() {
  busy.value = true;
  notice.value = null;
  try {
    const r = await props.onCancel();
    if (r && typeof r === "object" && r.error) notice.value = { tone: "danger", text: r.error };
    else {
      date.value = null;
      notice.value = { tone: "success", text: t.value.cancelledOk };
    }
  } catch {
    notice.value = { tone: "danger", text: t.value.cancelFailed };
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <div v-if="phase === 'none'" data-slot="account-deletion" data-phase="none" :class="cn('flex flex-col gap-4', props.class)">
    <NqAlert v-if="notice" :tone="notice.tone" dismissible @dismiss="notice = null">{{ notice.text }}</NqAlert>
    <NqDangerZone
      :title="t.deleteTitle"
      :heading="t.deleteHeading"
      :description="t.deleteBody(days)"
      :confirm-text="props.confirmText"
      :on-delete="schedule"
      :labels="dangerLabels"
    />
  </div>
  <NqSettingsSection v-else data-slot="account-deletion" :data-phase="phase" tone="danger" :title="phase === 'due' ? t.dueTitle : t.scheduledTitle" :class="props.class">
    <div class="flex flex-col gap-4">
      <template v-if="phase === 'pending' && date">
        <NqAlert tone="warning" :icon="TriangleAlert">
          <span>
            {{ t.scheduledOn }} <NqDateTime :value="date" :format="{ dateStyle: 'long' }" /> ·
            <strong>{{ left <= 1 ? t.lessThanDay : t.daysLeft(formatNumber(left, locale)) }}</strong>
          </span>
        </NqAlert>
        <NqProgress :value="Math.round(graceElapsed(date, props.graceDays, clock) * 100)" tone="warning" size="sm" :label="t.graceProgress" />
        <p class="text-body-sm text-muted-foreground">{{ t.scheduledBody }}</p>
        <div>
          <NqButton variant="primary" :loading="busy" @click="cancel">
            <ShieldCheck />
            {{ t.cancelDeletion }}
          </NqButton>
        </div>
      </template>
      <p v-else class="text-body-sm text-muted-foreground">{{ t.dueBody }}</p>
      <NqAlert v-if="notice" :tone="notice.tone" :role="notice.tone === 'danger' ? 'alert' : 'status'" dismissible @dismiss="notice = null">{{ notice.text }}</NqAlert>
    </div>
  </NqSettingsSection>
</template>
