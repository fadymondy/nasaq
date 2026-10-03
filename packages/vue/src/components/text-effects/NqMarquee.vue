<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useAttrs, watch, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { usePrefersReducedMotion } from "../ai-states";
import { useHalt } from "./halt";
import { marqueeCopies, marqueeDuration } from "./text-effects-model";

// A row that scrolls forever, for logos and short quotes. Direction is logical, so a marquee that moves toward the start reads correctly in both
// English and Arabic. Under `prefers-reduced-motion` nothing moves: the items wrap into a static row. The repeated copies are hidden from assistive tech.
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    /** Pixels per second. Default 48. */
    speed?: number;
    /** Which way the content travels: "start" toward the inline start (left in English, right in Arabic), "end" the other way. Default "start". */
    direction?: "start" | "end";
    /** Hold still while the pointer or focus is on it. Default true. */
    pauseOnHover?: boolean;
    /** Stop scrolling. */
    paused?: boolean;
    /** Space between items in pixels. Default 32. */
    gap?: number;
    /** Fade the two edges. Default true. */
    fade?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  { speed: 48, direction: "start", pauseOnHover: true, paused: false, gap: 32, fade: true },
);

const attrs = useAttrs();
const reduced = usePrefersReducedMotion();
const { halted, on } = useHalt();
const rootEl = ref<HTMLDivElement | null>(null);
const trackEl = ref<HTMLDivElement | null>(null);
const copyEl = ref<HTMLDivElement | null>(null);
const size = ref({ container: 0, copy: 0 });
let anim: Animation | null = null;
let observer: ResizeObserver | undefined;

function measure() {
  const root = rootEl.value;
  const copy = copyEl.value;
  if (root && copy) size.value = { container: root.clientWidth, copy: copy.getBoundingClientRect().width };
}
onMounted(() => {
  if (typeof ResizeObserver === "undefined") return;
  measure();
  observer = new ResizeObserver(measure);
  if (rootEl.value) observer.observe(rootEl.value);
  if (copyEl.value) observer.observe(copyEl.value);
});
onBeforeUnmount(() => {
  observer?.disconnect();
  anim?.finished?.catch?.(() => {});
  anim?.cancel();
});

const copies = computed(() => (reduced.value ? 1 : marqueeCopies(size.value.container, size.value.copy)));
const stopped = computed(() => props.paused || (props.pauseOnHover && halted.value));

watch(
  [reduced, () => size.value.copy, () => props.speed, () => props.direction],
  () => {
    anim?.finished?.catch?.(() => {});
    anim?.cancel();
    anim = null;
    const track = trackEl.value;
    if (!track || reduced.value || typeof track.animate !== "function" || !(size.value.copy > 0)) return;
    const rtl = getComputedStyle(track).direction === "rtl";
    const leftward = (props.direction === "start") === !rtl;
    const w = size.value.copy;
    const from = leftward ? (rtl ? w : 0) : rtl ? 0 : -w;
    const to = leftward ? (rtl ? 0 : -w) : rtl ? w : 0;
    anim = track.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${to}px)` }], {
      duration: marqueeDuration(w, props.speed) * 1000,
      iterations: Number.POSITIVE_INFINITY,
      easing: "linear",
    });
    if (stopped.value) anim.pause();
  },
  { flush: "post", immediate: false },
);
watch(
  stopped,
  (value) => {
    if (!anim) return;
    if (value) anim.pause();
    else anim.play();
  },
  { flush: "post" },
);

const style = computed(() => ({ "--marquee-gap": `${props.gap}px`, ...((attrs.style as CSSProperties | undefined) ?? {}) }) as CSSProperties);
const rest = computed(() => {
  const { class: _c, style: _s, ...others } = attrs;
  return others;
});
</script>

<template>
  <div
    ref="rootEl"
    data-slot="marquee"
    :data-static="reduced || undefined"
    :data-paused="stopped || undefined"
    :class="cn('overflow-hidden', props.fade && !reduced && '[mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]', props.class, attrs.class as string)"
    :style="style"
    v-bind="rest"
    v-on="on"
  >
    <div ref="trackEl" :class="cn('flex', reduced ? 'flex-wrap' : 'w-max')">
      <div
        v-for="i in copies"
        :key="i"
        :ref="(e) => { if (i === 1) copyEl = e as HTMLDivElement | null; }"
        data-slot="marquee-copy"
        :aria-hidden="i === 1 ? undefined : 'true'"
        :inert="i === 1 ? undefined : true"
        :class="cn('flex items-center gap-(--marquee-gap)', reduced ? 'flex-wrap justify-center' : 'shrink-0 pe-(--marquee-gap)')"
      >
        <slot />
      </div>
    </div>
  </div>
</template>
