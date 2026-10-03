<script setup lang="ts">
import { RefreshCw } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqButton } from "../button";
import { NqCard, NqCardContent, NqCardDescription, NqCardHeader, NqCardTitle } from "../card";
import { NqQrCode } from "../qr-code";
import { NqStatus } from "../status";
import { WHATSAPP_QR_STRINGS, type WhatsappConnectStatus, type WhatsappQrConnectLabels } from "./strings";

// Link a WhatsApp number by scanning a QR code. Presentational: your server owns the pairing session and feeds the
// current `qr` and its `expiresAt`. The code is drawn plain black on white with square modules, because phone cameras
// need the contrast; it is not restyled by the theme.
interface Props {
  status: WhatsappConnectStatus;
  /** The current pairing payload from your server. */
  qr?: string;
  /** When `qr` stops being valid (ms since epoch). The countdown runs to it, then `onRefresh` is called. */
  expiresAt?: number;
  /** The linked number, shown when connected. Rendered LTR. */
  account?: string;
  /** Display text for when it was linked, already formatted. */
  connectedSince?: string;
  onStart?: () => Promise<void>;
  /** Ask for a new code. Called by the button and automatically when the code expires. */
  onRefresh?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  /** Pairing failed to start or refresh. Shows a retry. */
  error?: boolean;
  /** Turn off the automatic refresh on expiry. Default true. */
  autoRefresh?: boolean;
  /** Current time in ms, for tests. Default `Date.now()`. */
  now?: () => number;
  labels?: Partial<WhatsappQrConnectLabels>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  qr: undefined,
  expiresAt: undefined,
  account: undefined,
  connectedSince: undefined,
  onStart: undefined,
  onRefresh: undefined,
  onDisconnect: undefined,
  error: false,
  autoRefresh: true,
  now: () => Date.now(),
  labels: undefined,
});

const nq = useNasaq();
const t = computed(() => ({ ...WHATSAPP_QR_STRINGS[nq.locale.value.startsWith("ar") ? "ar" : "en"], ...props.labels }));
const busy = ref<"start" | "refresh" | null>(null);
const left = ref<number | null>(null);
const showQr = computed(() => props.status === "qr" && !!props.qr);

let timer: ReturnType<typeof setInterval> | null = null;
function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}
// Countdown, one tick a second. On zero, ask for a new code once per code.
watch(
  () => [showQr.value, props.expiresAt, props.qr] as const,
  () => {
    stop();
    if (!showQr.value || props.expiresAt == null) {
      left.value = null;
      return;
    }
    const expiresAt = props.expiresAt;
    let fired = false;
    const tick = () => {
      const s = Math.max(0, Math.ceil((expiresAt - props.now()) / 1000));
      left.value = s;
      if (s === 0 && !fired) {
        fired = true;
        if (props.autoRefresh && props.onRefresh) {
          busy.value = "refresh";
          void props.onRefresh().finally(() => (busy.value = null));
        }
      }
    };
    tick();
    timer = setInterval(tick, 1000);
  },
  { immediate: true },
);
onBeforeUnmount(stop);

async function run(kind: "start" | "refresh", fn?: () => Promise<void>) {
  if (!fn || busy.value) return;
  busy.value = kind;
  try {
    await fn();
  } finally {
    busy.value = null;
  }
}

const tone = computed(() => (props.status === "connected" ? "success" : props.status === "qr" ? "info" : "neutral"));
const statusText = computed(() => (props.status === "connected" ? t.value.connected : props.status === "qr" ? t.value.connectingStatus : t.value.disconnected));
const expired = computed(() => left.value === 0);
const steps = computed(() => [t.value.step1, t.value.step2, t.value.step3]);
</script>

<template>
  <NqCard data-slot="whatsapp-qr-connect" :data-status="props.status" :class="cn('w-full max-w-2xl', props.class)">
    <NqCardHeader>
      <div class="flex flex-wrap items-center justify-between gap-2">
        <NqCardTitle as="h2">{{ t.title }}</NqCardTitle>
        <NqStatus :tone="tone">{{ statusText }}</NqStatus>
      </div>
      <NqCardDescription>{{ t.description }}</NqCardDescription>
    </NqCardHeader>
    <NqCardContent>
      <div v-if="props.status === 'connected'" class="flex flex-wrap items-center justify-between gap-3" data-slot="whatsapp-connected">
        <div class="flex min-w-0 flex-col gap-0.5">
          <p class="text-label text-foreground">
            {{ t.connectedAs("") }}<bdi dir="ltr" class="tabular-nums">{{ props.account }}</bdi>
          </p>
          <p v-if="props.connectedSince" class="text-caption text-muted-foreground">{{ t.since(props.connectedSince) }}</p>
        </div>
        <NqConfirmButton v-if="props.onDisconnect" variant="danger" size="sm" :title="t.disconnectTitle" :description="t.disconnectBody" :confirm-label="t.confirm" :cancel-label="t.cancel" :on-confirm="props.onDisconnect">
          {{ t.disconnect }}
        </NqConfirmButton>
      </div>
      <div v-else class="flex flex-col gap-5 sm:flex-row sm:items-start">
        <div class="flex shrink-0 flex-col items-center gap-2 self-center sm:self-start" data-slot="whatsapp-qr">
          <div v-if="showQr && props.qr" :class="cn('relative rounded-card border border-border bg-white p-2 transition-opacity', (expired || busy === 'refresh') && 'opacity-40')">
            <NqQrCode :value="props.qr" :size="192" :margin="1" :label="t.qrLabel" />
          </div>
          <div v-else class="flex size-[208px] items-center justify-center rounded-card border border-dashed border-border bg-secondary p-4 text-center">
            <span v-if="busy === 'start'" class="text-body-sm text-muted-foreground" role="status">{{ t.starting }}</span>
            <NqButton v-else type="button" variant="primary" size="sm" :disabled="!props.onStart" @click="run('start', props.onStart)">{{ t.start }}</NqButton>
          </div>
          <div v-if="showQr" class="flex flex-col items-center gap-1.5">
            <p v-if="left != null" class="text-caption tabular-nums text-muted-foreground" role="timer" aria-live="off" data-slot="whatsapp-countdown">
              {{ expired ? t.expired : t.expiresIn(left) }}
            </p>
            <NqButton type="button" variant="ghost" size="sm" :loading="busy === 'refresh'" :disabled="!props.onRefresh" @click="run('refresh', props.onRefresh)">
              <RefreshCw aria-hidden="true" />
              {{ busy === "refresh" ? t.refreshing : t.refresh }}
            </NqButton>
          </div>
        </div>
        <div class="flex min-w-0 flex-1 flex-col gap-3">
          <ol :aria-label="t.stepsLabel" class="flex flex-col gap-2.5">
            <li v-for="(s, i) in steps" :key="s" class="flex items-start gap-2.5 text-body-sm text-foreground">
              <span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-caption tabular-nums text-muted-foreground">{{ i + 1 }}</span>
              <span class="pt-0.5">{{ s }}</span>
            </li>
          </ol>
          <p v-if="showQr && props.autoRefresh" class="text-caption text-muted-foreground">{{ t.autoRefresh }}</p>
          <NqAlert v-if="props.error" tone="danger">
            {{ t.failed }}
            <template v-if="props.onStart || props.onRefresh" #action>
              <NqButton type="button" size="sm" variant="secondary" @click="run(showQr ? 'refresh' : 'start', showQr ? props.onRefresh : props.onStart)">{{ t.retry }}</NqButton>
            </template>
          </NqAlert>
        </div>
      </div>
    </NqCardContent>
  </NqCard>
</template>
