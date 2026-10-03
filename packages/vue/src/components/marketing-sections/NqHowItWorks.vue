<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import SectionIntro from "./SectionIntro.vue";
import type { HowItWorksStep } from "./types";

// Three or four numbered steps that explain how to get started. Numbers are Latin digits in both languages; the joining
// line follows the reading direction. Slots: `eyebrow`, `title`, `description`, `icon` and `media` (both receive `{ step, index }`).
const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    title?: string;
    description?: string;
    steps: readonly HowItWorksStep[];
    /** "row": steps side by side from 48rem, joined by a line. "column": always a vertical timeline. Default "row". */
    layout?: "row" | "column";
    titleAs?: "h2" | "h3";
    class?: HTMLAttributes["class"];
  }>(),
  { layout: "row", titleAs: "h2", eyebrow: undefined, title: undefined, description: undefined },
);
const headingId = useId();
</script>

<template>
  <section data-slot="how-it-works" :aria-labelledby="title || $slots.title ? headingId : undefined" :class="cn('@container flex min-w-0 flex-col gap-8', props.class)">
    <SectionIntro
      v-if="title || eyebrow || description || $slots.title || $slots.eyebrow || $slots.description"
      :eyebrow="eyebrow"
      :title="title"
      :description="description"
      :heading-id="headingId"
      :as="titleAs"
      :has-eyebrow="!!$slots.eyebrow"
      :has-title="!!$slots.title"
      :has-description="!!$slots.description"
    >
      <template v-if="$slots.eyebrow" #eyebrow><slot name="eyebrow" /></template>
      <template v-if="$slots.title" #title><slot name="title" /></template>
      <template v-if="$slots.description" #description><slot name="description" /></template>
    </SectionIntro>
    <ol :class="cn('grid gap-6', layout === 'row' ? '@3xl:grid-cols-[repeat(var(--steps),minmax(0,1fr))] @3xl:gap-8' : 'max-w-2xl')" :style="{ '--steps': steps.length }">
      <li v-for="(step, i) in steps" :key="i" :class="cn('relative flex min-w-0 gap-4', layout === 'row' ? '@3xl:flex-col' : '')">
        <span
          v-if="i < steps.length - 1"
          aria-hidden="true"
          :class="cn('absolute bg-border', layout === 'row' ? 'start-5 top-11 bottom-[-1.5rem] w-px @3xl:start-12 @3xl:top-5 @3xl:bottom-auto @3xl:h-px @3xl:w-[calc(100%-2rem)]' : 'start-5 top-11 bottom-[-1.5rem] w-px')"
        />
        <span dir="ltr" class="relative z-1 grid size-10 shrink-0 place-items-center rounded-full border border-border bg-nq-surface font-semibold text-body-sm text-nq-brand tabular-nums [&_svg]:size-4">
          <slot name="icon" :step="step" :index="i"><component :is="step.icon" v-if="step.icon" aria-hidden="true" /><template v-else>{{ i + 1 }}</template></slot>
        </span>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5 pb-2">
          <h3 class="font-semibold text-foreground text-h3">{{ step.title }}</h3>
          <p v-if="step.description" class="text-body-sm text-nq-fg-body">{{ step.description }}</p>
          <div v-if="step.media || $slots.media" class="mt-2"><slot name="media" :step="step" :index="i"><component :is="step.media" /></slot></div>
        </div>
      </li>
    </ol>
  </section>
</template>
