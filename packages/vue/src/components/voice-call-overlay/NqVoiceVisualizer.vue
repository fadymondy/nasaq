<script setup lang="ts">
import { computed, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { usePrefersReducedMotion } from "../ai-states";
import { voiceCallWords, type VoiceCallLabelOverrides } from "./labels";
import { barHeights, clampLevel, pushLevel, quantizeLevel, type VoiceCallState } from "./voice-call-math";

// A row of bars shaped by the last moments of the voice. Listening uses the ink colour, speaking the accent. While the agent is thinking the bars
// breathe on their own. Under reduced motion nothing animates and the level moves in coarse steps. It never asks for the microphone: it only
// draws the `level` it is given.
const props = withDefaults(
  defineProps<{
    state: VoiceCallState;
    /** Loudness of whoever is talking right now, 0 to 1. Drive it from an analyser or, in a demo, a timer. */
    level?: number;
    /** Number of bars. Default 31. */
    bars?: number;
    /** Flat and dim: the microphone is muted. */
    muted?: boolean;
    labels?: VoiceCallLabelOverrides;
    class?: HTMLAttributes["class"];
  }>(),
  { level: undefined, bars: 31, muted: undefined, labels: undefined },
);

const nq = useNasaq();
const t = computed(() => voiceCallWords(nq.locale.value, props.labels));
const reduced = usePrefersReducedMotion();
const quiet = computed(() => props.muted && props.state === "listening");
const live = computed(() => (props.state === "listening" && !quiet.value) || props.state === "speaking");
const target = computed(() => (live.value ? (reduced.value ? quantizeLevel(props.level ?? 0) : clampLevel(props.level)) : 0));
const history = ref<number[]>(pushLevel([], 0, Math.ceil(props.bars / 2)));
watch(
  [target, () => props.bars],
  () => {
    history.value = pushLevel(history.value, target.value, Math.ceil(props.bars / 2));
  },
  { immediate: true },
);
const heights = computed(() => barHeights(history.value, props.bars, props.state === "thinking" ? 0.16 : 0.06));
const breathing = computed(() => props.state === "thinking" && !reduced.value);
</script>

<template>
  <div
    data-slot="voice-visualizer"
    :data-state="props.state"
    role="meter"
    :aria-label="t.level"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="Math.round(target * 100)"
    :class="cn('flex h-28 items-center justify-center gap-1', props.class)"
  >
    <span
      v-for="(h, i) in heights"
      :key="i"
      aria-hidden="true"
      :class="
        cn(
          'w-1.5 rounded-full',
          props.state === 'speaking' ? 'bg-nq-accent' : props.state === 'error' ? 'bg-nq-danger' : quiet ? 'bg-nq-line-strong' : 'bg-foreground',
          props.state === 'connecting' && 'opacity-40',
          !reduced && 'transition-[height] duration-100 ease-out',
          breathing && 'animate-pulse',
        )
      "
      :style="{ height: `${h * 100}%`, animationDelay: breathing ? `${Math.abs(i - props.bars / 2) * 70}ms` : undefined }"
    />
  </div>
</template>
