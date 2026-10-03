<script setup lang="ts">
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** "window": a desktop app. "browser": a web page, with an address bar. "phone": a mobile screen. */
  variant?: "window" | "browser" | "phone";
  /** Window title ("window") or address ("browser"). Always shown left-to-right. */
  title?: string;
  /**
   * What the screenshot shows, for screen readers: "Mahaam board with three columns". When set, the frame is
   * announced as one image and its content is hidden from assistive tech and made inert.
   */
  label?: string;
  /** Visible caption under the frame. */
  caption?: string;
  class?: HTMLAttributes["class"];
}

const props = withDefaults(defineProps<Props>(), { variant: "window" });
const phone = computed(() => props.variant === "phone");
const screenClass = computed(() => cn("relative overflow-hidden bg-background", phone.value ? "aspect-[9/19] rounded-[1.75rem]" : "rounded-b-[calc(var(--radius-card)-1px)]"));
</script>

<template>
  <figure data-slot="screenshot-frame" :data-variant="variant" :class="cn('flex min-w-0 flex-col gap-3', phone && 'items-center', props.class)">
    <div v-if="phone" class="w-full max-w-[18rem] rounded-[2.25rem] bg-nq-surface-raised p-2 shadow-lg ring-1 ring-border">
      <div data-slot="screenshot-frame-screen" :role="label ? 'img' : undefined" :aria-label="label" :class="screenClass">
        <div :aria-hidden="label ? true : undefined" :inert="label ? true : undefined" class="size-full"><slot /></div>
      </div>
    </div>
    <div v-else class="w-full overflow-hidden rounded-card bg-nq-surface-raised shadow-lg ring-1 ring-border">
      <div data-slot="screenshot-frame-bar" class="flex h-9 items-center gap-3 px-3">
        <span aria-hidden="true" class="flex gap-1.5">
          <span class="size-2.5 rounded-full bg-nq-line-strong" />
          <span class="size-2.5 rounded-full bg-nq-line-strong" />
          <span class="size-2.5 rounded-full bg-nq-line-strong" />
        </span>
        <template v-if="title || $slots.title">
          <span v-if="variant === 'browser'" dir="ltr" class="mx-auto flex h-6 w-full max-w-xs items-center justify-center truncate rounded-control bg-secondary px-3 text-caption text-muted-foreground"><slot name="title">{{ title }}</slot></span>
          <span v-else dir="ltr" class="mx-auto truncate text-caption text-muted-foreground"><slot name="title">{{ title }}</slot></span>
        </template>
        <span aria-hidden="true" class="w-[42px]" />
      </div>
      <div data-slot="screenshot-frame-screen" :role="label ? 'img' : undefined" :aria-label="label" :class="screenClass">
        <div :aria-hidden="label ? true : undefined" :inert="label ? true : undefined" class="size-full"><slot /></div>
      </div>
    </div>
    <figcaption v-if="caption || $slots.caption" class="text-center text-caption text-muted-foreground"><slot name="caption">{{ caption }}</slot></figcaption>
  </figure>
</template>
