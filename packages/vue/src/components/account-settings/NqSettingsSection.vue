<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard, NqCardAction, NqCardContent, NqCardDescription, NqCardFooter, NqCardHeader, NqCardTitle } from "../card";

// One block of a settings page: a card with a heading, a description, the content, and an optional footer with a
// hint and action buttons. The card is a labelled region, so a screen reader can jump to it.
// Slots: default (the fields), `title`, `description`, `action` (inline end of the header), `footer` (hint, inline
// start) and `actions` (buttons, inline end). The footer shows only when `footer` or `actions` is filled.
interface Props {
  title?: string;
  /** One or two sentences under the title. */
  description?: string;
  /** Small text at the inline start of the footer: a hint or the last change. */
  footer?: string;
  /** "danger" tints the border for destructive actions. Default "default". */
  tone?: "default" | "danger";
  /** Heading element for the title. Default 2 (h2). */
  headingLevel?: 2 | 3 | 4;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { title: undefined, description: undefined, footer: undefined, tone: "default", headingLevel: 2 });
const titleId = `nq-settings-section-${useId()}`;
</script>

<template>
  <NqCard
    role="region"
    :aria-labelledby="titleId"
    data-slot="settings-section"
    :data-tone="props.tone"
    :class="cn('gap-5', props.tone === 'danger' && 'border-nq-danger/40', props.class)"
  >
    <NqCardHeader>
      <NqCardTitle :as="`h${props.headingLevel}` as 'h2'" :id="titleId" :class="cn('text-h3', props.tone === 'danger' && 'text-nq-danger-text')">
        <slot name="title">{{ props.title }}</slot>
      </NqCardTitle>
      <NqCardDescription v-if="props.description || $slots.description"><slot name="description">{{ props.description }}</slot></NqCardDescription>
      <NqCardAction v-if="$slots.action"><slot name="action" /></NqCardAction>
    </NqCardHeader>
    <NqCardContent v-if="$slots.default"><slot /></NqCardContent>
    <NqCardFooter v-if="props.footer || $slots.footer || $slots.actions" data-slot="settings-section-footer" class="flex-wrap justify-between gap-3 border-t border-border pt-4">
      <div class="min-w-0 text-caption text-muted-foreground"><slot name="footer">{{ props.footer }}</slot></div>
      <div v-if="$slots.actions" class="flex flex-wrap items-center gap-2"><slot name="actions" /></div>
    </NqCardFooter>
  </NqCard>
</template>
