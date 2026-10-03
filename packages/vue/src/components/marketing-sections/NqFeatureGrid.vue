<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import { computed, useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useNasaq } from "../../provider";
import SectionIntro from "./SectionIntro.vue";
import type { FeatureGridItem } from "./types";

const GRID_COLS = { 2: "@2xl:grid-cols-2", 3: "@2xl:grid-cols-2 @4xl:grid-cols-3", 4: "@2xl:grid-cols-2 @4xl:grid-cols-4" } as const;

// A grid of short feature tiles: an icon, a title and one or two lines. It adapts to its container, not the screen, and
// every tile uses the full width of its cell. For one feature with a picture use NqFeatureStory.
// Slots: `eyebrow`, `title`, `description`, and `icon` (receives `{ feature, index }`).
const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    features: readonly FeatureGridItem[];
    /** Columns at the widest. Default 3. */
    columns?: 2 | 3 | 4;
    /** "cards": bordered tiles. "plain": no borders, icons only. Default "cards". */
    variant?: "cards" | "plain";
    align?: "start" | "center";
    titleAs?: "h2" | "h3";
    class?: HTMLAttributes["class"];
  }>(),
  { columns: 3, variant: "cards", align: "start", titleAs: "h2", eyebrow: undefined, title: undefined, description: undefined },
);
const headingId = useId();
const nq = useNasaq();
const ar = computed(() => nq.locale.value.startsWith("ar"));
const tile = (f: FeatureGridItem) =>
  cn("group flex h-full min-w-0 flex-col items-start gap-3 p-4 text-start", props.variant === "cards" && "rounded-card border border-border bg-card", f.href && "outline-none transition-colors hover:border-nq-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus");
</script>

<template>
  <section data-slot="feature-grid" :aria-labelledby="title || $slots.title ? headingId : undefined" :class="cn('@container flex min-w-0 flex-col gap-8', props.class)">
    <SectionIntro
      v-if="title || eyebrow || description || $slots.title || $slots.eyebrow || $slots.description"
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :heading-id="headingId"
      :as="titleAs"
      :align="align"
      :has-eyebrow="!!$slots.eyebrow"
      :has-title="!!$slots.title"
      :has-description="!!$slots.description"
    >
      <template v-if="$slots.eyebrow" #eyebrow><slot name="eyebrow" /></template>
      <template v-if="$slots.title" #title><slot name="title" /></template>
      <template v-if="$slots.description" #description><slot name="description" /></template>
    </SectionIntro>
    <ul :class="cn('grid grid-cols-1 gap-4', GRID_COLS[columns])">
      <li v-for="(f, i) in features" :key="i" :class="cn('min-w-0', f.wide && '@2xl:col-span-2')">
        <component :is="f.href ? 'a' : 'div'" :href="f.href" :class="tile(f)">
          <span v-if="f.icon || $slots.icon" class="grid size-9 shrink-0 place-items-center rounded-control bg-nq-selected text-nq-brand [&_svg]:size-5">
            <slot name="icon" :feature="f" :index="i"><component :is="f.icon" /></slot>
          </span>
          <span class="flex min-w-0 flex-col gap-1">
            <span class="flex items-center gap-1 font-semibold text-foreground text-label">
              {{ f.title }}
              <ArrowRight v-if="f.href" aria-hidden="true" :class="cn('size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5', ar && '-scale-x-100 group-hover:-translate-x-0.5')" />
            </span>
            <span v-if="f.description" class="text-body-sm text-nq-fg-body">{{ f.description }}</span>
          </span>
        </component>
      </li>
    </ul>
  </section>
</template>
