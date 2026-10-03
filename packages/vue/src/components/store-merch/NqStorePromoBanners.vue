<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import type { HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqIcon } from "../icon";
import { NqStoreProductImage } from "../store-listing";
import { useMerchStrings, type MerchLabels } from "./strings";
import { MERCH_TONES, type StoreBanner } from "./types";

// Two or three side-by-side promo tiles: image behind, text over a token panel.
interface Props {
  items: readonly StoreBanner[];
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { labels: undefined });
const emit = defineEmits<{ select: [banner: StoreBanner] }>();
const { t } = useMerchStrings(() => props.labels);
</script>

<template>
  <section v-if="props.items.length" data-slot="store-promo-banners" :aria-label="t.promotions" :class="props.class">
    <ul :class="cn('m-0 grid list-none gap-4 p-0', props.items.length >= 3 ? 'md:grid-cols-3' : props.items.length === 2 ? 'md:grid-cols-2' : '')">
      <li v-for="b in props.items" :key="b.id">
        <a
          :href="b.href ?? '#'"
          :class="cn('group relative flex min-h-44 overflow-hidden rounded-card no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', MERCH_TONES[b.tone ?? 'soft'])"
          @click="emit('select', b)"
        >
          <span class="z-10 flex w-3/5 flex-col items-start justify-center gap-1 p-5">
            <span v-if="b.eyebrow" class="text-caption opacity-80">{{ b.eyebrow }}</span>
            <span class="text-h3 text-balance">{{ b.title }}</span>
            <span v-if="b.description" class="text-body-sm opacity-90">{{ b.description }}</span>
            <span class="mt-2 inline-flex items-center gap-1 text-label underline underline-offset-4">
              {{ b.cta ?? t.shopNow }}
              <NqIcon :icon="ArrowRight" directional />
            </span>
          </span>
          <span class="absolute inset-y-0 end-0 w-2/5">
            <NqStoreProductImage :src="b.image" :alt="b.imageAlt ?? ''" class="transition-transform duration-300 ease-nq group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100" />
          </span>
        </a>
      </li>
    </ul>
  </section>
</template>
