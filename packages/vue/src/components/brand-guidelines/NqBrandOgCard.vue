<script setup lang="ts">
import { Download } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqButton } from "../button";
import { NqProductLogo } from "../product-mark";
import { NqUserText } from "../text-utilities";
import { fill, ogSizeLabel } from "./logic";
import type { BrandGuidelinesLabels } from "./strings";
import { useBrandStrings } from "./use-strings";

/** A social share card: the finished image when you have one, otherwise a live layout with the mark and the text. */
export interface BrandOgCard {
  id: string;
  title: string;
  description?: string;
  /** The finished image. Without it a live layout with the brand's mark and this text is drawn. */
  image?: string;
  imageAlt?: string;
  /** Default 1200 x 630. */
  size?: string | readonly [number, number];
  /** Download link for the finished image. */
  href?: string;
  filename?: string;
  /** Brand for the drawn layout. Default: the page's `brand`. */
  brand?: string;
}
interface Props {
  card: BrandOgCard;
  brand?: string;
  labels?: BrandGuidelinesLabels;
  class?: HTMLAttributes["class"];
}
const props = defineProps<Props>();
const t = useBrandStrings(() => props.labels);
const ratio = computed(() => {
  const size = props.card.size ?? [1200, 630];
  return Array.isArray(size) ? `${size[0]} / ${size[1]}` : "1200 / 630";
});
</script>

<template>
  <figure data-slot="brand-og-card" :class="cn('flex min-w-0 flex-col gap-2', props.class)">
    <div class="overflow-hidden rounded-card border border-border bg-card" :style="{ aspectRatio: ratio }">
      <img v-if="props.card.image" :src="props.card.image" :alt="props.card.imageAlt ?? props.card.title" class="size-full object-cover" />
      <div v-else class="flex size-full flex-col justify-between gap-2 p-[6%]">
        <NqProductLogo :brand="props.card.brand ?? props.brand" :size="28" />
        <div class="flex flex-col gap-1">
          <NqUserText block :lines="2" class="text-h2 text-foreground">{{ props.card.title }}</NqUserText>
          <NqUserText v-if="props.card.description" block :lines="2" class="text-body-sm text-muted-foreground">{{ props.card.description }}</NqUserText>
        </div>
      </div>
    </div>
    <figcaption class="flex items-center justify-between gap-3 text-caption text-muted-foreground">
      <span class="flex items-center gap-2">
        <NqUserText class="text-label text-foreground">{{ props.card.title }}</NqUserText>
        <bdi dir="ltr" class="tabular-nums">{{ ogSizeLabel(props.card.size) }}</bdi>
      </span>
      <NqButton v-if="props.card.href" variant="ghost" size="sm" as-child :aria-label="fill(t.downloadFor, { name: props.card.title })">
        <a :href="props.card.href" :download="props.card.filename">
          <Download aria-hidden="true" />
          {{ t.download }}
        </a>
      </NqButton>
    </figcaption>
  </figure>
</template>
