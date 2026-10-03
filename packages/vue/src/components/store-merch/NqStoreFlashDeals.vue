<script setup lang="ts">
import { ArrowRight } from "lucide-vue-next";
import { computed, onBeforeUnmount, ref, watch, watchEffect, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqCarousel, NqCarouselContent, NqCarouselItem, NqCarouselNext, NqCarouselPrevious } from "../carousel";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { NqStoreProductCard } from "../store-listing";
import type { CommerceProduct, CommerceVariant } from "../store-listing/commerce";
import { useCardListeners } from "./card-listeners";
import NqStoreCountdown from "./NqStoreCountdown.vue";
import { merchActiveDeals, merchDealProgress } from "./store-merch-model";
import { merchFill, useMerchStrings, type MerchLabels } from "./strings";
import type { StoreFlashDeal } from "./types";

// A strip of time-limited offers. The soonest-ending live deal sets the countdown; each deal shows the shared product
// card and how much of its stock is claimed. Ended and not-yet-started deals are not shown.
interface Props {
  deals: readonly StoreFlashDeal[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  /** Clock override for stories and tests. */
  now?: number;
  /** Section heading. Default "Flash deals". */
  title?: string;
  /** Link to a page of all deals. */
  viewAllHref?: string;
  getHref?: (product: CommerceProduct) => string;
  wishlistIds?: readonly string[];
  labels?: MerchLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, now: undefined, title: undefined, viewAllHref: undefined, getHref: undefined, wishlistIds: undefined, labels: undefined });
const emit = defineEmits<{
  /** A handler may return a promise; the card button shows progress until it settles. */
  addToCart: [product: CommerceProduct, variant: CommerceVariant, quantity: number];
  quickView: [product: CommerceProduct];
  navigate: [product: CommerceProduct];
  toggleWishlist: [product: CommerceProduct, next: boolean];
  /** Fires once when every deal has ended. */
  expire: [];
}>();
const cardListeners = useCardListeners();
const currency = useCurrency(() => props.currency);
const { t, locale } = useMerchStrings(() => props.labels);
const fmt = useFormatNumber();

const clock = ref(props.now ?? Date.now());
let timer: ReturnType<typeof setInterval> | undefined;
watchEffect(() => {
  clearInterval(timer);
  timer = undefined;
  if (props.now !== undefined) {
    clock.value = props.now;
    return;
  }
  clock.value = Date.now();
  timer = setInterval(() => (clock.value = Date.now()), 1000);
});
onBeforeUnmount(() => clearInterval(timer));

const live = computed(() => merchActiveDeals(props.deals, clock.value));
watch(
  () => live.value.length,
  () => {
    if (props.deals.length && !live.value.length) emit("expire");
  },
  { immediate: true },
);
const soonest = computed(() => live.value[0]);
</script>

<template>
  <section v-if="soonest" data-slot="store-flash-deals" aria-labelledby="store-deals-h" :class="cn('rounded-card border border-border bg-nq-surface-soft p-4 sm:p-6', props.class)">
    <div class="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
      <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 id="store-deals-h" class="text-h2 text-foreground"><slot name="title">{{ props.title ?? t.flashDeals }}</slot></h2>
        <span class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
          {{ t.endsIn }}
          <NqStoreCountdown :ends-at="soonest.endsAt" :now="clock" :labels="props.labels" />
        </span>
      </div>
      <NqButton v-if="props.viewAllHref" variant="link" as="a" :href="props.viewAllHref">
        {{ t.viewAllDeals }}
        <NqIcon :icon="ArrowRight" directional />
      </NqButton>
    </div>
    <NqCarousel :label="props.title ?? t.flashDeals" :locale="locale" class="relative">
      <NqCarouselContent>
        <NqCarouselItem v-for="d in live" :key="d.id" class="basis-3/4 sm:basis-1/2 lg:basis-1/4">
          <div class="flex h-full flex-col gap-2">
            <NqStoreProductCard
              :product="d.product"
              :currency="currency"
              :href="props.getHref ? props.getHref(d.product) : undefined"
              :wishlisted="props.wishlistIds ? props.wishlistIds.includes(d.product.id) : undefined"
              :labels="{}"
              v-bind="cardListeners"
            />
            <div v-if="d.total" class="flex flex-col gap-1">
              <div
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="merchDealProgress(d.sold, d.total)"
                :aria-label="merchFill(t.claimed, { percent: fmt(merchDealProgress(d.sold, d.total)) })"
                class="h-1.5 overflow-hidden rounded-full bg-secondary"
              >
                <div class="h-full rounded-full bg-nq-danger-solid" :style="{ width: `${merchDealProgress(d.sold, d.total)}%` }" />
              </div>
              <span class="text-caption text-muted-foreground">{{ merchDealProgress(d.sold, d.total) >= 80 ? t.almostGone : merchFill(t.claimed, { percent: fmt(merchDealProgress(d.sold, d.total)) }) }}</span>
            </div>
          </div>
        </NqCarouselItem>
      </NqCarouselContent>
      <NqCarouselPrevious />
      <NqCarouselNext />
    </NqCarousel>
  </section>
</template>
