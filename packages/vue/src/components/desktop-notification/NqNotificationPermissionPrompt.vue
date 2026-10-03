<script setup lang="ts">
import { computed, ref, useId, type HTMLAttributes } from "vue";
import { BellOff, BellRing } from "lucide-vue-next";
import { cn } from "../../lib/cn";
import NqButton from "../button/NqButton.vue";
import { permissionStep, type DesktopPermission } from "./permission";
import type { DesktopNotificationLabels } from "./strings";
import { useDesktopNotificationLabels } from "./use-labels";

// The soft ask that comes before the system's own dialog. It explains why first, so people do not reflexively press
// Block (which can not be undone from inside the app), then waits, then confirms, or explains how to unblock.
interface Props {
  permission: DesktopPermission;
  /** Opens the system dialog. Resolves with the answer, and the prompt follows `permission`. */
  onRequest: () => void | Promise<unknown>;
  /** "Not now". Omit to hide the button. */
  onDismiss?: () => void;
  /** Sends a test notification once granted. */
  onTest?: () => void;
  /** Opens the operating system's settings when blocked. Omit to show only the words. */
  onOpenSettings?: () => void;
  labels?: Partial<DesktopNotificationLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { onDismiss: undefined, onTest: undefined, onOpenSettings: undefined, labels: undefined });
const t = useDesktopNotificationLabels(() => props.labels);
const titleId = useId();
const asking = ref(false);
const step = computed(() => permissionStep(props.permission, asking.value));
const copy = computed(
  () =>
    ({
      ask: [t.value.askTitle, t.value.askBody],
      asking: [t.value.waitingTitle, t.value.waitingBody],
      granted: [t.value.grantedTitle, t.value.grantedBody],
      denied: [t.value.deniedTitle, t.value.deniedBody],
      unsupported: [t.value.unsupportedTitle, t.value.unsupportedBody],
    })[step.value],
);
const Icon = computed(() => (step.value === "denied" || step.value === "unsupported" ? BellOff : BellRing));

async function request() {
  asking.value = true;
  try {
    await props.onRequest();
  } finally {
    asking.value = false;
  }
}
</script>

<template>
  <div
    role="group"
    :aria-labelledby="titleId"
    data-slot="desktop-notification-permission"
    :data-step="step"
    :class="cn('flex w-full max-w-md flex-col gap-3 rounded-card border border-border bg-card p-4', props.class)"
  >
    <div class="flex items-start gap-3">
      <span aria-hidden="true" :class="cn('grid size-9 shrink-0 place-items-center rounded-full', step === 'denied' ? 'bg-nq-warning-soft' : 'bg-secondary')">
        <component :is="Icon" class="size-4" />
      </span>
      <div class="flex min-w-0 flex-col gap-1" aria-live="polite">
        <h3 :id="titleId" class="text-label">{{ copy[0] }}</h3>
        <p class="text-body-sm text-muted-foreground">{{ copy[1] }}</p>
      </div>
    </div>
    <div class="flex flex-wrap justify-end gap-2">
      <template v-if="step === 'ask' || step === 'asking'">
        <NqButton v-if="onDismiss" variant="ghost" :disabled="step === 'asking'" @click="onDismiss()">{{ t.later }}</NqButton>
        <NqButton variant="primary" :loading="step === 'asking'" @click="request">{{ t.enable }}</NqButton>
      </template>
      <NqButton v-if="step === 'granted' && onTest" variant="secondary" @click="onTest()">{{ t.test }}</NqButton>
      <NqButton v-if="step === 'denied' && onOpenSettings" variant="secondary" @click="onOpenSettings()">{{ t.openSettings }}</NqButton>
    </div>
  </div>
</template>
