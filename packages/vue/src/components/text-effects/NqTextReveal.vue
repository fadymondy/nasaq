<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { usePrefersReducedMotion } from "../ai-states";
import { countTextTokens, splitText, textStaggerDelay, type TextSplitMode } from "./text-effects-model";

// Text that fades and rises into place piece by piece when it scrolls into view. Under reduced motion it is simply shown.
const props = withDefaults(
  defineProps<{
    /** The text to reveal. */
    text: string;
    /** "word" (default) reveals word by word; "grapheme" reveals character by character, except in Arabic and other joining scripts, which stay word by word. */
    by?: TextSplitMode;
    /** Element to render. Default "span". */
    as?: string;
    /** Reveal as soon as it mounts instead of when it scrolls into view. */
    immediate?: boolean;
    /** Milliseconds between pieces. Default 45; the whole reveal is capped at about 900 ms. */
    step?: number;
    lang?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { by: "word", as: "span", immediate: false, step: 45, lang: undefined },
);

const nq = useNasaq();
const reduced = usePrefersReducedMotion();
const el = ref<HTMLElement | null>(null);
const seen = ref(props.immediate);
const split = computed(() => splitText(props.text, props.by, props.lang ?? nq.locale.value));
const count = computed(() => countTextTokens(split.value.tokens));
let observer: IntersectionObserver | undefined;

watch(
  [el, seen, reduced],
  () => {
    observer?.disconnect();
    if (seen.value || reduced.value || !el.value) return;
    if (typeof IntersectionObserver === "undefined") {
      seen.value = true;
      return;
    }
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          seen.value = true;
          observer?.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    observer.observe(el.value);
  },
  { flush: "post", immediate: true },
);
onBeforeUnmount(() => observer?.disconnect());

const shown = computed(() => reduced.value || seen.value);
</script>

<template>
  <component :is="props.as" ref="el" data-slot="text-reveal" :data-split="split.mode" :data-shown="shown || undefined" :lang="props.lang" :class="cn(props.class)">
    <span class="sr-only">{{ props.text }}</span>
    <span aria-hidden="true">
      <template v-for="(token, i) in split.tokens" :key="i">
        <template v-if="token.space || reduced">{{ token.text }}</template>
        <span
          v-else
          class="inline-block"
          :style="{
            opacity: shown ? 1 : 0,
            transform: shown ? 'none' : 'translateY(0.4em)',
            filter: shown ? 'none' : 'blur(4px)',
            transition: 'opacity 420ms ease-out, transform 420ms ease-out, filter 420ms ease-out',
            transitionDelay: `${textStaggerDelay(token.order, count, props.step, 900)}ms`,
          }"
          >{{ token.text }}</span
        >
      </template>
    </span>
  </component>
</template>
