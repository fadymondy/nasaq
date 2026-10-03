<script setup lang="ts">
import { computed, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqCard } from "../card";
import { NqProductLogo } from "../product-mark";
import NqAuthBackdrop from "./NqAuthBackdrop.vue";
import NqAuthEmblem from "./NqAuthEmblem.vue";
import NqAuthOrigin from "./NqAuthOrigin.vue";

// The page frame for sign-in, sign-up and recovery screens. It owns the page structure (<main>, the h1, the footer) and
// leaves the form itself to the default slot, so every auth form drops into either variant.
// Slots: default (the form), mark, title, description, panel, logo, prompt, footer, origin.
interface Props {
  /** `card`: one centred card on the page. `split`: a brand panel on the inline start, the form on the other side. */
  variant?: "card" | "split";
  /** The page heading (an h1). Or use the `title` slot. */
  title?: string;
  /** One line under the heading. Or use the `description` slot. */
  description?: string;
  /** `false` hides the mark above the heading. Default: an `NqAuthEmblem`, or your `mark` slot. */
  mark?: boolean;
  /** The quiet scene behind the page. Default true. */
  backdrop?: boolean;
  /** `false` hides the secure-connection line under the card (card variant only). Or fill the `origin` slot. */
  origin?: boolean;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { variant: "card", title: undefined, description: undefined, mark: true, backdrop: true, origin: true });
const slots = useSlots();
const hasHeading = computed(() => Boolean(props.title || props.description || slots.title || slots.description));
const promptClasses = "text-center text-body-sm text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline";
</script>

<template>
  <div
    v-if="props.variant === 'split'"
    data-slot="auth-layout"
    data-variant="split"
    :class="cn('grid min-h-dvh bg-background text-foreground lg:grid-cols-2', props.class)"
  >
    <aside data-slot="auth-layout-panel" class="relative isolate hidden flex-col justify-between gap-8 overflow-hidden border-e border-border bg-muted p-10 text-foreground lg:flex">
      <NqAuthBackdrop v-if="props.backdrop" />
      <slot name="panel">
        <div class="flex flex-1 items-center justify-center">
          <slot v-if="props.mark" name="logo"><NqProductLogo :size="56" /></slot>
        </div>
      </slot>
    </aside>
    <div class="flex min-w-0 flex-col p-6 sm:p-10">
      <main data-slot="auth-layout-main" data-auth-stagger="" class="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 py-8">
        <div v-if="props.mark" data-slot="auth-layout-mark" class="flex justify-center">
          <slot name="mark"><NqAuthEmblem :size="104" /></slot>
        </div>
        <header v-if="hasHeading" data-slot="auth-layout-header" class="flex flex-col items-center gap-1.5 text-center">
          <h1 v-if="props.title || $slots.title" data-slot="auth-layout-title" class="text-h1 text-foreground"><slot name="title">{{ props.title }}</slot></h1>
          <p v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
        </header>
        <slot />
        <p v-if="$slots.prompt" data-slot="auth-layout-prompt" :class="promptClasses"><slot name="prompt" /></p>
      </main>
      <div v-if="$slots.footer" class="mx-auto w-full max-w-sm">
        <footer data-slot="auth-layout-footer" class="text-caption text-muted-foreground"><slot name="footer" /></footer>
      </div>
    </div>
  </div>
  <div
    v-else
    data-slot="auth-layout"
    data-variant="card"
    :class="cn('relative isolate flex min-h-dvh flex-col items-center overflow-hidden bg-background p-4 text-foreground sm:p-6', props.class)"
  >
    <NqAuthBackdrop v-if="props.backdrop" />
    <main data-slot="auth-layout-main" class="flex w-full max-w-[26rem] flex-1 flex-col justify-center gap-4 py-8">
      <NqCard data-auth-card="" data-auth-stagger="" class="gap-6 px-6 py-8 sm:px-10 sm:py-10">
        <div v-if="props.mark" data-slot="auth-layout-mark" class="flex justify-center">
          <slot name="mark"><NqAuthEmblem :size="112" /></slot>
        </div>
        <header v-if="hasHeading" data-slot="auth-layout-header" class="flex flex-col items-center gap-1.5 text-center">
          <h1 v-if="props.title || $slots.title" data-slot="auth-layout-title" class="text-h1 text-foreground"><slot name="title">{{ props.title }}</slot></h1>
          <p v-if="props.description || $slots.description" class="text-body-sm text-muted-foreground"><slot name="description">{{ props.description }}</slot></p>
        </header>
        <slot />
        <p v-if="$slots.prompt" data-slot="auth-layout-prompt" :class="promptClasses"><slot name="prompt" /></p>
      </NqCard>
      <slot v-if="props.origin" name="origin"><NqAuthOrigin /></slot>
    </main>
    <div v-if="$slots.footer" class="w-full max-w-[26rem]">
      <footer data-slot="auth-layout-footer" class="text-caption text-muted-foreground"><slot name="footer" /></footer>
    </div>
  </div>
</template>
