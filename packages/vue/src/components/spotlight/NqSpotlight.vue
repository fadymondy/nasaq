<script setup lang="ts">
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import NqProductArtwork from "../product-artwork/NqProductArtwork.vue";
import NqProductMark from "../product-mark/NqProductMark.vue";

// A featured product banner: the product's artwork field with its mark, name, pitch and call to action.
// The whole banner sits in the product's own brand scope, so a Mahaam spotlight shows Mahaam's colour even
// inside the CircleXO store. Slots: eyebrow, mark, title, description, actions, meta, media.
interface Props {
  /** The featured product. Its manifest tints the banner and its primary button. */
  brand: string;
  /** "lg": the page hero, with room for `media`. "md": a compact tile beside or under it. */
  size?: "lg" | "md";
  /** The product name, rendered as the section's heading. Or use the `title` slot. */
  title?: string;
  /** Heading element for the title. Default "h2". */
  titleAs?: "h1" | "h2" | "h3";
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { size: "lg", title: undefined, titleAs: "h2" });
const id = useId();
</script>

<template>
  <section data-slot="spotlight" :data-size="size" :aria-labelledby="id" :class="cn('flex', props.class)">
    <NqProductArtwork :brand="brand" :class="cn('@container w-full items-stretch justify-stretch', size === 'lg' && 'min-h-[22rem]')">
      <div v-if="size === 'lg'" class="grid w-full gap-8 p-6 @md:p-8 @3xl:grid-cols-[minmax(0,1fr)_auto]">
        <div class="flex max-w-md flex-col items-start justify-center gap-4">
          <slot name="eyebrow" />
          <div class="flex items-center gap-3">
            <slot name="mark"><NqProductMark :brand="brand" :size="44" title="" /></slot>
            <component :is="titleAs" :id="id" class="text-display leading-none text-foreground"><slot name="title">{{ title }}</slot></component>
          </div>
          <div v-if="$slots.description" class="text-pretty text-body text-foreground/90"><slot name="description" /></div>
          <div v-if="$slots.actions" class="flex flex-wrap items-center gap-3 pt-1"><slot name="actions" /></div>
          <div v-if="$slots.meta" class="flex flex-wrap items-center gap-x-3 gap-y-1 text-caption text-muted-foreground"><slot name="meta" /></div>
        </div>
        <div v-if="$slots.media" class="hidden items-center justify-center @md:flex"><slot name="media" /></div>
      </div>
      <div v-else class="flex w-full flex-col justify-between gap-6 p-5">
        <div class="flex items-start justify-between gap-3">
          <slot name="mark"><NqProductMark :brand="brand" :size="40" title="" /></slot>
          <slot name="eyebrow" />
        </div>
        <div class="flex flex-col gap-1">
          <component :is="titleAs" :id="id" class="text-h3 text-foreground"><slot name="title">{{ title }}</slot></component>
          <div v-if="$slots.description" class="line-clamp-2 text-body-sm text-muted-foreground"><slot name="description" /></div>
        </div>
        <div v-if="$slots.meta || $slots.actions" class="flex items-center justify-between gap-3">
          <div class="min-w-0"><slot name="meta" /></div>
          <slot name="actions" />
        </div>
      </div>
    </NqProductArtwork>
  </section>
</template>
