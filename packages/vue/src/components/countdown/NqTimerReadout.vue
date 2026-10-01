<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { formatTimer } from "./countdown-math";
import { useCountdownStrings } from "./strings";

// The mm:ss figure. Always left-to-right with tabular digits, so it does not jitter or flip in Arabic.
interface Props {
  seconds: number;
  /** Accessible name, for example "Focus". */
  label?: string;
  /** Larger figures for a full-screen readout. */
  size?: "md" | "lg";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { label: undefined, size: "md" });
const t = useCountdownStrings();
const whole = computed(() => Math.max(0, Math.floor(props.seconds)));
</script>

<template>
  <time
    data-slot="timer-readout"
    role="timer"
    :aria-label="props.label ?? t.timer"
    aria-live="off"
    :datetime="`PT${Math.floor(whole / 60)}M${whole % 60}S`"
    dir="ltr"
    :class="cn('font-medium leading-none tabular-nums text-foreground', props.size === 'lg' ? 'text-[clamp(3rem,14vw,5.5rem)]' : 'text-[clamp(2rem,9vw,3rem)]', props.class)"
  >
    {{ formatTimer(whole) }}
  </time>
</template>
