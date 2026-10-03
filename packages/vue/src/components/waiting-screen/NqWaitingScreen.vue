<script setup lang="ts">
import { BellRing, CircleCheck, DoorOpen, Hourglass, LogOut, Stethoscope, Users } from "lucide-vue-next";
import { computed, ref, watch, type Component, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAlert } from "../alert";
import { NqConfirmButton } from "../alert-dialog";
import { NqBadge } from "../badge";
import { NqCard, NqCardContent, NqCardHeader, NqCardTitle } from "../card";
import { NqNum } from "../numeric";
import NqQueueLiveIndicator from "./NqQueueLiveIndicator.vue";
import { estimateWaitMinutes, nowServing, positionInQueue, type QueueEntry } from "./queue-math";
import { useWaitingLabels, type QueueConnection, type WaitingScreenLabels } from "./strings";

// What a patient sees on their phone after checking in: the ticket number, how many people are ahead, the estimated wait, who is being
// served now, and a loud banner (with a short vibration where supported) when it is their turn. Position and estimate are computed from
// `entries` with the same rules reception uses.
interface Props {
  /** The whole queue, so position, wait time and "now serving" agree with what reception sees. */
  entries: readonly QueueEntry[];
  /** Which entry is this patient. */
  entryId: string;
  /** Average visit length in minutes, for the estimate. Default 10. */
  averageMinutes?: number;
  /** Rooms open now, for the estimate. Default 1. */
  rooms?: number;
  /** Clinic or department name in the header. */
  clinic?: string;
  /** Live connection state. Default "live". */
  connection?: QueueConnection;
  /** When the queue last updated (epoch ms). */
  updatedAt?: number;
  /** Overrides the clock (epoch ms) for examples and tests. */
  now?: number;
  /** Leave the line. Omit to hide the button. Return `{ error }` (or throw) to keep the dialog open and show the message. */
  onLeave?: () => void | Promise<void | { error?: string }>;
  labels?: WaitingScreenLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { averageMinutes: 10, rooms: 1, clinic: undefined, connection: "live", updatedAt: undefined, now: undefined, onLeave: undefined, labels: undefined });
const t = useWaitingLabels(() => props.labels);

const entry = computed(() => props.entries.find((e) => e.id === props.entryId));
const position = computed(() => (entry.value ? positionInQueue(props.entries, entry.value.id) : 0));
const wait = computed(() => (entry.value ? estimateWaitMinutes(props.entries, entry.value.id, { averageMinutes: props.averageMinutes, rooms: props.rooms }) : 0));
const serving = computed(() => nowServing(props.entries));
const status = computed(() => entry.value?.status);
const error = ref<string | null>(null);

watch(status, (next, prev) => {
  if (prev !== "called" && next === "called" && typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
});

const roomName = computed(() => (entry.value?.room ? t.value.room(entry.value.room) : ""));
type Tone = "success" | "info" | "warning";
const banner = computed<{ tone: Tone; icon: Component; title: string; text: string } | null>(() => {
  const s = status.value;
  const x = t.value;
  if (s === "called") return { tone: "success", icon: BellRing, title: x.called, text: roomName.value ? x.calledText(roomName.value) : x.calledNoRoom };
  if (s === "serving") return { tone: "info", icon: Stethoscope, title: x.serving, text: roomName.value ? x.servingText(roomName.value) : "" };
  if (s === "done") return { tone: "success", icon: CircleCheck, title: x.done, text: x.doneText };
  if (s === "skipped" || s === "no_show") return { tone: "warning", icon: Users, title: x.skipped, text: x.skippedText };
  if (s === "left") return { tone: "info", icon: LogOut, title: x.left, text: x.leftText };
  return null;
});

async function leave() {
  const r = await props.onLeave?.();
  if (r && r.error) {
    error.value = r.error;
    throw new Error(r.error);
  }
}
</script>

<template>
  <div v-if="entry" data-slot="waiting-screen" :data-status="status" :class="cn('mx-auto flex w-full max-w-md flex-col gap-4', props.class)">
    <div class="flex items-center justify-between gap-2">
      <h2 v-if="clinic" class="text-label font-semibold">{{ clinic }}</h2>
      <span v-else />
      <NqQueueLiveIndicator :connection="connection" :updated-at="updatedAt" :now="now" :labels="labels" />
    </div>
    <NqAlert v-if="connection === 'offline'" tone="warning">{{ t.offlineText }}</NqAlert>

    <NqAlert v-if="banner" :tone="banner.tone" :icon="banner.icon" :title="banner.title" :role="status === 'called' ? 'alert' : 'status'" :class="status === 'called' ? 'motion-safe:animate-pulse' : undefined">
      {{ banner.text }}
    </NqAlert>

    <NqCard>
      <NqCardHeader>
        <NqCardTitle as="h3">{{ t.yourTicket }}</NqCardTitle>
        <NqBadge v-if="status === 'waiting'" variant="warning" class="justify-self-end">
          <Hourglass aria-hidden="true" class="size-3" />
          {{ t.waiting }}
        </NqBadge>
      </NqCardHeader>
      <NqCardContent class="flex flex-col gap-4">
        <bdi dir="ltr" data-slot="waiting-ticket" class="text-center font-mono text-[3.5rem] font-semibold leading-none tracking-wider tabular-nums">{{ entry.ticket }}</bdi>
        <div v-if="status === 'waiting'" class="grid grid-cols-2 gap-3 border-t border-nq-line pt-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-caption text-muted-foreground">{{ t.position }}</span>
            <span class="text-h2 tabular-nums"><NqNum :value="position" /></span>
            <span class="text-caption text-muted-foreground">{{ t.peopleAhead(position - 1) }}</span>
          </div>
          <div class="flex flex-col gap-0.5">
            <span class="text-caption text-muted-foreground">{{ t.wait }}</span>
            <span class="text-h2">{{ t.minutes(wait) }}</span>
          </div>
        </div>
      </NqCardContent>
    </NqCard>

    <section :aria-label="t.nowServing" aria-live="polite" class="flex flex-col gap-2 rounded-card border border-border bg-card p-4">
      <h3 class="text-label font-semibold">{{ t.nowServing }}</h3>
      <p v-if="serving.length === 0" class="text-body-sm text-muted-foreground">{{ t.nobody }}</p>
      <ul v-else class="m-0 grid list-none gap-2 p-0">
        <li v-for="s in serving" :key="s.id" :class="cn('flex items-center justify-between gap-3 rounded-control px-3 py-2', s.id === entry.id ? 'bg-nq-selected' : 'bg-secondary')">
          <bdi dir="ltr" class="font-mono text-h3 tabular-nums">{{ s.ticket }}</bdi>
          <span v-if="s.room" class="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground">
            <DoorOpen aria-hidden="true" class="size-4" />
            {{ t.room(s.room) }}
          </span>
        </li>
      </ul>
    </section>

    <NqConfirmButton v-if="onLeave && status === 'waiting'" variant="ghost" :title="t.leaveTitle" :description="t.leaveText" :confirm-label="t.leaveConfirm" :on-confirm="leave">
      <LogOut aria-hidden="true" />
      {{ t.leave }}
    </NqConfirmButton>
    <p v-if="error" role="alert" class="text-caption text-nq-danger-text">{{ error }}</p>
  </div>
</template>
