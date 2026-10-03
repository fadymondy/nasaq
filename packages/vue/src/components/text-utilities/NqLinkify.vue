<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { linkifyText } from "./text-utilities-logic";

// Turns the http, https, www and email addresses in plain text into links. Only safe schemes are produced.
// Each link is isolated and left to right, so a URL keeps its order inside Arabic text. The text is never parsed as HTML.
interface Props {
  /** The plain text to scan. */
  text: string;
  /** Turn addresses like `name@example.com` into `mailto:` links. Default true. */
  emails?: boolean;
  /** Classes for each generated link. */
  linkClass?: HTMLAttributes["class"];
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { emails: true, linkClass: undefined });
defineSlots<{ link?: (p: { text: string; href: string; kind: "url" | "email" }) => unknown }>();
const segments = computed(() => linkifyText(props.text, { emails: props.emails }));
</script>

<template>
  <span data-slot="linkify" :class="props.class">
    <template v-for="(seg, i) in segments" :key="i">
      <template v-if="seg.type === 'text'">{{ seg.text }}</template>
      <bdi v-else-if="$slots.link"><slot name="link" :text="seg.text" :href="seg.href" :kind="seg.type" /></bdi>
      <bdi v-else dir="ltr">
        <a
          :href="seg.href"
          :target="seg.type === 'url' ? '_blank' : undefined"
          :rel="seg.type === 'url' ? 'noopener noreferrer nofollow ugc' : undefined"
          :class="
            cn(
              '[overflow-wrap:anywhere] text-foreground underline decoration-nq-line underline-offset-4 hover:decoration-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus',
              props.linkClass,
            )
          "
          >{{ seg.text }}</a
        >
      </bdi>
    </template>
  </span>
</template>
