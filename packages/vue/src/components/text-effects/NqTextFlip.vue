<script setup lang="ts">
import { computed, ref, watch, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { usePrefersReducedMotion } from "../ai-states";
import { useHalt } from "./halt";
import { countTextTokens, nextFlipIndex, splitText, textStaggerDelay, type TextSplitMode } from "./text-effects-model";

// A short phrase that flips to the next one, like a departures board: "Ship faster / calmer / together". All phrases share one grid cell, so the
// width is the widest phrase and nothing around it jumps. Under `prefers-reduced-motion` it does not rotate at all and shows the first phrase.
const FLIP_OUT_MS = 240;

const props = withDefaults(
  defineProps<{
    /** The phrases to rotate through. Screen readers get all of them as one list. */
    phrases: readonly string[];
    /** Milliseconds each phrase stays. Default 2600. */
    interval?: number;
    /**
     * How each phrase is cut into pieces that flip one after the other. "word" (default) flips word by word; "grapheme" flips character
     * by character but Arabic and other joining scripts always flip word by word, so letters never separate.
     */
    by?: TextSplitMode;
    /** Stop rotating. Rotation also stops while the pointer or focus is on the text, and under reduced motion. */
    paused?: boolean;
    /** Start again from the first phrase after the last. Default true. */
    loop?: boolean;
    /** Language tag for the phrases when it differs from the page ("ar"). */
    lang?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { interval: 2600, by: "word", paused: false, loop: true, lang: undefined },
);
/** The index of the phrase that just became visible. */
const emit = defineEmits<{ indexChange: [index: number] }>();

const nq = useNasaq();
const locale = computed(() => nq.locale.value);
const reduced = usePrefersReducedMotion();
const { halted, on } = useHalt();
const index = ref(0);
const list = computed(() => props.phrases.map((phrase) => splitText(phrase, props.by, props.lang ?? locale.value)));

const running = computed(() => !reduced.value && !props.paused && !halted.value && props.phrases.length > 1);
watch(
  [running, () => props.interval, () => props.phrases.length, () => props.loop],
  ([on_], _old, onCleanup) => {
    if (!on_) return;
    const id = window.setInterval(() => {
      const next = nextFlipIndex(index.value, props.phrases.length, props.loop);
      if (next !== index.value) {
        index.value = next;
        emit("indexChange", next);
      }
    }, Math.max(800, props.interval));
    onCleanup(() => window.clearInterval(id));
  },
  { immediate: true },
);

const active = computed(() => Math.min(index.value, Math.max(0, props.phrases.length - 1)));

function tokenStyle(isActive: boolean, delay: number): CSSProperties {
  return reduced.value
    ? { opacity: isActive ? 1 : 0 }
    : {
        opacity: isActive ? 1 : 0,
        transform: isActive ? "none" : "rotateX(-90deg) translateY(0.35em)",
        transitionProperty: "transform, opacity",
        transitionDuration: isActive ? "420ms, 320ms" : `${FLIP_OUT_MS}ms, ${FLIP_OUT_MS}ms`,
        transitionTimingFunction: "cubic-bezier(0.2, 0.7, 0.2, 1)",
        transitionDelay: `${isActive ? FLIP_OUT_MS + delay : delay}ms`,
      };
}
</script>

<template>
  <span
    data-slot="text-flip"
    :data-reduced="reduced || undefined"
    :lang="props.lang"
    :class="cn('relative inline-grid align-baseline [perspective:600px]', props.class)"
    v-on="on"
  >
    <span class="sr-only">{{ props.phrases.join(locale.startsWith("ar") ? "، " : ", ") }}</span>
    <span
      v-for="(phrase, i) in list"
      :key="`${i}-${props.phrases[i]}`"
      aria-hidden="true"
      :data-active="i === active || undefined"
      class="col-start-1 row-start-1 whitespace-nowrap [transform-style:preserve-3d]"
    >
      <template v-for="(token, k) in phrase.tokens" :key="k">
        <template v-if="token.space">{{ token.text }}</template>
        <span v-else class="inline-block [backface-visibility:hidden]" :style="tokenStyle(i === active, textStaggerDelay(token.order, countTextTokens(phrase.tokens), 45, 360))">{{ token.text }}</span>
      </template>
    </span>
  </span>
</template>
