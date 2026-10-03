<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqLinkify from "./NqLinkify.vue";

// User-provided text that could be in either direction. It is isolated from the surrounding sentence (so an English
// name never scrambles an Arabic sentence, or the other way round), aligns to the start edge of the layout, and can be
// clamped to a number of lines and linkified. Give the text as the default slot or the `text` prop.
interface Props {
  /** The text, when not given as the slot. */
  text?: string;
  /** Render as a block element with its own line box. Default false renders an isolated inline run. */
  block?: boolean;
  /** Clamp to this many lines, with an ellipsis. `title` shows the full text. */
  lines?: number;
  /** Turn URLs and emails into links. */
  linkify?: boolean;
  /** Element to render. Default `span` (or `p` for `block`). */
  as?: string;
  title?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { text: undefined, block: false, lines: undefined, linkify: false, as: undefined, title: undefined });
const slots = defineSlots<{ default?: () => unknown }>();
const tag = computed(() => props.as ?? (props.block ? "p" : "span"));
const clamped = computed(() => props.lines !== undefined && props.lines > 0);
const plain = computed(() => {
  if (props.text !== undefined) return props.text;
  return ((slots.default?.() ?? []) as { children?: unknown }[]).map((n) => (typeof n.children === "string" ? n.children : "")).join("");
});
const style = computed(() => (clamped.value ? { display: "-webkit-box", WebkitLineClamp: props.lines, WebkitBoxOrient: "vertical" as const } : undefined));
</script>

<template>
  <component
    :is="tag"
    data-slot="user-text"
    dir="auto"
    :title="props.title ?? (clamped ? plain : undefined)"
    :class="cn('[unicode-bidi:isolate] text-start', props.block && 'block [unicode-bidi:plaintext]', clamped && 'overflow-hidden break-words', props.class)"
    :style="style"
  >
    <NqLinkify v-if="props.linkify" :text="plain" />
    <slot v-else>{{ props.text }}</slot>
  </component>
</template>
