<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../ai-states";

// Text with a band of light that sweeps across it, for "Thinking", "Syncing" or a call to attention. It is one element with one gradient (no
// per-letter boxes), so Arabic keeps its joins. The sweep follows the reading direction and does not run under reduced motion, where the text
// is simply shown in the foreground colour. For a block of placeholder lines use NqAiShimmer.
const props = withDefaults(
  defineProps<{
    /** Seconds for one sweep. Default 2.4. */
    duration?: number;
    /** Hold the light still. */
    paused?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { duration: 2.4, paused: false },
);

const reduced = usePrefersReducedMotion();
const el = ref<HTMLSpanElement | null>(null);
const still = computed(() => reduced.value || props.paused);
let anim: Animation | undefined;
const stop = () => {
  anim?.finished?.catch?.(() => {});
  anim?.cancel();
  anim = undefined;
};
watch(
  [el, reduced, () => props.paused, () => props.duration],
  () => {
    stop();
    const node = el.value;
    if (!node || reduced.value || props.paused || typeof node.animate !== "function") return;
    const rtl = getComputedStyle(node).direction === "rtl";
    anim = node.animate({ backgroundPosition: rtl ? ["0% 0", "100% 0"] : ["100% 0", "0% 0"] }, { duration: Math.max(0.4, props.duration) * 1000, iterations: Number.POSITIVE_INFINITY, easing: "linear" });
  },
  { flush: "post" },
);
onBeforeUnmount(stop);
</script>

<template>
  <span
    ref="el"
    data-slot="text-shimmer"
    :data-still="still || undefined"
    :class="
      cn(
        'inline-block',
        reduced
          ? 'text-foreground'
          : 'bg-clip-text text-transparent [-webkit-text-fill-color:transparent] [background-size:250%_100%] [background-image:linear-gradient(100deg,var(--nq-fg-muted)_35%,var(--nq-fg)_50%,var(--nq-fg-muted)_65%)] forced-colors:bg-none forced-colors:[-webkit-text-fill-color:currentColor]',
        props.class,
      )
    "
  >
    <slot />
  </span>
</template>
