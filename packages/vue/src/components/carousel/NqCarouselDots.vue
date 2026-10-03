<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { carouselStrings } from "./carousel-logic";
import { useCarouselContext } from "./context";

// One dot per scroll snap. The current dot has aria-current="true". Place it under the content.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = useCarouselContext();
const t = computed(() => carouselStrings(ctx.locale.value));
</script>

<template>
  <div
    v-if="ctx.count.value >= 2"
    role="group"
    :aria-label="t.slides"
    data-slot="carousel-dots"
    :class="cn('mt-3 flex items-center justify-center gap-1.5', props.class)"
  >
    <button
      v-for="i in ctx.count.value"
      :key="i"
      type="button"
      :aria-label="t.goTo(i)"
      :aria-current="i - 1 === ctx.selected.value ? 'true' : undefined"
      :class="
        cn(
          'relative h-2 rounded-full bg-nq-line-strong outline-none transition-[width,background-color] duration-150 ease-nq',
          'hover:bg-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
          // 24px hit area without changing the dot's look.
          'after:absolute after:-inset-2 after:content-[\'\']',
          i - 1 === ctx.selected.value ? 'w-5 bg-primary hover:bg-primary' : 'w-2',
        )
      "
      @click="ctx.scrollTo(i - 1)"
    />
  </div>
</template>
