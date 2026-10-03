<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqProductMark } from "../product-mark";
import { clampPercent, ringArc } from "./loader-frames";
import { useBrandLoaderStrings } from "./strings";

interface Props {
  /** Rendered size of the mark in px, used for the default mark and to size the ring. Default 56. */
  size?: number;
  /** `pulse` fades the mark's whole box in and out. `ring` runs an arc around it. Default `ring`. */
  variant?: "pulse" | "ring";
  /** 0..100 to make the ring a progress ring. `null` or omitted: an endless spinning arc. */
  value?: number | null;
  /** Announced name. Default "Loading". */
  label?: string;
  class?: HTMLAttributes["class"];
}

// Motion around a brand mark. Only the wrapper's opacity, or an SVG ring drawn outside the mark, moves; the mark's
// own shapes are untouched. The `mark` slot takes the host's official mark; default is the provider brand's mark.
const props = withDefaults(defineProps<Props>(), { size: 56, variant: "ring", value: null });
const t = useBrandLoaderStrings();
const box = computed(() => Math.round(props.size * 1.7));
const determinate = computed(() => typeof props.value === "number");
const arc = computed(() => ringArc(determinate.value ? (props.value as number) : 25, 46));
</script>

<template>
  <div
    data-slot="logo-loader"
    :data-variant="props.variant"
    :role="determinate ? 'progressbar' : 'status'"
    :aria-label="props.label ?? t.loading"
    :aria-valuemin="determinate ? 0 : undefined"
    :aria-valuemax="determinate ? 100 : undefined"
    :aria-valuenow="determinate ? Math.round(clampPercent(props.value as number)) : undefined"
    :class="cn('relative inline-flex shrink-0 items-center justify-center', props.class)"
    :style="{ width: `${box}px`, height: `${box}px` }"
  >
    <svg
      v-if="props.variant === 'ring'"
      aria-hidden="true"
      viewBox="0 0 100 100"
      :class="cn('absolute inset-0 size-full', determinate ? '-rotate-90' : 'motion-safe:animate-spin motion-reduce:hidden')"
    >
      <circle cx="50" cy="50" r="46" fill="none" stroke-width="2" class="stroke-border" />
      <circle
        cx="50"
        cy="50"
        r="46"
        fill="none"
        stroke-width="2.5"
        stroke-linecap="round"
        :stroke-dasharray="arc.circumference"
        :stroke-dashoffset="arc.dashOffset"
        :class="cn('stroke-primary', determinate && 'transition-[stroke-dashoffset] duration-300 ease-nq motion-reduce:transition-none')"
      />
    </svg>
    <span aria-hidden="true" :class="cn('inline-flex', props.variant === 'pulse' && 'motion-safe:animate-pulse')">
      <slot name="mark"><NqProductMark :size="props.size" title="" /></slot>
    </span>
  </div>
</template>
