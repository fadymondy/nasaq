<script setup lang="ts">
import { BellRing, DoorOpen, Stethoscope, Volume2, VolumeX } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqButton } from "../button";
import { formatDate, NqNum } from "../numeric";
import { isQueueActive, nowServing, NqQueueLiveIndicator, recentCalls, roomBoard, useQueueNow, waitingOrder, type QueueConnection, type QueueEntry } from "../waiting-screen";
import { playLobbyChime, useLobbyDisplayLabels, type LobbyDisplayLabels } from "./strings";

// A big-screen board for a waiting room: one card per room with the ticket it is calling, a list of recent calls, the next tickets in line and
// a clock. A new call flashes, plays a chime (when sound is on) and is announced to screen readers. Sizes scale with the board's own width.
const props = withDefaults(
  defineProps<{
    /** The whole queue. The board shows only ticket numbers, never names. */
    entries: readonly QueueEntry[];
    /** Room or desk names, in the order they appear on the board. */
    rooms: readonly string[];
    clinic?: string;
    /** Live connection state for the small indicator. */
    connection?: QueueConnection;
    /** How long a fresh call keeps its highlight, in milliseconds. Default 10000. */
    highlightMs?: number;
    /** Overrides the clock (epoch ms) for examples and tests. */
    now?: number;
    /** Tickets listed under "Up next". Default 5. */
    upNext?: number;
    labels?: Partial<LobbyDisplayLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { clinic: undefined, connection: "live", highlightMs: 10000, now: undefined, upNext: 5, labels: undefined },
);
/** Play the chime for a new call. The operator turns it on once (browsers need a click). Use `v-model:sound`. */
const sound = defineModel<boolean>("sound", { default: false });

const nq = useNasaq();
const t = useLobbyDisplayLabels(() => props.labels);
const clock = useQueueNow(() => props.now);

function setSound(v: boolean) {
  sound.value = v;
  if (v) playLobbyChime();
}

// Calls we have already shown, keyed by ticket and call time. The first run marks the current ones as seen, so opening the board is silent.
const keyOf = (e: QueueEntry) => `${e.id}:${e.calledAt}`;
let seen: Set<string> | null = null;
const fresh = ref<{ key: string; id: string; at: number }[]>([]);
const announcement = ref("");
const timeouts: ReturnType<typeof setTimeout>[] = [];
watch(
  () => props.entries,
  (entries) => {
    const active = entries.filter((e) => isQueueActive(e) && e.calledAt !== undefined);
    if (seen === null) {
      seen = new Set(active.map(keyOf));
      return;
    }
    const added = active.filter((e) => !seen!.has(keyOf(e)));
    if (added.length === 0) return;
    for (const e of added) seen.add(keyOf(e));
    const stamp = Date.now();
    fresh.value = [...fresh.value, ...added.map((e) => ({ key: keyOf(e), id: e.id, at: stamp }))];
    const newest = [...added].sort((a, b) => (b.calledAt ?? 0) - (a.calledAt ?? 0))[0]!;
    announcement.value = t.value.announce(newest.ticket, newest.room ? t.value.room(newest.room) : "");
    if (sound.value) playLobbyChime();
    timeouts.push(setTimeout(() => (fresh.value = fresh.value.filter((x) => x.at !== stamp)), props.highlightMs));
  },
  { immediate: true, deep: true },
);
onBeforeUnmount(() => timeouts.forEach(clearTimeout));
const isFresh = (e: QueueEntry) => fresh.value.some((f) => f.id === e.id && f.key === keyOf(e));

const board = computed(() => roomBoard(props.entries, props.rooms));
const recent = computed(() => recentCalls(props.entries, 6));
const waiting = computed(() => waitingOrder(props.entries));
const unassigned = computed(() => nowServing(props.entries).filter((e) => !e.room || !props.rooms.includes(e.room)));
const time = computed(() => formatDate(clock.value, nq.locale.value, { hour: "numeric", minute: "2-digit" }));
const date = computed(() => formatDate(clock.value, nq.locale.value, { weekday: "long", day: "numeric", month: "long" }));
</script>

<template>
  <div
    data-slot="lobby-display"
    :aria-label="t.board"
    :class="cn('@container flex w-full flex-col gap-[2cqi] bg-background p-[2cqi] text-foreground [container-type:inline-size]', props.class)"
  >
    <div aria-live="assertive" aria-atomic="true" class="sr-only">{{ announcement }}</div>

    <header class="flex flex-wrap items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 v-if="clinic" class="truncate text-[clamp(1.25rem,3cqi,2.5rem)] font-semibold leading-tight">{{ clinic }}</h1>
        <p class="text-[clamp(0.8rem,1.6cqi,1.25rem)] text-muted-foreground">
          <bdi>{{ date }}</bdi>
        </p>
      </div>
      <div class="flex items-center gap-4">
        <NqQueueLiveIndicator :connection="connection" :now="now" />
        <NqButton variant="secondary" size="sm" :aria-pressed="sound" @click="setSound(!sound)">
          <Volume2 v-if="sound" aria-hidden="true" />
          <VolumeX v-else aria-hidden="true" />
          {{ sound ? t.soundOn : t.soundOff }}
        </NqButton>
        <bdi dir="ltr" class="text-[clamp(1.5rem,4.5cqi,4rem)] font-semibold leading-none tabular-nums">{{ time }}</bdi>
      </div>
    </header>

    <div class="grid gap-[2cqi] @3xl:grid-cols-[2fr_1fr]">
      <section :aria-label="t.nowServing" class="flex flex-col gap-[1.2cqi]">
        <h2 class="text-[clamp(1rem,2.2cqi,1.75rem)] font-medium text-muted-foreground">{{ t.nowServing }}</h2>
        <ul class="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,15rem),1fr))] gap-[1.5cqi] p-0">
          <li
            v-for="{ room, entry } in board"
            :key="room"
            :data-room="room"
            :data-state="entry ? entry.status : 'free'"
            :data-fresh="entry && isFresh(entry) ? '' : undefined"
            :class="
              cn(
                'flex flex-col gap-2 rounded-card border p-[1.6cqi] transition-colors duration-300',
                entry ? 'border-nq-line bg-card' : 'border-dashed border-nq-line bg-secondary/60 text-muted-foreground',
                entry?.status === 'called' && 'border-primary bg-nq-selected',
                entry && isFresh(entry) && 'ring-4 ring-primary motion-safe:animate-pulse',
              )
            "
          >
            <div class="flex items-center gap-2 text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium">
              <DoorOpen aria-hidden="true" class="size-[1.2em]" />
              {{ t.room(room) }}
            </div>
            <template v-if="entry">
              <bdi dir="ltr" class="whitespace-nowrap text-center font-mono text-[clamp(2rem,5cqi,5.5rem)] font-semibold leading-none tracking-wider tabular-nums">{{ entry.ticket }}</bdi>
              <div class="flex items-center justify-center gap-2 text-[clamp(0.8rem,1.6cqi,1.4rem)]">
                <BellRing v-if="entry.status === 'called'" aria-hidden="true" class="size-[1.2em]" />
                <Stethoscope v-else aria-hidden="true" class="size-[1.2em]" />
                {{ entry.status === "called" ? t.called : t.inVisit }}
              </div>
            </template>
            <p v-else class="py-[2cqi] text-center text-[clamp(1rem,2.4cqi,2rem)]">{{ t.free }}</p>
          </li>
          <li v-for="e in unassigned" :key="e.id" class="flex flex-col items-center gap-2 rounded-card border border-nq-line bg-card p-[1.6cqi]">
            <bdi dir="ltr" class="font-mono text-[clamp(2rem,5cqi,5rem)] font-semibold tabular-nums">{{ e.ticket }}</bdi>
          </li>
        </ul>
      </section>

      <div class="flex flex-col gap-[2cqi]">
        <section :aria-label="t.upNext" class="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
          <h2 class="flex items-baseline justify-between text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">
            {{ t.upNext }}
            <span class="text-[0.8em]">{{ t.waiting }}: <NqNum :value="waiting.length" /></span>
          </h2>
          <p v-if="waiting.length === 0" class="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{{ t.nobodyWaiting }}</p>
          <ul v-else class="m-0 flex list-none flex-wrap gap-2 p-0">
            <li v-for="e in waiting.slice(0, upNext)" :key="e.id" class="rounded-control bg-secondary px-3 py-1.5">
              <bdi dir="ltr" class="font-mono text-[clamp(1.1rem,2.6cqi,2.25rem)] font-semibold tabular-nums">{{ e.ticket }}</bdi>
            </li>
            <li v-if="waiting.length > upNext" class="self-center text-[clamp(0.8rem,1.5cqi,1.2rem)] text-muted-foreground">{{ t.more(waiting.length - upNext) }}</li>
          </ul>
        </section>

        <section :aria-label="t.recent" class="flex flex-col gap-2 rounded-card border border-nq-line p-[1.6cqi]">
          <h2 class="text-[clamp(0.9rem,1.8cqi,1.5rem)] font-medium text-muted-foreground">{{ t.recent }}</h2>
          <p v-if="recent.length === 0" class="text-[clamp(0.85rem,1.6cqi,1.3rem)] text-muted-foreground">{{ t.none }}</p>
          <ul v-else class="m-0 grid list-none gap-1.5 p-0">
            <li v-for="e in recent" :key="`${e.id}-${e.calledAt}`" class="flex items-center justify-between gap-3 text-[clamp(1rem,2cqi,1.75rem)]">
              <bdi dir="ltr" class="font-mono font-semibold tabular-nums">{{ e.ticket }}</bdi>
              <span class="text-muted-foreground">{{ e.room ? t.room(e.room) : "" }}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
