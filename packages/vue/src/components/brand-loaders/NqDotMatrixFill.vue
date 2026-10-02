<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { clampPercent, dotMatrixLevels } from "./loader-frames";
import { useBrandLoaderStrings } from "./strings";
import { useTick } from "./use-tick";

interface Props {
  /** 0..100 progress, or `null` for an indeterminate sweep. */
  value: number | null;
  cols?: number;
  rows?: number;
  /** Dot pitch in px. Default 10. */
  pitch?: number;
  /** Announced name. Default "Loading". */
  label?: string;
  class?: HTMLAttributes["class"];
}

// A benday-dot matrix that fills from the left as `value` grows. It always runs left to right, so it stays a
// picture of progress the same way in RTL.
const props = withDefaults(defineProps<Props>(), { cols: 24, rows: 5, pitch: 10 });
const t = useBrandLoaderStrings();
const tick = useTick(90, () => props.value === null);
const levels = computed(() => dotMatrixLevels({ cols: props.cols, rows: props.rows, value: props.value, tick: tick.value }));
const determinate = computed(() => props.value !== null);
</script>

<template>
  <div
    data-slot="dot-matrix-fill"
    role="progressbar"
    :aria-label="props.label ?? t.loading"
    :aria-valuemin="determinate ? 0 : undefined"
    :aria-valuemax="determinate ? 100 : undefined"
    :aria-valuenow="determinate ? Math.round(clampPercent(props.value as number)) : undefined"
    dir="ltr"
    :class="cn('inline-grid', props.class)"
    :style="{ gridTemplateColumns: `repeat(${props.cols}, ${props.pitch}px)`, gridAutoRows: `${props.pitch}px` }"
  >
    <span v-for="(level, i) in levels" :key="i" aria-hidden="true" class="flex items-center justify-center">
      <span
        :class="cn('block rounded-full transition-[transform,opacity] duration-150 ease-nq motion-reduce:transition-none', level > 0 ? 'bg-primary' : 'bg-border')"
        :style="{ width: `${props.pitch * 0.62}px`, height: `${props.pitch * 0.62}px`, transform: `scale(${(0.35 + 0.65 * level).toFixed(3)})`, opacity: level > 0 ? 0.35 + 0.65 * level : 1 }"
      />
    </span>
  </div>
</template>
