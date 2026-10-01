<script lang="ts">
export interface PushDevice {
  id: string;
  name: string;
  kind?: "phone" | "tablet" | "computer";
  lastSeen?: number | Date | string;
  /** The device you are on now. */
  current?: boolean;
}
</script>

<script setup lang="ts">
import { Laptop, Smartphone, Tablet, Trash2 } from "lucide-vue-next";
import { ref, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqAlert from "../alert/NqAlert.vue";
import NqBadge from "../badge/NqBadge.vue";
import NqButton from "../button/NqButton.vue";
import { NqNotificationPermissionPrompt, type DesktopNotificationLabels, type DesktopPermission } from "../desktop-notification";
import NqDateTime from "../numeric/NqDateTime.vue";
import NqSwitch from "../switch/NqSwitch.vue";
import type { InstallPromptLabels } from "./strings";
import { fill, useInstallPromptLabels } from "./use-labels";

// The per-device push opt-in. Until the browser has allowed notifications it shows the soft ask from
// NqNotificationPermissionPrompt. Once allowed it shows one switch for this device and the list of the person's
// other subscribed devices, each removable, so a phone can be on while a laptop is off.
type Outcome = Promise<void | { error?: string }>;
const props = withDefaults(defineProps<{
  /** The browser's notification permission. From `useNotificationPermission()`. */
  permission: DesktopPermission;
  /** Opens the browser's permission dialog. From `useNotificationPermission().request`. */
  onRequestPermission: () => void | Promise<unknown>;
  /** Whether this device is subscribed to push. */
  subscribed: boolean;
  onSubscribedChange: (subscribed: boolean) => Outcome;
  /** Devices already subscribed, this one included when it is. */
  devices?: readonly PushDevice[];
  onRemoveDevice?: (id: string) => Outcome;
  onTest?: () => void;
  /** iPhone and iPad only deliver push to an installed app: show the note. */
  requiresInstall?: boolean;
  /** Opens the system settings when notifications are blocked. */
  onOpenSettings?: () => void;
  labels?: Partial<InstallPromptLabels>;
  permissionLabels?: Partial<DesktopNotificationLabels>;
  class?: HTMLAttributes["class"];
}>(), {
  devices: () => [],
  onRemoveDevice: undefined,
  onTest: undefined,
  requiresInstall: false,
  onOpenSettings: undefined,
  labels: undefined,
  permissionLabels: undefined,
});
defineOptions({ inheritAttrs: false });
const t = useInstallPromptLabels(() => props.labels);
const titleId = useId();
const saving = ref(false);
const removing = ref<string | null>(null);
const error = ref<string | null>(null);
const deviceIcon = { phone: Smartphone, tablet: Tablet, computer: Laptop } as const;

async function toggle(on: boolean) {
  saving.value = true;
  error.value = null;
  try {
    const result = await props.onSubscribedChange(on);
    if (result && result.error) error.value = result.error;
  } finally {
    saving.value = false;
  }
}
async function remove(id: string) {
  if (!props.onRemoveDevice) return;
  removing.value = id;
  try {
    await props.onRemoveDevice(id);
  } finally {
    removing.value = null;
  }
}
</script>

<template>
  <section
    v-bind="$attrs"
    data-slot="push-opt-in"
    :aria-labelledby="titleId"
    :class="cn('flex w-full max-w-xl flex-col gap-4 rounded-card border border-border bg-card p-4', props.class)"
  >
    <header class="flex flex-col gap-1">
      <h2 :id="titleId" class="text-h3">{{ t.pushTitle }}</h2>
      <p class="text-body-sm text-muted-foreground">{{ t.pushDescription }}</p>
    </header>
    <NqAlert v-if="props.requiresInstall" tone="info">{{ t.pushNeedsInstall }}</NqAlert>
    <NqNotificationPermissionPrompt
      v-if="props.permission !== 'granted'"
      class="max-w-none"
      :permission="props.permission"
      :on-request="props.onRequestPermission"
      :on-open-settings="props.onOpenSettings"
      :labels="props.permissionLabels"
    />
    <template v-else>
      <div class="flex items-center justify-between gap-4 rounded-control border border-border p-3">
        <div class="flex min-w-0 flex-col">
          <span :id="`${titleId}-switch`" class="text-label">{{ t.pushSwitch }}</span>
          <span class="text-caption text-muted-foreground" aria-live="polite">{{ props.subscribed ? t.pushOn : t.pushOff }}</span>
        </div>
        <NqSwitch :model-value="props.subscribed" :disabled="saving" :aria-labelledby="`${titleId}-switch`" @update:model-value="toggle" />
      </div>
      <NqAlert v-if="error" tone="danger">{{ error }}</NqAlert>
      <div v-if="props.subscribed && props.onTest">
        <NqButton variant="secondary" size="sm" @click="props.onTest()">{{ t.test }}</NqButton>
      </div>
      <div class="flex flex-col gap-2">
        <h3 class="text-label">{{ t.devices }}</h3>
        <ul v-if="props.devices.length" class="flex flex-col divide-y divide-border rounded-control border border-border">
          <li v-for="d in props.devices" :key="d.id" class="flex items-center gap-3 p-3">
            <component :is="deviceIcon[d.kind ?? 'computer']" aria-hidden="true" class="size-4 shrink-0 text-muted-foreground" />
            <div class="flex min-w-0 flex-1 flex-col">
              <span class="flex items-center gap-2 text-body-sm">
                <span dir="auto" class="truncate">{{ d.name }}</span>
                <NqBadge v-if="d.current" variant="info">{{ t.thisDevice }}</NqBadge>
              </span>
              <span v-if="d.lastSeen !== undefined" class="text-caption text-muted-foreground">
                {{ t.lastSeen }} <NqDateTime :value="d.lastSeen" relative />
              </span>
            </div>
            <NqButton
              v-if="props.onRemoveDevice && !d.current"
              variant="ghost"
              size="icon-sm"
              :aria-label="fill(t.remove, { name: d.name })"
              :loading="removing === d.id"
              @click="remove(d.id)"
            >
              <Trash2 aria-hidden="true" />
            </NqButton>
          </li>
        </ul>
        <p v-else class="text-body-sm text-muted-foreground">{{ t.noDevices }}</p>
      </div>
    </template>
  </section>
</template>
