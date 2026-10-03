<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { BRAILLE_FRAMES } from "./loader-frames";
import { useBrandLoaderStrings } from "./strings";
import { useTick } from "./use-tick";

interface Props {
  /** Announced to screen readers. Default "Loading" / "جارٍ التحميل". */
  label?: string;
  /** Custom frames, one character each. Default: the ten-frame braille spinner. */
  frames?: readonly string[];
  /** Milliseconds per frame. Default 80. */
  interval?: number;
  class?: HTMLAttributes["class"];
}

// A one-character text spinner made of braille dots. Inherits the text colour and size.
const props = withDefaults(defineProps<Props>(), { frames: () => BRAILLE_FRAMES, interval: 80 });
const t = useBrandLoaderStrings();
const tick = useTick(() => props.interval);
const frame = computed(() => props.frames[tick.value % props.frames.length]);
</script>

<template>
  <span data-slot="braille-loader" role="status" :class="cn('inline-flex', props.class)">
    <span aria-hidden="true" dir="ltr" class="inline-block w-[1ch] text-center font-mono leading-none">{{ frame }}</span>
    <span class="sr-only">{{ props.label ?? t.loading }}</span>
  </span>
</template>
