<script setup lang="ts">
import { computed, onMounted, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { carouselStrings } from "./carousel-logic";
import { useCarouselContext } from "./context";

// One slide. Full width by default; use `basis-1/2`, `basis-1/3`... on it to show several.
interface Props {
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const ctx = useCarouselContext();
const el = ref<HTMLElement | null>(null);
const mounted = ref(false);
onMounted(() => (mounted.value = true));

const label = computed(() => {
  ctx.version.value; // re-read when slides come and go
  const node = el.value;
  const parent = node?.parentElement;
  if (!mounted.value || !node || !parent) return undefined;
  const slides = [...parent.children];
  return carouselStrings(ctx.locale.value).slide(slides.indexOf(node) + 1, slides.length);
});
const snap = computed(() => ({ start: "snap-start", center: "snap-center", end: "snap-end" })[ctx.align.value]);
</script>

<template>
  <div
    ref="el"
    role="group"
    aria-roledescription="slide"
    :aria-label="label"
    data-slot="carousel-item"
    :class="cn('min-w-0 shrink-0 grow-0 basis-full ps-4', snap, '-scroll-ms-4', props.class)"
  >
    <slot />
  </div>
</template>
