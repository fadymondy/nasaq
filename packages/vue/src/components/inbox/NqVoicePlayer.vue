<script setup lang="ts">
import { Pause, Play } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { fakeWaveform, formatDuration } from "./inbox-format";
import { useInboxLabels, type InboxLabels } from "./inbox-strings";

// A voice note: play or pause, a seekable waveform, the time and a 1x, 1.5x, 2x speed toggle.
// Without `src` it only simulates progress (demos, previews before upload).
const props = defineProps<{
  src?: string;
  /** Seconds. */
  duration: number;
  waveform?: readonly number[];
  labels?: Partial<InboxLabels>;
  class?: HTMLAttributes["class"];
}>();
const t = useInboxLabels(() => props.labels);
const RATES = [1, 1.5, 2] as const;
const audio = ref<HTMLAudioElement | null>(null);
const playing = ref(false);
const progress = ref(0);
const rate = ref<(typeof RATES)[number]>(1);
const bars = computed(() => props.waveform ?? fakeWaveform(props.duration));
const total = computed(() => Math.max(0.1, props.duration));
let timer: ReturnType<typeof setInterval> | undefined;

watch([playing, () => props.src, rate], () => {
  clearInterval(timer);
  if (props.src || !playing.value) return;
  timer = setInterval(() => {
    const next = progress.value + (0.1 * rate.value) / total.value;
    if (next >= 1) {
      playing.value = false;
      progress.value = 0;
    } else progress.value = next;
  }, 100);
});
onBeforeUnmount(() => clearInterval(timer));

function toggle() {
  const el = audio.value;
  if (props.src && el) {
    if (playing.value) el.pause();
    else void el.play().catch(() => (playing.value = false));
  }
  playing.value = !playing.value;
}
function seek(value: number) {
  progress.value = value;
  const el = audio.value;
  if (el && Number.isFinite(el.duration)) el.currentTime = value * el.duration;
}
function cycle() {
  const next = RATES[(RATES.indexOf(rate.value) + 1) % RATES.length] as (typeof RATES)[number];
  rate.value = next;
  if (audio.value) audio.value.playbackRate = next;
}
function onTime(e: Event) {
  const el = e.currentTarget as HTMLAudioElement;
  progress.value = el.duration ? el.currentTime / el.duration : 0;
}
function onEnded() {
  playing.value = false;
  progress.value = 0;
}
</script>

<template>
  <div data-slot="voice-player" :data-playing="playing || undefined" :class="cn('flex w-64 max-w-full items-center gap-2', props.class)">
    <audio v-if="props.src" ref="audio" :src="props.src" preload="metadata" @timeupdate="onTime" @ended="onEnded" />
    <NqButton type="button" variant="secondary" size="icon-sm" class="rounded-full" :aria-label="playing ? t.pause : t.play" @click="toggle">
      <Pause v-if="playing" aria-hidden="true" class="fill-current" />
      <Play v-else aria-hidden="true" class="fill-current rtl:-scale-x-100" />
    </NqButton>
    <span class="relative flex flex-1 items-center">
      <span aria-hidden="true" class="flex h-7 flex-1 items-center gap-[2px]" dir="ltr">
        <span
          v-for="(v, i) in bars"
          :key="i"
          :style="{ height: `${Math.round(Math.max(0.12, v) * 100)}%` }"
          :class="['w-[3px] shrink-0 rounded-full', i / bars.length < progress ? 'bg-foreground' : 'bg-nq-line-strong']"
        />
      </span>
      <input
        type="range"
        min="0"
        max="100"
        step="1"
        :value="Math.round(progress * 100)"
        :aria-label="t.voiceProgress"
        :aria-valuetext="`${formatDuration(progress * total)} / ${formatDuration(total)}`"
        class="absolute inset-0 size-full cursor-pointer opacity-0"
        @input="seek(Number(($event.target as HTMLInputElement).value) / 100)"
      />
    </span>
    <span dir="ltr" class="w-9 shrink-0 text-caption tabular-nums text-muted-foreground">{{ formatDuration(playing || progress > 0 ? progress * total : total) }}</span>
    <button
      type="button"
      :aria-label="t.speed"
      class="h-5 min-w-8 rounded-full border border-border px-1.5 text-caption tabular-nums text-muted-foreground outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
      @click="cycle"
    >
      <bdi>{{ rate }}x</bdi>
    </button>
  </div>
</template>
