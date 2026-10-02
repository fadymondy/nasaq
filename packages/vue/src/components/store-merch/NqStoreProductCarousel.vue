<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqCarousel, NqCarouselContent, NqCarouselItem, NqCarouselNext, NqCarouselPrevious } from "../carousel";
import { NqIcon } from "../icon";
import { NqStoreProductCard } from "../store-listing";
import type { CommerceProduct, CommerceVariant } from "../store-listing/commerce";
import { useCardListeners } from "./card-listeners";
import NqMerchHeading from "./NqMerchHeading.vue";
import { merchFill, useMerchStrings, type MerchLabels } from "./strings";

// A scroll-snapping row of storefront product cards: related products, recently viewed, new arrivals. It takes plain
// CommerceProduct objects and reports through events, so any page can drop it in. Swipes and arrow keys mirror in RTL.
interface Props {
  products: readonly CommerceProduct[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Heading, e.g. "You may also like" or "Recently viewed". Default "You may also like". */
  title?: string;
  /** Plain-text name for the carousel region when the heading comes from the slot. */
  label?: string;
  /** Link beside the heading. */
  viewAllHref?: string;
  /** Slides visible at large widths (2 to 6). Default 4. */
  perView?: 2 | 3 | 4 | 5 | 6;
  getHref?: (product: CommerceProduct) => string;
  wishlistIds?: readonly string[];
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, title: undefined, label: undefined, viewAllHref: undefined, perView: 4, getHref: undefined, wishlistIds: undefined, labels: undefined });
defineEmits<{
  /** A handler may return a promise; the card button shows progress until it settles. */
  addToCart: [product: CommerceProduct, variant: CommerceVariant, quantity: number];
  quickView: [product: CommerceProduct];
  navigate: [product: CommerceProduct];
  toggleWishlist: [product: CommerceProduct, next: boolean];
}>();
const cardListeners = useCardListeners();
const currency = useCurrency(() => props.currency);
const { t, locale } = useMerchStrings(() => props.labels);

const basis = {
  2: "lg:basis-1/2",
  3: "lg:basis-1/3",
  4: "lg:basis-1/4",
  5: "lg:basis-1/5",
  6: "lg:basis-1/6",
} as const;

const heading = computed(() => props.title ?? t.value.relatedProducts);
const name = computed(() => props.label ?? heading.value);
const hid = computed(() => `store-car-${name.value.replace(/\W+/g, "-")}`);
</script>

<template>
  <section v-if="props.products.length" data-slot="store-product-carousel" :aria-labelledby="hid" :class="props.class">
    <NqMerchHeading :id="hid">
      <slot name="title">{{ heading }}</slot>
      <template v-if="props.viewAllHref" #action>
        <NqButton variant="link" as="a" :href="props.viewAllHref">
          {{ t.viewAll }}
          <NqIcon :icon="ArrowRight" directional />
        </NqButton>
      </template>
    </NqMerchHeading>
    <NqCarousel :label="merchFill(t.carouselOf, { title: name })" :locale="locale" class="relative">
      <NqCarouselContent>
        <NqCarouselItem v-for="(p, i) in props.products" :key="p.id" :class="cn('basis-[70%] snap-start sm:basis-1/3', basis[props.perView])">
          <NqStoreProductCard
            :product="p"
            :currency="currency"
            :priority="i < props.perView"
            :href="props.getHref ? props.getHref(p) : undefined"
            :wishlisted="props.wishlistIds ? props.wishlistIds.includes(p.id) : undefined"
            v-bind="cardListeners"
          />
        </NqCarouselItem>
      </NqCarouselContent>
      <NqCarouselPrevious />
      <NqCarouselNext />
    </NqCarousel>
  </section>
</template>
