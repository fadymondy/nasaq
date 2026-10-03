<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** Short label above the title ("Feedback SDK"). */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Two to four concrete proof points, each one line. */
  points?: string[];
  /** Put the media at the inline start instead of the end. Alternate it down a page. */
  reverse?: boolean;
  /** Heading element for the title. Default "h2". */
  titleAs?: "h2" | "h3";
  class?: HTMLAttributes["class"];
}

// Slots: `icon` (shown on a brand tint beside the eyebrow), `eyebrow`, `title`, `description`, `points`
// (replaces the list), `action` (a link or secondary button under the points) and `media`
// (a NqScreenshotFrame, a code sample, a transcript).
const props = withDefaults(defineProps<Props>(), { titleAs: "h2" });
const id = useId();
</script>

<template>
  <div data-slot="feature-story" class="@container">
    <section :aria-labelledby="id" :class="cn('grid grid-cols-1 items-center gap-8 @3xl:grid-cols-2 @3xl:gap-12', props.class)">
      <div :class="cn('flex min-w-0 flex-col items-start gap-4', reverse && '@3xl:order-2')">
        <div v-if="eyebrow || $slots.eyebrow || $slots.icon" class="flex items-center gap-2 text-label text-muted-foreground">
          <span v-if="$slots.icon" aria-hidden="true" class="grid size-7 place-items-center rounded-control bg-[color-mix(in_oklab,var(--nq-brand)_14%,transparent)] text-nq-brand [&_svg]:size-4"><slot name="icon" /></span>
          <slot name="eyebrow">{{ eyebrow }}</slot>
        </div>
        <component :is="titleAs" :id="id" class="text-balance text-h1 text-foreground"><slot name="title">{{ title }}</slot></component>
        <p v-if="description || $slots.description" class="text-pretty text-body text-muted-foreground"><slot name="description">{{ description }}</slot></p>
        <slot name="points">
          <ul v-if="points && points.length > 0" class="flex flex-col gap-2">
            <li v-for="(point, i) in points" :key="i" class="flex items-start gap-2 text-body-sm text-foreground">
              <Check aria-hidden="true" class="mt-0.5 size-4 shrink-0 text-nq-brand" />
              <span>{{ point }}</span>
            </li>
          </ul>
        </slot>
        <div v-if="$slots.action" class="pt-1"><slot name="action" /></div>
      </div>
      <div v-if="$slots.media" class="min-w-0"><slot name="media" /></div>
    </section>
  </div>
</template>
