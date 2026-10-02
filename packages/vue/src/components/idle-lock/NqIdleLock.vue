<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqIdleWarningDialog from "./NqIdleWarningDialog.vue";
import type { IdleLockLabels, IdleLockReason } from "./strings";
import { useIdleLock } from "./useIdleLock";

// Wraps the app so it locks itself after a period of inactivity. Shows the "Still there?" countdown first, then
// covers the app with your `lockScreen` slot. The timer is a courtesy: expire the session on the server as well.
interface Props {
  /** Idle seconds before the lock. Default 300. */
  timeoutSeconds?: number;
  /** Seconds before the lock that the warning shows. Default 30. `0` skips the warning. */
  warningSeconds?: number;
  /** Controlled lock state, so the app can also lock on demand (a "Lock" menu item). `v-model:locked`. */
  locked?: boolean;
  defaultLocked?: boolean;
  /** Pause the timer, for example while signed out. */
  disabled?: boolean;
  /** Remove the app from the DOM while locked instead of hiding it. */
  unmountWhenLocked?: boolean;
  labels?: Partial<IdleLockLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  timeoutSeconds: 300,
  warningSeconds: 30,
  locked: undefined,
  defaultLocked: false,
  disabled: false,
  unmountWhenLocked: false,
  labels: undefined,
  class: undefined,
});
const emit = defineEmits<{
  "update:locked": [locked: boolean];
  /** `true` and why when it locks, `false` when it unlocks. */
  lockedChange: [locked: boolean, reason: IdleLockReason];
}>();
defineSlots<{
  /** The app. It stays mounted but inert and hidden from assistive tech while locked; pass `unmount-when-locked` when its content is sensitive. */
  default?: () => unknown;
  /** What covers the app when locked: a `NqLockScreen`. Call `unlock` after verifying. */
  lockScreen?: (props: { unlock: () => void }) => unknown;
}>();

const inner = ref(props.defaultLocked);
const isLocked = computed(() => props.locked ?? inner.value);
function setLocked(next: boolean, reason: IdleLockReason) {
  if (props.locked === undefined) inner.value = next;
  emit("update:locked", next);
  emit("lockedChange", next, reason);
}
const idle = useIdleLock({
  timeoutSeconds: () => props.timeoutSeconds,
  warningSeconds: () => props.warningSeconds,
  disabled: () => props.disabled || isLocked.value,
  onIdle: () => setLocked(true, "idle"),
});

function unlock() {
  setLocked(false, "manual");
  idle.reset();
}
const warning = computed(() => !isLocked.value && !props.disabled && idle.phase.value === "warning");
</script>

<template>
  <div data-slot="idle-lock" :data-locked="isLocked ? '' : undefined" :class="cn('contents', props.class)">
    <div v-if="!(props.unmountWhenLocked && isLocked)" data-slot="idle-lock-app" class="contents" :inert="isLocked || undefined" :aria-hidden="isLocked || undefined">
      <slot />
    </div>
    <NqIdleWarningDialog
      :open="warning"
      :seconds-left="idle.secondsLeft.value"
      :warning-seconds="props.warningSeconds"
      :labels="props.labels"
      @stay="idle.stayActive"
      @lock-now="setLocked(true, 'manual')"
    />
    <div v-if="isLocked" data-slot="idle-lock-screen" class="fixed inset-0 z-[60] overflow-y-auto bg-background">
      <slot name="lockScreen" :unlock="unlock" />
    </div>
  </div>
</template>
