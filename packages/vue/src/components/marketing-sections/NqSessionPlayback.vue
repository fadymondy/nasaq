<script setup lang="ts">
import { Pause, Play, RotateCcw, Sparkles, Wrench } from "lucide-vue-next";
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { usePrefersReducedMotion } from "../ai-states";
import { NqButton } from "../button";
import { NqSlider } from "../slider";
import { splitText } from "../text-effects/text-effects-model";
import { formatSessionClock, sessionStateAt, sessionTimeFromRatio, sessionTimeline, type SessionEvent, type SessionTiming } from "./session-playback-model";
import type { SessionPlaybackLabels } from "./types";

const SESSION_STRINGS = {
  en: { play: "Play", pause: "Pause", restart: "Replay", position: "Playback position", transcript: "AI session" },
  ar: { play: "تشغيل", pause: "إيقاف مؤقت", restart: "إعادة التشغيل", position: "موضع التشغيل", transcript: "جلسة الذكاء الاصطناعي" },
} as const;

// A scripted AI session that plays back like a recording: messages type out word by word, tool steps appear as they run,
// and there is a play/pause button and a scrubber. It is a marketing demo, not a live chat (use NqChat or NqCopilotChat for that).
// Arabic text reveals whole words, never letters. Under reduced motion the whole session is shown at once.
const props = withDefaults(
  defineProps<{
    /** The scripted conversation. */
    events: readonly SessionEvent[];
    /** Title in the header bar. */
    title?: string;
    /** Start playing when it scrolls into view. Default true; off under reduced motion, which shows the full session. */
    autoPlay?: boolean;
    /** Start again after a pause when it ends. Default false. */
    loop?: boolean;
    timing?: SessionTiming;
    /** Names shown beside messages. */
    names?: { user?: string; assistant?: string };
    /** Height of the transcript area. Default 22rem. */
    height?: string;
    labels?: SessionPlaybackLabels;
    /** Language of the script text, for word splitting. Default the active locale. */
    lang?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { autoPlay: true, loop: false, height: "22rem", title: undefined, timing: undefined, names: undefined, labels: undefined, lang: undefined },
);
const emit = defineEmits<{ end: [] }>();

const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const t = computed(() => ({ ...SESSION_STRINGS[ar.value ? "ar" : "en"], ...props.labels }));
const locale = computed(() => props.lang ?? (ar.value ? "ar" : "en"));
const reduced = usePrefersReducedMotion();
const timeline = computed(() => sessionTimeline(props.events, locale.value, props.timing));
const time = ref(0);
const playing = ref(false);
const root = ref<HTMLElement | null>(null);
const scroller = ref<HTMLElement | null>(null);
let started = false;
let io: IntersectionObserver | undefined;
let raf = 0;

const seek = (ms: number) => {
  time.value = ms;
};

function watchVisible() {
  io?.disconnect();
  if (!props.autoPlay || reduced.value || started) return;
  const el = root.value;
  if (!el || typeof IntersectionObserver === "undefined") {
    started = true;
    playing.value = true;
    return;
  }
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting) && !started) {
        started = true;
        playing.value = true;
        io?.disconnect();
      }
    },
    { threshold: 0.3 },
  );
  io.observe(el);
}
onMounted(watchVisible);
watch([() => props.autoPlay, reduced], watchVisible);

function loopStop() {
  cancelAnimationFrame(raf);
}
watch(
  [playing, () => timeline.value.total, () => props.loop],
  () => {
    loopStop();
    if (!playing.value) return;
    let last = performance.now();
    let holdUntil = 0;
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (holdUntil) {
        if (now >= holdUntil) {
          holdUntil = 0;
          seek(0);
        }
      } else {
        const total = timeline.value.total;
        const next = Math.min(total, time.value + dt);
        seek(next);
        if (next >= total) {
          emit("end");
          if (props.loop) holdUntil = now + 2500;
          else {
            playing.value = false;
            return;
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  },
  { immediate: true },
);
onBeforeUnmount(() => {
  io?.disconnect();
  loopStop();
});

const shownTime = computed(() => (reduced.value ? timeline.value.total : time.value));
const states = computed(() => sessionStateAt(timeline.value, shownTime.value));
const finished = computed(() => shownTime.value >= timeline.value.total);
const you = computed(() => props.names?.user ?? (ar.value ? "أنت" : "You"));
const ai = computed(() => props.names?.assistant ?? (ar.value ? "المساعد" : "Assistant"));
const percent = computed(() => (timeline.value.total ? Math.round((shownTime.value / timeline.value.total) * 100) : 0));
const playLabel = computed(() => (finished.value ? t.value.restart : playing.value ? t.value.pause : t.value.play));

watch(
  () => [finished.value ? -1 : states.value.filter((s) => s.started).length, states.value.reduce((n, s) => n + s.visibleWords, 0)],
  () => {
    void nextTick(() => {
      const el = scroller.value;
      if (el) el.scrollTop = el.scrollHeight;
    });
  },
);

/** The text of a typed message with only the words revealed so far. */
function visibleText(event: SessionEvent, words: number): string {
  let shown = 0;
  return splitText(event.text, "word", locale.value)
    .tokens.filter((token) => {
      if (token.space) return shown > 0 && shown < words;
      if (shown >= words) return false;
      shown += 1;
      return true;
    })
    .map((token) => token.text)
    .join("");
}

function toggle() {
  if (finished.value) {
    seek(0);
    playing.value = true;
  } else playing.value = !playing.value;
}
function scrub(v: number | number[]) {
  const value = Array.isArray(v) ? (v[0] ?? 0) : v;
  seek(sessionTimeFromRatio(timeline.value, value / 100));
}
</script>

<template>
  <figure ref="root" data-slot="session-playback" :class="cn('flex min-w-0 flex-col overflow-hidden rounded-card border border-border bg-card', props.class)">
    <figcaption class="flex items-center gap-2 border-border border-b bg-nq-surface-soft px-3 py-2 text-caption text-muted-foreground">
      <Sparkles aria-hidden="true" class="size-3.5 text-nq-brand" />
      <span class="min-w-0 flex-1 truncate">{{ title ?? t.transcript }}</span>
    </figcaption>
    <div ref="scroller" role="log" :aria-label="t.transcript" class="flex flex-col gap-3 overflow-y-auto p-4" :style="{ height }">
      <template v-for="(event, i) in events" :key="i">
        <template v-if="states[i]?.started">
          <div v-if="event.role === 'tool' || event.role === 'status'" :class="cn('flex min-w-0 items-center gap-2 rounded-control border border-border bg-nq-surface-soft px-2.5 py-1.5 text-caption text-muted-foreground', !states[i]?.done && !reduced && 'animate-pulse')">
            <Wrench aria-hidden="true" class="size-3.5 shrink-0" />
            <span v-if="event.title" class="font-medium text-foreground">{{ event.title }}</span>
            <span dir="auto" class="min-w-0 truncate">{{ event.text }}</span>
          </div>
          <div v-else :class="cn('flex min-w-0 flex-col gap-1', event.role === 'user' ? 'items-end' : 'items-start')">
            <span class="text-caption text-muted-foreground">{{ event.role === "user" ? you : ai }}</span>
            <p dir="auto" :class="cn('max-w-[85%] rounded-card px-3 py-2 text-body-sm text-start', event.role === 'user' ? 'bg-nq-selected text-foreground' : 'bg-secondary text-nq-fg-body')">
              {{ visibleText(event, states[i]!.visibleWords) }}<span v-if="!states[i]?.done && !reduced" aria-hidden="true" class="ms-0.5 inline-block h-3.5 w-px translate-y-0.5 animate-pulse bg-foreground" />
            </p>
          </div>
        </template>
      </template>
    </div>
    <div class="flex items-center gap-3 border-border border-t px-3 py-2">
      <NqButton variant="ghost" size="icon-sm" :aria-label="playLabel" @click="toggle">
        <RotateCcw v-if="finished" aria-hidden="true" class="rtl:-scale-x-100" />
        <Pause v-else-if="playing" aria-hidden="true" />
        <Play v-else aria-hidden="true" class="rtl:-scale-x-100" />
      </NqButton>
      <NqSlider :aria-label="t.position" class="min-w-0 flex-1" :min="0" :max="100" :step="1" :model-value="percent" :show-value="false" @update:model-value="scrub" />
      <span dir="ltr" class="w-20 shrink-0 text-end text-caption text-muted-foreground tabular-nums">{{ formatSessionClock(shownTime) }} / {{ formatSessionClock(timeline.total) }}</span>
    </div>
  </figure>
</template>
