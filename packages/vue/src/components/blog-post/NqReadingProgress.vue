<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { readingProgress } from "../blog-index/blog-model";
import { useBlogPostStrings } from "./labels";

// A thin bar that fills as the reader scrolls through `target`. It sticks to the top of its scroll container, fills from the
// inline start (so from the right in Arabic) and reports its value as role="progressbar".
interface Props {
  /** The article element whose scroll extent is measured. */
  target?: HTMLElement | null;
  /** Accessible name. Default "Reading progress". */
  label?: string;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const { t } = useBlogPostStrings();
const value = ref(0);
let raf = 0;
const update = () => {
  raf = 0;
  const el = props.target;
  if (!el) return;
  const r = el.getBoundingClientRect();
  value.value = readingProgress(r.top, r.height, window.innerHeight);
};
const onScroll = () => {
  if (!raf) raf = requestAnimationFrame(update);
};
watch(() => props.target, update, { flush: "post" });
onMounted(() => {
  update();
  document.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onScroll);
});
onBeforeUnmount(() => {
  if (raf) cancelAnimationFrame(raf);
  document.removeEventListener("scroll", onScroll, { capture: true });
  window.removeEventListener("resize", onScroll);
});
</script>

<template>
  <div
    data-slot="reading-progress"
    role="progressbar"
    :aria-label="props.label ?? t.progress"
    :aria-valuemin="0"
    :aria-valuemax="100"
    :aria-valuenow="Math.round(value * 100)"
    :class="cn('sticky top-0 z-30 h-0.5 w-full', props.class)"
  >
    <div class="h-full bg-primary" :style="{ width: `${value * 100}%` }" />
  </div>
</template>
