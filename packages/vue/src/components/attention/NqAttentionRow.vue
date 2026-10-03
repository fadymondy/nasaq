<script setup lang="ts">
import { CircleCheck, X } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { computed } from "vue";
import { cn } from "../../lib/cn";
import { buttonVariants } from "../button";
import { attentionToneIcon, attentionToneText, type AttentionItem, type AttentionTone } from "./attention-logic";

// One row. The title is the row's link or button and stretches over the row, so the whole row is
// clickable while the action and dismiss buttons stay separate tab stops.
interface Props {
  item: AttentionItem;
  dismissLabel?: string;
  doneLabel?: string;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { dismissLabel: "Dismiss", doneLabel: "Done" });

const tone = computed<AttentionTone>(() => (props.item.done ? "neutral" : (props.item.tone ?? "neutral")));
const Glyph = computed(() => props.item.icon ?? attentionToneIcon[tone.value]);
const ToneGlyph = computed(() => attentionToneIcon[tone.value]);
const interactive = computed(() => Boolean(props.item.href || props.item.onSelect));
const titleClass = computed(() =>
  cn(
    "min-w-0 truncate text-body-sm text-start outline-none",
    props.item.done ? "text-muted-foreground" : "text-foreground",
    interactive.value &&
      "after:absolute after:inset-0 after:rounded-control focus-visible:after:outline-2 focus-visible:after:-outline-offset-2 focus-visible:after:outline-nq-focus",
  ),
);
const actionClass = cn(buttonVariants({ variant: "secondary", size: "sm" }), "relative z-10");
</script>

<template>
  <li
    data-slot="attention-item"
    :data-tone="tone"
    :data-done="props.item.done || undefined"
    :class="
      cn(
        'group/attention relative flex min-h-row items-center gap-3 border-b border-border px-1 py-2',
        interactive && 'transition-colors duration-150 ease-nq hover:bg-nq-hover',
        props.class,
      )
    "
  >
    <span class="relative flex size-5 shrink-0 items-center justify-center [&>svg]:size-4">
      <CircleCheck v-if="props.item.done" aria-hidden="true" class="size-4 text-nq-success-text" />
      <component :is="Glyph" v-else aria-hidden="true" :class="cn('size-4', attentionToneText[tone])" />
      <!-- A custom icon replaces the tone shape, so urgency moves to a small badge on its corner. -->
      <span v-if="props.item.icon && !props.item.done && tone !== 'neutral'" data-slot="attention-tone" class="absolute -end-1 -bottom-1 flex rounded-full bg-background">
        <component :is="ToneGlyph" aria-hidden="true" :class="cn('size-2.5', attentionToneText[tone])" :stroke-width="3" />
      </span>
    </span>
    <span class="flex min-w-0 flex-1 flex-col">
      <a v-if="props.item.href" :href="props.item.href" :class="titleClass">{{ props.item.title }}</a>
      <button v-else-if="props.item.onSelect" type="button" :class="titleClass" @click="props.item.onSelect?.()">{{ props.item.title }}</button>
      <span v-else :class="titleClass">{{ props.item.title }}</span>
      <span v-if="props.item.description" class="truncate text-caption text-muted-foreground">{{ props.item.description }}</span>
      <span v-if="props.item.done" class="sr-only">{{ props.doneLabel }}</span>
    </span>
    <span
      v-if="props.item.count !== undefined"
      data-slot="attention-item-count"
      class="shrink-0 rounded-full border border-border px-1.5 text-caption text-foreground tabular-nums"
    >
      {{ props.item.count }}
    </span>
    <time v-if="props.item.time" :datetime="props.item.dateTime" class="shrink-0 text-caption text-muted-foreground tabular-nums">{{ props.item.time }}</time>
    <template v-if="props.item.action && !props.item.done">
      <a v-if="props.item.action.href" :href="props.item.action.href" :class="actionClass">{{ props.item.action.label }}</a>
      <button v-else type="button" :class="actionClass" @click="props.item.action.onClick?.()">{{ props.item.action.label }}</button>
    </template>
    <button
      v-if="props.item.onDismiss"
      type="button"
      :aria-label="props.dismissLabel"
      :class="
        cn(
          buttonVariants({ variant: 'ghost', size: 'icon-sm' }),
          'relative z-10 text-muted-foreground opacity-0 group-hover/attention:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100 [&_svg]:size-3.5',
        )
      "
      @click="props.item.onDismiss?.()"
    >
      <X aria-hidden="true" />
    </button>
  </li>
</template>
