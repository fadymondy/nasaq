<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqScreenshotFrame } from "../screenshot-frame";
import NqAuroraBackground from "./NqAuroraBackground.vue";
import NqGridBackground from "./NqGridBackground.vue";

// A page opener: headline, buttons and a framed picture of the app, over a soft backdrop. The mockup sits below the text and
// fades into the page. Slots: `eyebrow`, `title`, `description`, `actions`, `proof`, `mockup` (the picture, inside a NqScreenshotFrame) and `frame-title`.
const props = withDefaults(
  defineProps<{
    eyebrow?: string;
    /** The headline. One per page: it renders an h1. */
    title?: string;
    description?: string;
    /** Frame style. Default "browser". */
    frame?: "window" | "browser" | "phone";
    /** Address or window title in the frame. */
    frameTitle?: string;
    /** Accessible description of the mockup. */
    mockupLabel?: string;
    /** Backdrop. Default "aurora". */
    background?: "aurora" | "grid" | "none";
    class?: HTMLAttributes["class"];
  }>(),
  { frame: "browser", background: "aurora", eyebrow: undefined, title: undefined, description: undefined, frameTitle: undefined, mockupLabel: undefined },
);
const mask = "linear-gradient(to bottom, black 70%, transparent)";
</script>

<template>
  <section data-slot="app-mockup-hero" :class="cn('w-full min-w-0', props.class)">
    <component :is="background === 'aurora' ? NqAuroraBackground : background === 'grid' ? NqGridBackground : 'div'">
      <div class="@container mx-auto flex w-full max-w-5xl min-w-0 flex-col items-center gap-10 px-4 pt-14 pb-0 text-center @2xl:pt-20">
        <div class="flex min-w-0 max-w-2xl flex-col items-center gap-4">
          <div v-if="eyebrow || $slots.eyebrow" class="eyebrow text-nq-brand"><slot name="eyebrow">{{ eyebrow }}</slot></div>
          <h1 class="font-semibold text-display text-foreground text-balance"><slot name="title">{{ title }}</slot></h1>
          <p v-if="description || $slots.description" class="text-body text-nq-fg-body text-pretty"><slot name="description">{{ description }}</slot></p>
          <div v-if="$slots.actions" class="flex flex-wrap justify-center gap-2 pt-2"><slot name="actions" /></div>
          <div v-if="$slots.proof" class="text-caption text-muted-foreground"><slot name="proof" /></div>
        </div>
        <div class="w-full min-w-0 max-w-4xl" :style="{ maskImage: mask, WebkitMaskImage: mask }">
          <NqScreenshotFrame :variant="frame" :title="frameTitle" :label="mockupLabel" class="shadow-floating">
            <template v-if="$slots['frame-title']" #title><slot name="frame-title" /></template>
            <slot name="mockup" />
          </NqScreenshotFrame>
        </div>
      </div>
    </component>
  </section>
</template>
