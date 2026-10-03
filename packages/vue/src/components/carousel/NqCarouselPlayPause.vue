<script setup lang="ts">
import { Pause, Play } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { NqButton } from "../button";
import { carouselStrings } from "./carousel-logic";
import { useCarouselContext } from "./context";

// Pause / start button for autoplay. Renders nothing when autoplay is off or reduced motion is requested.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = useCarouselContext();
</script>

<template>
  <NqButton
    v-if="ctx.autoplayEnabled.value"
    variant="ghost"
    size="icon-sm"
    data-slot="carousel-play-pause"
    :aria-label="ctx.playing.value ? carouselStrings(ctx.locale.value).pause : carouselStrings(ctx.locale.value).play"
    :aria-pressed="!ctx.playing.value"
    :class="props.class"
    @click="ctx.setPlaying(!ctx.playing.value)"
  >
    <Pause v-if="ctx.playing.value" />
    <Play v-else />
  </NqButton>
</template>
