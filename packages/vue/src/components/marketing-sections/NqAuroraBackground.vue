<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../ai-states";

// A soft, slowly drifting colour glow for the back of a hero or banner. Decoration only (hidden from assistive tech,
// ignores the pointer), painted behind its children. It holds still when the visitor prefers reduced motion.
const props = withDefaults(
  defineProps<{
    /** Colour family of the glow. "brand" uses the product colour; "multi" mixes the tag colours. Default "brand". */
    tone?: "brand" | "multi";
    /** Drift slowly. Default true; always still under reduced motion. */
    animate?: boolean;
    /** Fade the glow out toward the bottom so the next section starts clean. Default true. */
    fade?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { tone: "brand", animate: true, fade: true },
);

const AURORA_COLORS = {
  brand: ["var(--nq-brand)", "var(--nq-tag-blue, var(--nq-brand))", "var(--nq-tag-violet, var(--nq-brand))"],
  multi: ["var(--nq-tag-violet, var(--nq-brand))", "var(--nq-tag-blue, var(--nq-brand))", "var(--nq-tag-green, var(--nq-brand))"],
} as const;
const AURORA_SPOTS = [
  { top: "-30%", insetInlineStart: "-10%", insetInlineEnd: undefined, size: "55%" },
  { top: "-20%", insetInlineStart: undefined, insetInlineEnd: "-8%", size: "50%" },
  { top: "5%", insetInlineStart: "30%", insetInlineEnd: undefined, size: "40%" },
];

const reduced = usePrefersReducedMotion();
const blobs = ref<HTMLElement[]>([]);
const colors = computed(() => AURORA_COLORS[props.tone]);
const mask = "linear-gradient(to bottom, black 55%, transparent)";
let animations: Animation[] = [];
const stop = () => {
  for (const a of animations) a.cancel();
  animations = [];
};
watch(
  [blobs, reduced, () => props.animate],
  () => {
    stop();
    if (reduced.value || !props.animate) return;
    animations = blobs.value.flatMap((el, i) => {
      if (!el || typeof el.animate !== "function") return [];
      const dx = (i % 2 === 0 ? 1 : -1) * (6 + i * 2);
      return [
        el.animate([{ transform: "translate(0,0) scale(1)" }, { transform: `translate(${dx}%, ${4 + i * 2}%) scale(1.12)` }, { transform: "translate(0,0) scale(1)" }], {
          duration: 14000 + i * 3500,
          iterations: Number.POSITIVE_INFINITY,
          easing: "ease-in-out",
        }),
      ];
    });
  },
  { flush: "post", immediate: true },
);
onBeforeUnmount(stop);
</script>

<template>
  <div data-slot="aurora-background" :class="cn('relative isolate overflow-hidden', props.class)">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10 overflow-hidden" :style="fade ? { maskImage: mask, WebkitMaskImage: mask } : undefined">
      <span
        v-for="(spot, i) in AURORA_SPOTS"
        :key="i"
        ref="blobs"
        class="absolute aspect-square rounded-full opacity-25 blur-3xl"
        :style="{ top: spot.top, insetInlineStart: spot.insetInlineStart, insetInlineEnd: spot.insetInlineEnd, width: spot.size, background: colors[i] }"
      />
    </div>
    <slot />
  </div>
</template>
