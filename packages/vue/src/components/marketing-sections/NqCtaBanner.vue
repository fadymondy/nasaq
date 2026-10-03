<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqAuroraBackground from "./NqAuroraBackground.vue";

// The closing call to action of a page: one clear ask, one main button, optionally a quieter second one. Give it a
// single `action`; two equal buttons make the choice harder, not easier.
// Slots: `title`, `description`, `action`, `secondary-action`, `note`.
const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    /** A line of reassurance under the buttons: "No card needed". */
    note?: string;
    /** "brand": brand-tinted panel with an aurora glow. "neutral": quiet surface. Default "brand". */
    tone?: "brand" | "neutral";
    /** "center" (default) stacks and centres; "split" puts the buttons at the inline end from 48rem. */
    layout?: "center" | "split";
    titleAs?: "h2" | "h3";
    class?: HTMLAttributes["class"];
  }>(),
  { tone: "brand", layout: "center", titleAs: "h2", title: undefined, description: undefined, note: undefined },
);
const headingId = useId();
</script>

<template>
  <section data-slot="cta-banner" :aria-labelledby="headingId" :class="cn('@container w-full overflow-hidden rounded-card border', tone === 'brand' ? 'border-nq-brand/30 bg-nq-selected' : 'border-border bg-nq-surface-soft', props.class)">
    <component :is="tone === 'brand' ? NqAuroraBackground : 'div'" v-bind="tone === 'brand' ? { fade: false } : {}">
      <div :class="cn('relative flex min-w-0 flex-col gap-6 p-6 @2xl:p-10', layout === 'split' ? '@2xl:flex-row @2xl:items-center @2xl:justify-between' : 'items-center text-center')">
        <div :class="cn('flex min-w-0 max-w-xl flex-col gap-2', layout !== 'split' && 'items-center')">
          <component :is="titleAs" :id="headingId" class="font-semibold text-foreground text-h2 text-balance"><slot name="title">{{ title }}</slot></component>
          <p v-if="description || $slots.description" class="text-body-sm text-nq-fg-body text-pretty"><slot name="description">{{ description }}</slot></p>
        </div>
        <div :class="cn('flex min-w-0 flex-col gap-2', layout === 'split' ? '@2xl:items-end' : 'items-center')">
          <div :class="cn('flex flex-wrap gap-2', layout !== 'split' && 'justify-center')">
            <slot name="action" />
            <slot name="secondary-action" />
          </div>
          <p v-if="note || $slots.note" class="text-caption text-muted-foreground"><slot name="note">{{ note }}</slot></p>
        </div>
      </div>
    </component>
  </section>
</template>
