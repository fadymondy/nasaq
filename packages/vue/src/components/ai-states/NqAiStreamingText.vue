<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import { NqMarkdown } from "../markdown";
import { nextRevealLength, safePartialMarkdown } from "./ai-states-logic";
import { aiStatesWords, type AiStatesLabels } from "./labels";
import { usePrefersReducedMotion } from "./shortcut";

// Streaming answer text: a caret at the end, a progressive reveal, and Markdown that stays valid while it is half written.
// Under reduced motion the text appears at once and the caret does not pulse. Screen readers are told once the answer is ready.
const props = withDefaults(
  defineProps<{
    /** The text so far. Append tokens to it as they arrive. */
    text: string;
    /** More text is still coming. Shows the caret and keeps the display safe for half-written Markdown. */
    streaming?: boolean;
    /** Types the text out smoothly instead of showing each chunk as it lands. Default true. */
    reveal?: boolean;
    /** Reveal speed in characters a second. It speeds up on its own when the stream runs ahead. Default 90. */
    cps?: number;
    /** Render as Markdown (safe while partial). Default true. Off keeps the text plain. */
    markdown?: boolean;
    /** Draw the caret while streaming. Default true. */
    caret?: boolean;
    /** Fires once the whole text is on screen and streaming has stopped. */
    onRevealed?: () => void;
    labels?: Partial<AiStatesLabels>;
    class?: HTMLAttributes["class"];
  }>(),
  { streaming: false, reveal: true, cps: 90, markdown: true, caret: true, onRevealed: undefined, labels: undefined },
);

const CARET =
  "after:ms-0.5 after:inline-block after:h-[1.05em] after:w-[2px] after:translate-y-[0.2em] after:rounded-[1px] after:bg-nq-accent after:content-[''] motion-safe:after:animate-pulse";
// The same caret on the last block of the rendered Markdown (Tailwind needs the classes written out).
const MARKDOWN_CARET =
  "[&_[data-slot=markdown]>:last-child]:after:ms-0.5 [&_[data-slot=markdown]>:last-child]:after:inline-block [&_[data-slot=markdown]>:last-child]:after:h-[1.05em] [&_[data-slot=markdown]>:last-child]:after:w-[2px] [&_[data-slot=markdown]>:last-child]:after:translate-y-[0.2em] [&_[data-slot=markdown]>:last-child]:after:rounded-[1px] [&_[data-slot=markdown]>:last-child]:after:bg-nq-accent [&_[data-slot=markdown]>:last-child]:after:content-[''] motion-safe:[&_[data-slot=markdown]>:last-child]:after:animate-pulse";

const nq = useNasaq();
const t = computed(() => aiStatesWords(nq.locale.value, props.labels));
const reduced = usePrefersReducedMotion();
const smooth = computed(() => props.reveal && !reduced.value);
const shown = ref(smooth.value ? 0 : props.text.length);
let announced = false;

// A shorter text (regenerate, new answer) starts over.
watch([() => props.text, smooth, () => props.streaming], () => {
  if (shown.value > props.text.length) shown.value = smooth.value ? 0 : props.text.length;
  if (props.streaming) announced = false;
});

let frame = 0;
function stop() {
  if (frame && typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
  frame = 0;
}
watch(
  [smooth, () => props.cps],
  () => {
    stop();
    if (!smooth.value || typeof requestAnimationFrame !== "function") {
      shown.value = props.text.length;
      return;
    }
    let last = performance.now();
    const tick = (now: number) => {
      const target = props.text;
      shown.value = nextRevealLength(Math.min(shown.value, target.length), target.length, now - last, target, props.cps);
      last = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  },
  { immediate: true },
);
onBeforeUnmount(stop);

const visible = computed(() => (smooth.value ? props.text.slice(0, Math.min(shown.value, props.text.length)) : props.text));
const caughtUp = computed(() => visible.value.length >= props.text.length);
const finished = computed(() => !props.streaming && caughtUp.value);
watch(
  [finished, () => props.text],
  () => {
    if (finished.value && props.text && !announced) {
      announced = true;
      props.onRevealed?.();
    }
  },
  { immediate: true },
);
const showCaret = computed(() => props.caret && !finished.value);
</script>

<template>
  <div data-slot="ai-streaming-text" :data-streaming="!finished || undefined" :aria-busy="!finished" :class="cn('min-w-0', props.class)">
    <div aria-live="off" :class="cn(showCaret && MARKDOWN_CARET)">
      <NqMarkdown v-if="props.markdown" :source="finished ? props.text : safePartialMarkdown(visible)" />
      <p v-else dir="auto" data-slot="ai-plain" :class="cn('whitespace-pre-wrap text-start text-body text-nq-fg-body', showCaret && CARET)">{{ visible }}</p>
    </div>
    <span role="status" class="sr-only">{{ finished && props.text ? t.ready : "" }}</span>
  </div>
</template>
