<script setup lang="ts">
import { ScrollAreaCorner, ScrollAreaRoot, ScrollAreaViewport } from "reka-ui";
import { onBeforeUnmount, provide, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { SCROLL_AREA_STATE } from "./context";
import NqScrollBar from "./NqScrollBar.vue";

/**
 * A scroll container with a thin styled scrollbar that appears on hover and while scrolling. Give it a bounded
 * height (or width) through `class`. The vertical scrollbar sits on the inline-end edge, so it moves to the
 * left in RTL. The viewport is focusable, so keyboard users can scroll with the arrow keys.
 */
interface Props {
  /** Which axes scroll and show a scrollbar. Default "vertical". */
  orientation?: "vertical" | "horizontal" | "both";
  /** Classes for the scrolling viewport, for padding inside the scroll region. */
  viewportClass?: HTMLAttributes["class"];
  /** Accessible name for the scroll region. The viewport is keyboard-focusable, so it needs a name. */
  ariaLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { orientation: "vertical" });
const nq = useNasaq();

const hovering = ref(false);
const scrolling = ref(false);
provide(SCROLL_AREA_STATE, { hovering, scrolling });
let timer: ReturnType<typeof setTimeout> | undefined;
function onScroll() {
  scrolling.value = true;
  clearTimeout(timer);
  timer = setTimeout(() => (scrolling.value = false), 600);
}
onBeforeUnmount(() => clearTimeout(timer));
</script>

<template>
  <ScrollAreaRoot
    data-slot="scroll-area"
    type="always"
    :dir="nq.direction.value"
    :class="cn('relative min-h-0 min-w-0 overflow-hidden', props.class)"
    @pointerenter="hovering = true"
    @pointerleave="hovering = false"
  >
    <ScrollAreaViewport
      data-slot="scroll-area-viewport"
      role="region"
      tabindex="0"
      :aria-label="props.ariaLabel"
      :class="cn('size-full rounded-[inherit] outline-none', 'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-nq-focus', props.viewportClass)"
      @scroll="onScroll"
    >
      <slot />
    </ScrollAreaViewport>
    <NqScrollBar v-if="props.orientation !== 'horizontal'" orientation="vertical" />
    <NqScrollBar v-if="props.orientation !== 'vertical'" orientation="horizontal" />
    <ScrollAreaCorner v-if="props.orientation === 'both'" data-slot="scroll-area-corner" />
  </ScrollAreaRoot>
</template>
