<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqMarkdown } from "../markdown";
import { linkMentions, type CommentMention } from "./comment-thread-logic";

// A comment's Markdown with `@name` shown as chips. The mention links that linkMentions writes are styled as chips and do not
// navigate (the React renderMention hook has no equivalent: the Markdown renderer has no per-link override).
interface Props {
  body: string;
  mentions?: readonly CommentMention[];
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const source = computed(() => linkMentions(props.body, props.mentions));
const chip =
  "[&_a[href^='#mention-']]:cursor-default [&_a[href^='#mention-']]:rounded-[4px] [&_a[href^='#mention-']]:bg-nq-info-soft [&_a[href^='#mention-']]:px-1 [&_a[href^='#mention-']]:font-medium [&_a[href^='#mention-']]:text-nq-info-text [&_a[href^='#mention-']]:no-underline";
function onClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest("a[href^='#mention-']")) event.preventDefault();
}
</script>

<template>
  <div data-slot="comment-body" @click="onClick">
    <NqMarkdown :source="source" :class="cn('gap-2 text-body-sm', chip, props.class)" />
  </div>
</template>
