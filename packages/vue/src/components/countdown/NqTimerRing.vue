<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { strokeTone, type TimerRingTone } from "./tone";

// A circular progress ring with room in the middle. The arc starts at the top and runs clockwise.
interface Props {
  /** How much of the ring is filled, 0 to 1. Pass the time remaining to make it drain. */
  fraction: number;
  /** Phase colour. Pair it with a word or icon inside the ring; colour alone is never the signal. */
  tone?: TimerRingTone;
  /** Diameter in pixels. Default 224. */
  size?: number;
  /** Stroke width in pixels. Default 12. */
  thickness?: number;
  /** Dashes the arc while paused, so the state does not rely on colour. */
  paused?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { tone: "primary", size: 224, thickness: 12, paused: false });

const radius = computed(() => (props.size - props.thickness) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const value = computed(() => Math.min(1, Math.max(0, Number.isFinite(props.fraction) ? props.fraction : 0)));
const dashed = computed(() => props.paused && value.value > 0);
const dash = computed(() => {
  const piece = Math.max(1, (circumference.value * value.value) / 24);
  return dashed.value ? `${piece} ${piece}` : String(circumference.value);
});
</script>

<template>
  <div
    data-slot="timer-ring"
    :data-tone="props.tone"
    :data-paused="props.paused ? '' : undefined"
    :class="cn('relative inline-flex shrink-0 items-center justify-center', props.class)"
    :style="{ width: `${props.size}px`, height: `${props.size}px`, maxWidth: '100%' }"
  >
    <svg aria-hidden="true" :viewBox="`0 0 ${props.size} ${props.size}`" class="absolute inset-0 size-full -rotate-90">
      <circle :cx="props.size / 2" :cy="props.size / 2" :r="radius" fill="none" :stroke-width="props.thickness" class="stroke-nq-line" />
      <circle
        data-slot="timer-ring-arc"
        :cx="props.size / 2"
        :cy="props.size / 2"
        :r="radius"
        fill="none"
        :stroke-width="props.thickness"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        :stroke-dashoffset="dashed ? 0 : circumference * (1 - value)"
        :class="cn(strokeTone[props.tone], 'transition-[stroke-dashoffset,stroke] duration-500 ease-linear motion-reduce:transition-none', value <= 0 && 'opacity-0')"
      />
    </svg>
    <div class="relative flex flex-col items-center justify-center gap-1 text-center"><slot /></div>
  </div>
</template>
