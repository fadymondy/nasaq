<script setup lang="ts">
import { LockKeyhole, TimerReset } from "lucide-vue-next";
import { computed } from "vue";
import { NqAlertDialog, NqAlertDialogContent, NqAlertDialogDescription, NqAlertDialogFooter, NqAlertDialogHeader, NqAlertDialogTitle } from "../alert-dialog";
import { useAuthLocale } from "../auth-layout";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import { NqProgress } from "../progress";
import { STRINGS, type IdleLockLabels } from "./strings";

// The "Still there?" dialog with a live countdown. Only its two buttons close it.
const props = defineProps<{
  open: boolean;
  /** Seconds until the lock. */
  secondsLeft: number;
  /** The whole warning window, for the bar. */
  warningSeconds: number;
  labels?: Partial<IdleLockLabels>;
}>();
const emit = defineEmits<{ stay: []; lockNow: [] }>();

const locale = useAuthLocale();
const t = computed<IdleLockLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const time = computed(() => formatCountdown(props.secondsLeft));
// Announce every ten seconds and in the last five, not each tick.
const announce = computed(() => props.secondsLeft % 10 === 0 || props.secondsLeft <= 5);
</script>

<template>
  <NqAlertDialog :open="props.open">
    <NqAlertDialogContent data-slot="idle-warning">
      <NqAlertDialogHeader>
        <NqAlertDialogTitle class="flex items-center gap-2">
          <TimerReset aria-hidden="true" class="size-5 text-nq-warning-text" />
          {{ t.title }}
        </NqAlertDialogTitle>
        <NqAlertDialogDescription>{{ t.description.replace("{time}", time) }}</NqAlertDialogDescription>
      </NqAlertDialogHeader>
      <div class="flex flex-col gap-2">
        <p dir="ltr" role="timer" :aria-live="announce ? 'polite' : 'off'" :aria-label="t.remaining" class="text-center text-h2 text-foreground tabular-nums">
          {{ time }}
        </p>
        <NqProgress :value="props.warningSeconds > 0 ? (props.secondsLeft / props.warningSeconds) * 100 : 0" tone="warning" size="sm" :aria-label="t.remaining" />
      </div>
      <NqAlertDialogFooter>
        <NqButton variant="secondary" @click="emit('lockNow')">
          <LockKeyhole aria-hidden="true" />
          {{ t.lockNow }}
        </NqButton>
        <NqButton variant="primary" autofocus @click="emit('stay')">{{ t.stay }}</NqButton>
      </NqAlertDialogFooter>
    </NqAlertDialogContent>
  </NqAlertDialog>
</template>
