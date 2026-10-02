<script setup lang="ts">
import { Ban, Check, TimerOff } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useAuthLocale } from "../auth-layout";
import { formatCountdown } from "../auth-layout/auth-utils";
import { NqButton } from "../button";
import { NqCard } from "../card";
import { NqCopyButton, NqCopyField } from "../copy-button";
import { NqQrCode } from "../qr-code";
import { NqSpinner } from "../spinner";
import { codeSecondsLeft, effectiveCodeStatus, formatUserCode, type DeviceCodeStatus } from "./device-code";
import { STRINGS, type DevicePairingLabels } from "./strings";
import { useCountdownClock } from "./use-now";

// The OAuth device flow, seen from the device asking for access: a big copyable code, the address to visit, a QR code to skip
// the typing, and a live state (waiting, approved, denied, expired).
interface Props {
  /** The user code, `WDJBMJHT`. Shown grouped and copyable. */
  code: string;
  /** The address to open, e.g. `https://nasaq.app/device`. */
  verificationUri: string;
  /** The address with the code filled in. When set, it is the QR code's content. */
  verificationUriComplete?: string;
  /** Poll your token endpoint and pass the state. Default `pending`. */
  status?: DeviceCodeStatus;
  expiresAt?: Date | number | string;
  /** Adds "Get a new code" when it expired. */
  onRefresh?: () => void;
  labels?: Partial<DevicePairingLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { verificationUriComplete: undefined, status: "pending", expiresAt: undefined, onRefresh: undefined, labels: undefined });
defineSlots<{
  /** Host mark shown above. Default: none. */
  mark?: () => unknown;
}>();
const locale = useAuthLocale();
const t = computed<DevicePairingLabels>(() => ({ ...STRINGS[locale.value], ...props.labels }));
const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
const now = useCountdownClock(() => props.expiresAt);
const shown = computed(() => effectiveCodeStatus(props.status, props.expiresAt, now.value));
const left = computed(() => (props.expiresAt !== undefined ? codeSecondsLeft(props.expiresAt, now.value) : undefined));
const grouped = computed(() => formatUserCode(props.code));
</script>

<template>
  <NqCard data-slot="device-code-display" :data-status="shown" :class="cn('mx-auto w-full max-w-lg gap-5 p-6 text-center sm:p-8', props.class)">
    <div v-if="$slots.mark" class="flex justify-center"><slot name="mark" /></div>
    <header class="flex flex-col gap-1.5">
      <h1 class="text-h2 text-foreground">{{ t.displayTitle }}</h1>
      <p class="text-body-sm text-muted-foreground">{{ t.displayDescription }}</p>
    </header>
    <div class="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-center sm:gap-6">
      <div :class="cn('flex flex-col items-center gap-1', shown !== 'pending' && 'opacity-50')" data-slot="device-code-qr">
        <div class="rounded-card border border-border bg-white p-1">
          <NqQrCode :value="verificationUriComplete ?? verificationUri" :size="148" :margin="1" :label="t.scan" />
        </div>
      </div>
      <div class="flex min-w-0 flex-1 flex-col items-stretch gap-3 text-start">
        <div class="flex flex-col gap-1">
          <span class="text-caption text-muted-foreground">{{ t.address }}</span>
          <NqCopyField :value="verificationUri" :label="t.address" />
        </div>
        <div class="flex flex-col gap-1">
          <span class="text-caption text-muted-foreground">{{ t.yourCode }}</span>
          <div :class="cn('flex items-center justify-between gap-2 rounded-control border border-border bg-muted/50 py-2 ps-4 pe-2', shown !== 'pending' && 'opacity-60')">
            <span data-slot="device-code" dir="ltr" class="font-mono text-h2 tracking-[0.12em] text-foreground">{{ grouped }}</span>
            <NqCopyButton :value="grouped" variant="secondary" />
          </div>
        </div>
      </div>
    </div>
    <div aria-live="polite" role="status" data-slot="device-code-status" class="flex flex-col items-center gap-2">
      <p v-if="shown === 'pending'" class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
        <NqSpinner />
        {{ t.waiting }}
        <span v-if="left !== undefined" dir="ltr" class="tabular-nums">· {{ fill(t.expiresIn, { time: formatCountdown(left) }) }}</span>
      </p>
      <p v-if="shown === 'approved'" class="inline-flex items-center gap-2 text-body-sm text-nq-success-text">
        <Check aria-hidden="true" class="size-4" />
        {{ t.approvedDevice }}
      </p>
      <p v-if="shown === 'denied'" class="inline-flex items-center gap-2 text-body-sm text-nq-danger-text">
        <Ban aria-hidden="true" class="size-4" />
        {{ t.deniedDevice }}
      </p>
      <template v-if="shown === 'expired'">
        <p class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
          <TimerOff aria-hidden="true" class="size-4" />
          {{ t.expiredTitle }}
        </p>
        <NqButton v-if="onRefresh" variant="primary" @click="onRefresh()">{{ t.refresh }}</NqButton>
      </template>
    </div>
  </NqCard>
</template>
