<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useStrings } from "./strings";
import { scrollFadeMask, scrollFadeState } from "./text-utilities-logic";

// A horizontally scrolling row that fades out the edge that still has content behind it. It works out the inline start
// from the layout direction, so in Arabic the first fade is on the right. The region takes keyboard focus while it
// scrolls, and the fade is a mask, so it needs no background colour.
interface Props {
  /** Width of each fade in px. Default 32. */
  fadeSize?: number;
  /** Accessible name for the scrollable region. Default "Scrollable content". */
  label?: string;
  /** Classes for the inner row that holds the children. */
  contentClass?: HTMLAttributes["class"];
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { fadeSize: 32, label: undefined, contentClass: undefined });
const { t } = useStrings();
const el = ref<HTMLElement>();
const state = ref({ start: false, end: false });
const rtl = ref(false);
let observer: ResizeObserver | undefined;

function measure() {
  const node = el.value;
  if (!node) return;
  rtl.value = getComputedStyle(node).direction === "rtl";
  const next = scrollFadeState({ scrollStart: Math.abs(node.scrollLeft), clientSize: node.clientWidth, scrollSize: node.scrollWidth });
  if (next.start !== state.value.start || next.end !== state.value.end) state.value = next;
}

onMounted(() => {
  const node = el.value;
  if (!node) return;
  measure();
  if (typeof ResizeObserver === "undefined") return;
  observer = new ResizeObserver(measure);
  observer.observe(node);
  for (const child of Array.from(node.children)) observer.observe(child);
});
onBeforeUnmount(() => observer?.disconnect());

const scrollable = computed(() => state.value.start || state.value.end);
const mask = computed(() => scrollFadeMask(state.value, props.fadeSize, rtl.value));
</script>

<template>
  <div
    ref="el"
    data-slot="scroll-fade"
    :data-fade-start="state.start || undefined"
    :data-fade-end="state.end || undefined"
    role="region"
    :aria-label="props.label ?? t.scrollRegion"
    :tabindex="scrollable ? 0 : undefined"
    :class="
      cn(
        'overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus [&::-webkit-scrollbar]:hidden',
        props.class,
      )
    "
    :style="{ maskImage: mask, WebkitMaskImage: mask }"
    @scroll="measure"
  >
    <div :class="cn('flex w-max min-w-full items-center gap-2', props.contentClass)"><slot /></div>
  </div>
</template>
