<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { ChevronRight } from "lucide-vue-next";
import { carouselStrings } from "./carousel-logic";
import { useCarouselContext } from "./context";

// Next slide. Sits at the inline-end edge; the chevron mirrors in RTL.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = useCarouselContext();
</script>

<template>
  <NqButton
    variant="secondary"
    size="icon"
    data-slot="carousel-next"
    :aria-label="carouselStrings(ctx.locale.value).next"
    :disabled="!ctx.canNext.value"
    :class="cn('absolute top-1/2 z-10 -translate-y-1/2 rounded-full bg-card/90 shadow-floating backdrop-blur-sm data-disabled:opacity-0', 'end-3', props.class)"
    @click="ctx.scrollNext()"
  >
    <slot><NqIcon :icon="ChevronRight" directional /></slot>
  </NqButton>
</template>
