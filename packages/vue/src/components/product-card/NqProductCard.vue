<script setup lang="ts">
import { computed, useSlots, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";

interface Props {
  /** Usually `<NqProductArtwork brand="…" />` (slot `artwork`). It is sized by the card. */
  artwork?: string;
  name?: string;
  /** Category or publisher line under the name. */
  category?: string;
  /** "New", "Free"… Shown on the artwork in the tile layout, beside the name in the row layout. */
  badge?: string;
  description?: string;
  /**
   * "tile": artwork on top. "row": small square artwork beside the details, for phones and dense lists.
   * "auto" (default): row in a narrow container, tile from 36rem up. Needs an `@container` ancestor;
   * `NqProductGrid` is one.
   */
  layout?: "auto" | "tile" | "row";
  /** Heading element for the name. Default "h3". */
  nameAs?: "h2" | "h3" | "h4";
  class?: HTMLAttributes["class"];
}

// Every text prop can also be given as a slot of the same name; `meta` (bottom-start, usually a rating),
// `price` (bottom-end) and `action` (top-end, usually an install button) are slots only.
const props = withDefaults(defineProps<Props>(), { layout: "auto", nameAs: "h3" });
const slots = useSlots();
const has = (slot: string, value?: string) => Boolean(slots[slot] || value);

const TILE = { root: "flex-col gap-3", art: "aspect-[16/10] w-full", artBadge: "inline-flex", nameBadge: "hidden" };
const ROW = { root: "flex-row gap-4", art: "aspect-square w-20", artBadge: "hidden", nameBadge: "inline-flex" };
const AUTO = {
  root: "flex-row gap-4 @xl:flex-col @xl:gap-3",
  art: "aspect-square w-20 @xl:aspect-[16/10] @xl:w-full",
  artBadge: "hidden @xl:inline-flex",
  nameBadge: "inline-flex @xl:hidden",
};
const l = computed(() => (props.layout === "tile" ? TILE : props.layout === "row" ? ROW : AUTO));
</script>

<template>
  <article data-slot="product-card" :data-layout="layout" :class="cn('group/product flex min-w-0', l.root, props.class)">
    <div data-slot="product-card-artwork" :class="cn('relative shrink-0 [&>*]:size-full', l.art)">
      <slot name="artwork">{{ artwork }}</slot>
      <span v-if="has('badge', badge)" :class="cn('absolute start-3 top-3 z-10', l.artBadge)"><slot name="badge">{{ badge }}</slot></span>
    </div>
    <div class="flex min-w-0 flex-1 flex-col gap-3">
      <div class="flex items-start gap-3">
        <div class="flex min-w-0 flex-1 flex-col gap-0.5">
          <div class="flex min-w-0 items-center gap-2">
            <component :is="nameAs" class="truncate text-body font-medium text-foreground"><slot name="name">{{ name }}</slot></component>
            <span v-if="has('badge', badge)" :class="cn('shrink-0', l.nameBadge)"><slot name="badge">{{ badge }}</slot></span>
          </div>
          <p v-if="has('category', category)" class="truncate text-caption text-muted-foreground"><slot name="category">{{ category }}</slot></p>
        </div>
        <div v-if="$slots.action" class="shrink-0"><slot name="action" /></div>
      </div>
      <p v-if="has('description', description)" class="line-clamp-2 text-pretty text-body-sm text-muted-foreground"><slot name="description">{{ description }}</slot></p>
      <div v-if="$slots.meta || $slots.price" class="mt-auto flex min-w-0 items-center justify-between gap-2">
        <div class="min-w-0"><slot name="meta" /></div>
        <slot name="price" />
      </div>
    </div>
  </article>
</template>
