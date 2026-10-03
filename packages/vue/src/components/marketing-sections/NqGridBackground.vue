<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

// A quiet line or dot grid behind a section, drawn in the theme's line colour and faded toward the edges. Decoration only.
const props = withDefaults(
  defineProps<{
    /** Cell size in pixels. Default 40. */
    cell?: number;
    /** "lines" (default) or "dots". */
    pattern?: "lines" | "dots";
    /** Fade the pattern out toward the edges. Default true. */
    fade?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { cell: 40, pattern: "lines", fade: true },
);
const image = computed(() =>
  props.pattern === "dots" ? "radial-gradient(circle, var(--nq-line-strong, var(--nq-line)) 1px, transparent 1.5px)" : "linear-gradient(to right, var(--nq-line) 1px, transparent 1px), linear-gradient(to bottom, var(--nq-line) 1px, transparent 1px)",
);
const mask = "radial-gradient(ellipse 70% 60% at 50% 40%, black 30%, transparent 100%)";
</script>

<template>
  <div data-slot="grid-background" :class="cn('relative isolate overflow-hidden', props.class)">
    <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10" :style="{ backgroundImage: image, backgroundSize: `${cell}px ${cell}px`, maskImage: fade ? mask : undefined, WebkitMaskImage: fade ? mask : undefined }" />
    <slot />
  </div>
</template>
