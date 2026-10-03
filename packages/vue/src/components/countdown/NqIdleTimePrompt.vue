<script setup lang="ts">
import { Coffee, TimerOff } from "lucide-vue-next";
import { computed, ref, watch } from "vue";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { NqButton } from "../button";
import { useFormatDate } from "../numeric";
import { fill, useCountdownStrings, type CountdownLabels } from "./strings";
import type { IdleTime } from "./use-idle-time";

// "You were away for N min. Keep it or discard it?" Only its buttons close it, so the answer is never skipped.
interface Props {
  /** The idle period to ask about, or null to hide the prompt. From `useIdleTime`. */
  idle: IdleTime | null;
  /** Show the third button, "Discard and stop". */
  discardAndStop?: boolean;
  labels?: CountdownLabels;
}
const props = withDefaults(defineProps<Props>(), { discardAndStop: false, labels: undefined });
const emit = defineEmits<{
  /** Keep the idle time in the tracked total. */
  keep: [];
  /** Remove the idle time from the tracked total and keep the timer running. */
  discard: [idle: IdleTime];
  /** Remove the idle time and stop the timer. */
  discardAndStop: [idle: IdleTime];
}>();

const t = useCountdownStrings(() => props.labels);
const format = useFormatDate();
// Keep the last period while the dialog fades out.
const shown = ref<IdleTime | null>(props.idle);
watch(
  () => props.idle,
  (v) => {
    if (v) shown.value = v;
  },
);
const minutes = computed(() => (shown.value ? Math.max(1, Math.floor(shown.value.idleMs / 60000)) : 0));
const time = computed(() => (shown.value ? format.date(shown.value.since, { hour: "numeric", minute: "2-digit" }) : ""));
</script>

<template>
  <NqAlertDialog :open="props.idle !== null">
    <NqAlertDialogContent data-slot="idle-time-prompt">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle class="inline-flex items-center gap-2">
          <TimerOff aria-hidden="true" class="size-5 text-nq-warning-text" />
          {{ t.idleTitle }}
        </NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ fill(t.idleDescription, { minutes, time: `⁦${time}⁩` }) }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <NqAlertDialogFooter>
        <NqButton v-if="props.discardAndStop" variant="ghost" @click="shown && emit('discardAndStop', shown)">{{ t.idleStop }}</NqButton>
        <NqButton variant="secondary" @click="shown && emit('discard', shown)">{{ fill(t.idleDiscard, { minutes }) }}</NqButton>
        <NqButton variant="primary" @click="emit('keep')">
          <Coffee aria-hidden="true" />
          {{ t.idleKeep }}
        </NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
