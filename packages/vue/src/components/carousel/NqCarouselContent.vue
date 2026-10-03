<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCarouselContext } from "./context";

// The scrolling track. Its children (NqCarouselItem) are the slides.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = useCarouselContext();
const viewport = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);

let frame = 0;
const onScroll = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => ctx.sync());
};
let resize: ResizeObserver | undefined;
let mutate: MutationObserver | undefined;
onMounted(() => {
  ctx.viewport.value = viewport.value;
  if (typeof ResizeObserver !== "undefined" && viewport.value) {
    resize = new ResizeObserver(() => ctx.sync());
    resize.observe(viewport.value);
    if (track.value) resize.observe(track.value);
  }
  if (typeof MutationObserver !== "undefined" && track.value) {
    mutate = new MutationObserver(() => ctx.sync());
    mutate.observe(track.value, { childList: true });
  }
  ctx.sync();
});
onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  resize?.disconnect();
  mutate?.disconnect();
  ctx.viewport.value = null;
});
</script>

<template>
  <div
    ref="viewport"
    data-slot="carousel-viewport"
    class="overflow-x-auto overflow-y-hidden rounded-[inherit] snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    @scroll.passive="onScroll"
  >
    <div ref="track" data-slot="carousel-content" :class="cn('-ms-4 flex touch-pan-y', props.class)">
      <slot />
    </div>
  </div>
</template>
