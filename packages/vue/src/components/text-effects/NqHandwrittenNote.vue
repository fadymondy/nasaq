<script setup lang="ts">
import { computed, useAttrs, type CSSProperties, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { HANDWRITING, noteTone, type HandwrittenTone } from "./marks";

// A margin note that looks written by hand: a slightly tilted paper with a handwriting font, for a tip or a human aside on a marketing page or a
// document. The font is a system stack (or `--nq-font-handwriting`); the note is plain text for assistive tech.
defineOptions({ inheritAttrs: false });
const props = withDefaults(
  defineProps<{
    /** Colour of the paper. Default "note". */
    tone?: HandwrittenTone;
    /** Tilt in degrees, kept small so text stays readable. Default -2. */
    rotate?: number;
    /** A strip of tape at the top. Default true. */
    tape?: boolean;
    /** Who wrote it, in plain type under the note. The `author` slot takes richer content. */
    author?: string;
    class?: HTMLAttributes["class"];
  }>(),
  { tone: "note", rotate: -2, tape: true, author: undefined },
);
const attrs = useAttrs();
const style = computed(() => ({ transform: `rotate(${Math.max(-6, Math.min(6, props.rotate))}deg)`, ...((attrs.style as CSSProperties | undefined) ?? {}) }) as CSSProperties);
const rest = computed(() => {
  const { class: _c, style: _s, ...others } = attrs;
  return others;
});
</script>

<template>
  <aside
    data-slot="handwritten-note"
    :class="cn('relative inline-block max-w-xs rounded-[3px] border px-4 pb-3 pt-5 text-foreground shadow-floating', noteTone[props.tone], props.class, attrs.class as string)"
    :style="style"
    v-bind="rest"
  >
    <span v-if="props.tape" aria-hidden="true" class="absolute inset-x-0 -top-2.5 mx-auto h-5 w-16 rotate-2 bg-[color-mix(in_oklab,var(--nq-fg)_14%,transparent)]" />
    <div class="text-h3 leading-snug" :style="{ fontFamily: HANDWRITING }">
      <slot />
    </div>
    <div v-if="$slots.author || props.author" class="mt-2 text-caption text-muted-foreground">
      <slot name="author">{{ props.author }}</slot>
    </div>
  </aside>
</template>
