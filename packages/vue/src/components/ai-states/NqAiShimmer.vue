<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import { usePrefersReducedMotion } from "./shortcut";

// Text placeholder with one light sweep across all lines, for an answer that has not started yet.
// The sweep follows the reading direction and does not run under reduced motion.
const props = withDefaults(
  defineProps<{
    /** Placeholder lines. Default 3. */
    lines?: number;
    /** Announced to screen readers. Default "Thinking". */
    label?: string;
    labels?: Partial<AiStatesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { lines: 3, label: undefined, labels: undefined },
);
const LINE_WIDTHS = [96, 88, 92, 64, 78];
const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const reduced = usePrefersReducedMotion();
const sweep = ref<HTMLSpanElement | null>(null);
let anim: Animation | undefined;
function stopSweep() {
  anim?.finished?.catch(() => {});
  anim?.cancel();
  anim = undefined;
}
watch(
  [sweep, reduced],
  ([el, r]) => {
    stopSweep();
    if (!el || r || typeof el.animate !== "function") return;
    const rtl = getComputedStyle(el).direction === "rtl";
    anim = el.animate(
      { transform: rtl ? ["translateX(100%)", "translateX(-100%)"] : ["translateX(-100%)", "translateX(100%)"] },
      { duration: 1500, iterations: Number.POSITIVE_INFINITY, easing: "ease-in-out" },
    );
  },
  { flush: "post" },
);
onBeforeUnmount(stopSweep);
</script>

<template>
  <div data-slot="ai-shimmer" role="status" aria-busy="true" :class="cn('relative flex flex-col gap-2.5 overflow-hidden rounded-control', props.class)">
    <span class="sr-only">{{ props.label ?? t.thinking }}</span>
    <span v-for="i in props.lines" :key="i" aria-hidden="true" class="block h-3 rounded-[4px] bg-secondary" :style="{ inlineSize: `${LINE_WIDTHS[(i - 1) % LINE_WIDTHS.length]}%` }" />
    <span
      v-if="!reduced"
      ref="sweep"
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent,color-mix(in_oklab,var(--nq-bg)_65%,transparent),transparent)]"
    />
  </div>
</template>
