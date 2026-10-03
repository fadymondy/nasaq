<script setup lang="ts">
import { RefreshCw, Wifi, WifiOff } from "lucide-vue-next";
import { computed, h, ref, type FunctionalComponent, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useT } from "../../provider";
import { NqButton } from "../button";
import { NqDateTime } from "../numeric";
import { NqSpinner } from "../spinner";
import { useCountdown } from "./useCountdown";
import { formatCountdown, formatLatency, latencyQuality, signalBars, type DateLike, type LatencyQuality, type WsState } from "./ws-status-format";

// The state of a realtime connection (WebSocket, SSE): live with latency, connecting, reconnecting with a countdown,
// or offline with Retry now. Presentational: your socket code drives `state`, `latencyMs` and `retryAt`.
interface Props {
  state: WsState;
  /** Round trip time in ms. Shown while connected. */
  latencyMs?: number;
  /** When the next reconnect attempt fires. Shows a live countdown while `reconnecting`. */
  retryAt?: DateLike;
  /** Which attempt this is (1, 2, 3 ...). */
  attempt?: number;
  /** When the connection was last live. Shown in the banner while reconnecting or offline. */
  lastConnectedAt?: DateLike;
  /** `badge` is a compact pill. `inline` is bare text. `banner` is a full row with details and Retry. Default `badge`. */
  variant?: "badge" | "inline" | "banner";
  /** Reconnect right now. Shows Retry now on `reconnecting` and `offline`. */
  onRetry?: () => void | Promise<unknown>;
  /** Show the latency. Default true. */
  showLatency?: boolean;
  /** Override any string. */
  labels?: Partial<Record<"retry" | "latency" | "lastConnected" | "stale" | "label" | "reconnectNow", string>>;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  latencyMs: undefined,
  retryAt: undefined,
  attempt: undefined,
  lastConnectedAt: undefined,
  variant: "badge",
  onRetry: undefined,
  showLatency: true,
  labels: undefined,
});
const t = useT();
const stateText = computed(
  () =>
    ({
      connected: t("Live", "مباشر"),
      connecting: t("Connecting", "جارٍ الاتصال"),
      reconnecting: t("Reconnecting", "إعادة الاتصال"),
      offline: t("Offline", "غير متصل"),
    })[props.state],
);
const describe = computed(
  () =>
    ({
      connected: t("Live updates are on.", "التحديثات المباشرة مفعّلة."),
      connecting: t("Opening the live connection.", "جارٍ فتح الاتصال المباشر."),
      reconnecting: t("The live connection dropped. Trying again.", "انقطع الاتصال المباشر. جارٍ المحاولة مجددًا."),
      offline: t("You are offline. Live updates are paused.", "أنت غير متصل. التحديثات المباشرة متوقفة."),
    })[props.state],
);
const qualityText = (q: LatencyQuality) => ({ good: t("Fast", "سريع"), fair: t("Fair", "متوسط"), poor: t("Slow", "بطيء") })[q];
const L = computed(() => ({
  retry: props.labels?.retry ?? t("Retry now", "أعد المحاولة الآن"),
  latency: props.labels?.latency ?? t("Latency", "زمن الاستجابة"),
  lastConnected: props.labels?.lastConnected ?? t("Last connected", "آخر اتصال"),
  stale: props.labels?.stale ?? t("Data may be out of date.", "قد تكون البيانات قديمة."),
  label: props.labels?.label ?? t("Live connection status", "حالة الاتصال المباشر"),
  reconnectNow: props.labels?.reconnectNow ?? t("Retrying now", "جارٍ المحاولة الآن"),
}));

const seconds = useCountdown(() => (props.state === "reconnecting" ? props.retryAt : undefined));
const retrying = ref(false);
const tone: Record<WsState, { text: string; dot: string; box: string }> = {
  connected: { text: "text-nq-success-text", dot: "bg-nq-success", box: "border-nq-success/40 bg-nq-success-soft" },
  connecting: { text: "text-nq-info-text", dot: "bg-nq-info", box: "border-nq-info/40 bg-nq-info-soft" },
  reconnecting: { text: "text-nq-warning-text", dot: "bg-nq-warning", box: "border-nq-warning/40 bg-nq-warning-soft" },
  offline: { text: "text-nq-danger-text", dot: "bg-nq-danger", box: "border-nq-danger/40 bg-nq-danger-soft" },
};
const barTone: Record<LatencyQuality, string> = { good: "bg-nq-success", fair: "bg-nq-warning", poor: "bg-nq-danger" };
const c = computed(() => tone[props.state]);
const hasLatency = computed(() => props.showLatency && props.state === "connected" && props.latencyMs !== undefined && Number.isFinite(props.latencyMs));
const quality = computed<LatencyQuality>(() => (hasLatency.value ? latencyQuality(props.latencyMs as number) : "good"));
const lit = computed(() => signalBars(props.latencyMs));
const countdownText = computed(() => {
  if (props.state !== "reconnecting" || seconds.value === null) return null;
  return seconds.value > 0 ? t(`Retrying in ${formatCountdown(seconds.value)}`, `إعادة المحاولة بعد ${formatCountdown(seconds.value)}`) : L.value.reconnectNow;
});
const canRetry = computed(() => !!props.onRetry && (props.state === "reconnecting" || props.state === "offline"));
async function retry() {
  retrying.value = true;
  try {
    await props.onRetry?.();
  } finally {
    retrying.value = false;
  }
}

const StateIcon: FunctionalComponent<{ class?: string }> = (p) => {
  if (props.state === "connecting") return h(NqSpinner, { class: p.class });
  if (props.state === "reconnecting") return h(RefreshCw, { "aria-hidden": "true", class: cn("motion-safe:animate-spin", p.class) });
  if (props.state === "offline") return h(WifiOff, { "aria-hidden": "true", class: p.class });
  return h(Wifi, { "aria-hidden": "true", class: p.class });
};
</script>

<template>
  <div
    v-if="props.variant === 'banner'"
    data-slot="ws-status"
    :data-state="props.state"
    data-variant="banner"
    :class="cn('flex flex-col gap-3 rounded-card border p-3 sm:flex-row sm:items-center sm:justify-between', c.box, props.class)"
  >
    <div class="flex min-w-0 items-start gap-3">
      <StateIcon :class="cn('mt-0.5 size-4 shrink-0', c.text)" />
      <div class="flex min-w-0 flex-col gap-0.5">
        <p role="status" :aria-label="L.label" class="text-label text-foreground">{{ stateText }}</p>
        <p class="text-body-sm text-muted-foreground">{{ describe }}</p>
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground">
          <span v-if="countdownText" data-slot="ws-countdown" class="tabular-nums">{{ countdownText }}</span>
          <span v-if="props.state === 'reconnecting' && props.attempt">{{ t(`Attempt ${props.attempt}`, `المحاولة ${props.attempt}`) }}</span>
          <span v-if="hasLatency" data-slot="ws-latency" :title="`${L.latency}: ${qualityText(quality)}`" class="inline-flex items-center gap-1.5">
            <span aria-hidden="true" data-slot="ws-signal" class="inline-flex h-3 items-end gap-0.5">
              <span v-for="n in 3" :key="n" :class="cn('w-0.5 rounded-full', n <= lit ? barTone[quality] : 'bg-nq-line-strong')" :style="{ height: `${n * 4}px` }" />
            </span>
            <bdi dir="ltr" class="tabular-nums">{{ formatLatency(props.latencyMs as number) }}</bdi>
          </span>
          <span v-if="(props.state === 'reconnecting' || props.state === 'offline') && props.lastConnectedAt !== undefined" class="inline-flex gap-1">
            {{ L.lastConnected }}
            <NqDateTime :value="props.lastConnectedAt" relative />
          </span>
        </div>
        <p v-if="props.state === 'offline' || props.state === 'reconnecting'" class="text-caption text-muted-foreground">{{ L.stale }}</p>
      </div>
    </div>
    <NqButton v-if="canRetry" type="button" size="sm" variant="secondary" :loading="retrying" class="shrink-0" @click="retry">
      <RefreshCw aria-hidden="true" />
      {{ L.retry }}
    </NqButton>
  </div>

  <div
    v-else
    data-slot="ws-status"
    :data-state="props.state"
    :data-variant="props.variant"
    :class="
      props.variant === 'inline'
        ? cn('inline-flex flex-wrap items-center gap-2', props.class)
        : cn('inline-flex h-7 max-w-full items-center gap-2 rounded-full border border-border bg-card ps-2.5 text-body-sm', canRetry ? 'pe-1' : 'pe-3', props.class)
    "
  >
    <span aria-hidden="true" class="relative flex size-2 shrink-0">
      <span v-if="props.state === 'connected'" :class="cn('absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping', c.dot)" />
      <span :class="cn('relative inline-flex size-2 rounded-full', c.dot)" />
    </span>
    <span role="status" :aria-label="L.label" class="text-body-sm text-foreground">{{ stateText }}</span>
    <span v-if="countdownText" class="text-caption text-muted-foreground"><span data-slot="ws-countdown" class="tabular-nums">{{ countdownText }}</span></span>
    <span v-if="hasLatency" class="text-caption text-muted-foreground">
      <span data-slot="ws-latency" :title="`${L.latency}: ${qualityText(quality)}`" class="inline-flex items-center gap-1.5">
        <span aria-hidden="true" data-slot="ws-signal" class="inline-flex h-3 items-end gap-0.5">
          <span v-for="n in 3" :key="n" :class="cn('w-0.5 rounded-full', n <= lit ? barTone[quality] : 'bg-nq-line-strong')" :style="{ height: `${n * 4}px` }" />
        </span>
        <bdi dir="ltr" class="tabular-nums">{{ formatLatency(props.latencyMs as number) }}</bdi>
      </span>
    </span>
    <NqButton v-if="canRetry && props.variant === 'inline'" type="button" size="sm" variant="link" :loading="retrying" @click="retry">{{ L.retry }}</NqButton>
    <NqButton v-else-if="canRetry" type="button" size="sm" variant="ghost" :loading="retrying" class="h-5 rounded-full px-2 text-caption" @click="retry">{{ L.retry }}</NqButton>
  </div>
</template>
