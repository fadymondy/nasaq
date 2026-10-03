<script setup lang="ts">
import { WifiOff } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useQueueNow, useWaitingLabels, type QueueConnection, type WaitingScreenLabels } from "./strings";

// A small "Live" dot with the connection state in words and, when given, how old the data is. Never colour alone.
interface Props {
  connection?: QueueConnection;
  /** When the data last arrived (epoch ms). Shows "Updated 12 s ago". */
  updatedAt?: number;
  /** Overrides the clock (for examples and tests). */
  now?: number;
  labels?: WaitingScreenLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { connection: "live", updatedAt: undefined, now: undefined, labels: undefined });
const t = useWaitingLabels(() => props.labels);
const clock = useQueueNow(() => props.now);
const text = computed(() => (props.connection === "live" ? t.value.live : props.connection === "reconnecting" ? t.value.reconnecting : t.value.offline));
const seconds = computed(() => (props.updatedAt === undefined ? null : Math.max(0, Math.round((clock.value - props.updatedAt) / 1000))));
const dot = computed(() => (props.connection === "live" ? "bg-nq-success-text" : "bg-nq-warning-text"));
</script>

<template>
  <span data-slot="queue-live" :data-connection="connection" role="status" :aria-label="`${t.connection}: ${text}`" :class="cn('inline-flex items-center gap-1.5 text-caption text-muted-foreground', props.class)">
    <WifiOff v-if="connection === 'offline'" aria-hidden="true" class="size-3.5 text-nq-danger-text" />
    <span v-else aria-hidden="true" class="relative flex size-2">
      <span :class="cn('absolute inline-flex size-full rounded-full opacity-60 motion-safe:animate-ping', dot)" />
      <span :class="cn('relative inline-flex size-2 rounded-full', dot)" />
    </span>
    <span class="font-medium text-foreground">{{ text }}</span>
    <span v-if="seconds !== null">· {{ t.updated(seconds) }}</span>
  </span>
</template>
