<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../ai-states";
import { MARKS, markTone, type HandwrittenMarkKind, type HandwrittenMarkTone } from "./marks";

// Marks a few words as if a pen had just done it. The stroke is an SVG path drawn with the reading flow of the page and never touches the text, so
// it works with Arabic. It draws in once; under `prefers-reduced-motion` it is drawn already.
const props = withDefaults(
  defineProps<{
    /** The hand-drawn stroke: an underline, a loop around, a highlighter swipe or a strike-through. Default "underline". */
    kind?: HandwrittenMarkKind;
    tone?: HandwrittenMarkTone;
    /** Draw the stroke in when it scrolls into view. Off under reduced motion, where it is simply there. Default true. */
    animate?: boolean;
    /** Milliseconds to wait before drawing. */
    delay?: number;
    class?: HTMLAttributes["class"];
  }>(),
  { kind: "underline", tone: "brand", animate: true, delay: 0 },
);

const reduced = usePrefersReducedMotion();
const el = ref<HTMLSpanElement | null>(null);
const seen = ref(false);
const spec = computed(() => MARKS[props.kind]);
let observer: IntersectionObserver | undefined;

watch(
  [el, seen, reduced, () => props.animate],
  () => {
    observer?.disconnect();
    if (seen.value || reduced.value || !props.animate || !el.value) return;
    if (typeof IntersectionObserver === "undefined") {
      seen.value = true;
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          seen.value = true;
          observer?.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    observer.observe(el.value);
  },
  { flush: "post", immediate: true },
);
onBeforeUnmount(() => observer?.disconnect());

const drawn = computed(() => reduced.value || !props.animate || seen.value);
</script>

<template>
  <span ref="el" data-slot="handwritten-mark" :data-kind="props.kind" :data-drawn="drawn || undefined" :class="cn('relative inline-block', markTone[props.tone], props.class)">
    <span class="relative z-10 text-foreground"><slot /></span>
    <svg
      aria-hidden="true"
      focusable="false"
      :viewBox="spec.viewBox"
      preserveAspectRatio="none"
      :class="cn('pointer-events-none absolute overflow-visible', spec.box, props.kind === 'highlight' ? 'z-0' : 'z-20')"
    >
      <path
        :d="spec.d"
        pathLength="1"
        fill="none"
        stroke="currentColor"
        :stroke-opacity="spec.opacity ?? 1"
        stroke-linecap="round"
        stroke-linejoin="round"
        vector-effect="non-scaling-stroke"
        :style="{
          strokeWidth: spec.width,
          strokeDasharray: '1',
          strokeDashoffset: drawn ? '0' : '1',
          transition: reduced || !props.animate ? 'none' : `stroke-dashoffset 650ms cubic-bezier(0.4, 0, 0.2, 1) ${props.delay}ms`,
        }"
      />
    </svg>
  </span>
</template>
