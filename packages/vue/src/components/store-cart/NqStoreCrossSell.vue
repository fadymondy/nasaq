<script setup lang="ts">
import { Eye, Plus, ShoppingBag } from "lucide-vue-next";
import { useId, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqCarousel, NqCarouselContent, NqCarouselItem, NqCarouselNext, NqCarouselPrevious } from "../carousel";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqProductCard } from "../product-card";
import { cartItemFromProduct } from "./cart-logic";
import { commercePriceRange, type CommerceProduct } from "./commerce";
import NqStoreCartMoney from "./NqStoreCartMoney.vue";
import NqStoreImage from "./NqStoreImage.vue";
import { useStoreCartStrings, type StoreCartLabels } from "./strings";

// "You might also like": a carousel of product cards with a quick Add. Each card has a context menu with the same actions.
// Add adds the product's first in-stock variant; sold-out products have no Add button. The `title` prop (or slot) replaces the heading.
interface Props {
  products: readonly CommerceProduct[];
  /** Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onAdd?: (product: CommerceProduct) => void;
  onOpenProduct?: (product: CommerceProduct) => void;
  title?: string;
  labels?: StoreCartLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, onAdd: undefined, onOpenProduct: undefined, title: undefined, labels: undefined });
const currency = useCurrency(() => props.currency);
const { t } = useStoreCartStrings(() => props.labels);
const titleId = useId();

const buyable = (product: CommerceProduct) => !!cartItemFromProduct(product);
function actionsFor(product: CommerceProduct): ContextMenuAction[] {
  const onAdd = props.onAdd;
  const onOpen = props.onOpenProduct;
  return [
    ...(onOpen ? [{ id: "view", label: t.value.viewProduct, icon: Eye, onSelect: () => onOpen(product) }] : []),
    ...(onAdd && buyable(product) ? [{ id: "add", label: t.value.addNamed(product.name), icon: ShoppingBag, onSelect: () => onAdd(product) }] : []),
  ];
}
</script>

<template>
  <section v-if="props.products.length" data-slot="store-cross-sell" :aria-labelledby="titleId" :class="cn('flex flex-col gap-3', props.class)">
    <h2 :id="titleId" class="text-h3 font-semibold text-foreground"><slot name="title">{{ props.title ?? t.crossSellTitle }}</slot></h2>
    <NqCarousel :label="props.title ?? t.crossSellTitle" class="px-0">
      <NqCarouselContent class="-ms-4">
        <NqCarouselItem v-for="product in props.products" :key="product.id" class="basis-3/4 ps-4 sm:basis-1/2 lg:basis-1/3">
          <NqContextMenuActions :actions="actionsFor(product)" class="@container">
            <NqProductCard layout="tile" :name="product.name" :category="product.category" class="w-full">
              <template #artwork>
                <NqStoreImage fluid :size="320" :src="product.images[0]?.src" :alt="product.images[0]?.alt ?? product.name" class="aspect-[4/3] rounded-card" />
              </template>
              <template #price>
                <NqStoreCartMoney :amount="commercePriceRange(product).min" :currency="currency" size="sm" />
              </template>
              <template v-if="props.onAdd && buyable(product)" #action>
                <NqButton variant="secondary" size="sm" :aria-label="t.addNamed(product.name)" @click="props.onAdd?.(product)">
                  <Plus aria-hidden="true" />
                  {{ t.add }}
                </NqButton>
              </template>
            </NqProductCard>
          </NqContextMenuActions>
        </NqCarouselItem>
      </NqCarouselContent>
      <NqCarouselPrevious :aria-label="t.crossSellPrev" />
      <NqCarouselNext :aria-label="t.crossSellNext" />
    </NqCarousel>
  </section>
</template>
