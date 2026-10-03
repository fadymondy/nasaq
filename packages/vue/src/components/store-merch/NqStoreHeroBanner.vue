<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { NqCarousel, NqCarouselContent, NqCarouselDots, NqCarouselItem, NqCarouselNext, NqCarouselPrevious } from "../carousel";
import NqMerchHeroSlide from "./NqMerchHeroSlide.vue";
import { useMerchStrings, type MerchLabels } from "./strings";
import type { StoreBanner } from "./types";

// The large banner at the top of the home page. Several banners turn it into a carousel.
interface Props {
  /** One banner shows as is; several rotate in a carousel with arrows and dots. */
  items: readonly StoreBanner[];
  /** Milliseconds between slides; `false` for none. Stops under reduced motion. Default 6000. */
  autoplay?: number | false;
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { autoplay: 6000, labels: undefined });
const emit = defineEmits<{ select: [banner: StoreBanner] }>();
const { t, locale } = useMerchStrings(() => props.labels);
</script>

<template>
  <section v-if="props.items.length === 1" data-slot="store-hero-banner" :aria-label="t.promotions" :class="props.class">
    <NqMerchHeroSlide :banner="props.items[0]!" eager :labels="props.labels" @select="emit('select', $event)" />
  </section>
  <section v-else-if="props.items.length > 1" data-slot="store-hero-banner" :aria-label="t.promotions" :class="props.class">
    <NqCarousel :label="t.promotions" :locale="locale" loop :autoplay="props.autoplay" class="group relative">
      <NqCarouselContent>
        <NqCarouselItem v-for="(b, i) in props.items" :key="b.id">
          <NqMerchHeroSlide :banner="b" :eager="i === 0" :labels="props.labels" @select="emit('select', $event)" />
        </NqCarouselItem>
      </NqCarouselContent>
      <NqCarouselPrevious class="start-3" />
      <NqCarouselNext class="end-3" />
      <NqCarouselDots />
    </NqCarousel>
  </section>
</template>
