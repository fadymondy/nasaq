<script setup lang="ts">
import { ScrollAreaScrollbar, ScrollAreaThumb } from "reka-ui";
import { inject, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { SCROLL_AREA_STATE } from "./context";

// One scrollbar with its thumb. NqScrollArea renders these for you; use it directly only when composing your own scroll area.
interface Props {
  orientation?: "vertical" | "horizontal";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { orientation: "vertical" });
const state = inject(SCROLL_AREA_STATE, { hovering: ref(false), scrolling: ref(false) });
</script>

<template>
  <ScrollAreaScrollbar
    data-slot="scroll-area-scrollbar"
    :orientation="props.orientation"
    :data-hovering="state.hovering.value ? '' : undefined"
    :data-scrolling="state.scrolling.value ? '' : undefined"
    :class="
      cn(
        'absolute flex touch-none select-none p-0.5 opacity-0 transition-opacity duration-150 ease-nq',
        'data-hovering:opacity-100 data-scrolling:opacity-100',
        // The vertical bar sits on the inline-end edge: the right in LTR, the left in RTL.
        props.orientation === 'vertical' ? 'inset-y-0 end-0 w-2.5' : 'inset-x-0 bottom-0 h-2.5 flex-col',
        props.class,
      )
    "
  >
    <ScrollAreaThumb data-slot="scroll-area-thumb" class="relative flex-1 rounded-full bg-nq-line-strong" />
  </ScrollAreaScrollbar>
</template>
