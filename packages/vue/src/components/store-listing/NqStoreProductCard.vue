<script setup lang="ts">
import { Check, Eye, GitCompareArrows, Heart, ShoppingBag } from "lucide-vue-next";
import { computed, getCurrentInstance, onBeforeUnmount, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqCheckbox } from "../checkbox";
import { NqContextMenuActions, type ContextMenuAction } from "../context-menu";
import { NqIcon } from "../icon";
import { NqRating } from "../rating";
import { commerceFindVariant, commerceInStock, type CommerceProduct, type CommerceSelection, type CommerceVariant } from "./commerce";
import { listingBestDiscount, listingCheapestVariant, listingHasPriceRange, listingProductInStock } from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreOptionPicker from "./NqStoreOptionPicker.vue";
import NqStorePrice from "./NqStorePrice.vue";
import NqStoreProductImage from "./NqStoreProductImage.vue";

// The storefront product card: image with a second image on hover, badges, wishlist heart, colour swatches that
// preview the variant image, a from-price, quick view and quick add (asks for any option still unchosen). It takes a
// CommerceProduct and reports everything through events, so listings, carousels and search reuse it as is.
// The quick-view button, the compare box and the add button only show when the matching listener is bound.
defineOptions({ inheritAttrs: false });
interface Props {
  product: CommerceProduct;
  /** ISO 4217 code; prices are integer minor units. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Product page URL (image and name link to it). */
  href?: string;
  /** "grid" stacks image over details; "list" puts the image beside them and shows the description. Default "grid". */
  layout?: "grid" | "list";
  /** Image ratio in the grid layout. Default "portrait" (4:5). */
  ratio?: "square" | "portrait";
  /** Controlled wishlist state. Without it the heart keeps its own state. */
  wishlisted?: boolean;
  /** Checked state of the compare box. */
  compared?: boolean;
  /** Swatches shown before "+n". Default 5. */
  maxSwatches?: number;
  /** Context-click, Shift+F10 or the Menu key open the card's actions. Default true. */
  menu?: boolean;
  /** Load the image eagerly (first row of results). */
  priority?: boolean;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  href: undefined,
  layout: "grid",
  ratio: "portrait",
  wishlisted: undefined,
  compared: false,
  maxSwatches: 5,
  menu: true,
  priority: false,
  labels: undefined,
});
const emit = defineEmits<{
  toggleWishlist: [product: CommerceProduct, next: boolean];
  toggleCompare: [product: CommerceProduct, next: boolean];
  quickView: [product: CommerceProduct];
  /** A handler may return a promise; the button shows progress until it settles. */
  addToCart: [product: CommerceProduct, variant: CommerceVariant, quantity: number];
  navigate: [product: CommerceProduct];
}>();

// Listeners are read from the vnode so a bound handler turns its control on and a returned promise can be awaited.
const instance = getCurrentInstance();
const listener = (name: string) => (instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name] as ((...args: unknown[]) => unknown) | undefined;
const hasQuickView = computed(() => Boolean(listener("onQuickView")));
const hasCompare = computed(() => Boolean(listener("onToggleCompare")));
const hasAdd = computed(() => Boolean(listener("onAddToCart")));

const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const list = computed(() => props.layout === "list");

/** Options whose first value is the only value are chosen for the shopper. */
function initialSelection(product: CommerceProduct): CommerceSelection {
  const out: CommerceSelection = {};
  for (const o of product.options) if (o.values.length === 1) out[o.id] = o.values[0]!.id;
  return out;
}
const selection = ref<CommerceSelection>(initialSelection(props.product));
const preview = ref<string | null>(null);
const picking = ref(false);
const status = ref<"idle" | "adding" | "added">("idle");
const localWish = ref(false);
let timer: ReturnType<typeof setTimeout> | undefined;
onBeforeUnmount(() => clearTimeout(timer));
watch(
  () => props.product.id,
  () => {
    selection.value = initialSelection(props.product);
    picking.value = false;
  },
);

const isWish = computed(() => props.wishlisted ?? localWish.value);
const link = computed(() => props.href ?? `#${props.product.slug ?? props.product.id}`);
const variant = computed(() => commerceFindVariant(props.product, selection.value));
const colourOption = computed(() => props.product.options.find((o) => o.display === "swatch" || o.display === "image"));
const otherOptions = computed(() => props.product.options.filter((o) => o !== colourOption.value));
const soldOut = computed(() => !listingProductInStock(props.product));
const cheapest = computed(() => listingCheapestVariant(props.product));
const shown = computed(() => variant.value ?? cheapest.value);
const percent = computed(() => {
  const v = variant.value;
  if (!v) return listingBestDiscount(props.product);
  return v.compareAt && v.compareAt > v.price ? Math.floor(((v.compareAt - v.price) * 100) / v.compareAt) : 0;
});

const variantImage = (valueId: string | null | undefined) => {
  const c = colourOption.value;
  if (!c || !valueId) return undefined;
  return props.product.variants.find((v) => v.options[c.id] === valueId && v.image)?.image;
};
const primary = computed(() => {
  const chosen = colourOption.value ? selection.value[colourOption.value.id] : undefined;
  return variantImage(preview.value) ?? variantImage(chosen) ?? variant.value?.image;
});
const primaryImage = computed(() => (primary.value ? { src: primary.value, alt: props.product.name } : (props.product.images[0] ?? { src: "", alt: props.product.name })));
const secondary = computed(() => (!primary.value && !preview.value ? props.product.images[1] : undefined));
const missing = computed(() => props.product.options.find((o) => !selection.value[o.id]));
const canAdd = computed(() => hasAdd.value && !soldOut.value);
const badges = computed(() => (props.product.badges ?? []).slice(0, 2));
const name = computed(() => props.product.name);
const wishLabel = computed(() => fillTemplate(isWish.value ? t.value.wishlistRemove : t.value.wishlistAdd, { name: name.value }));
const compareLabel = computed(() => fillTemplate(t.value.compareFor, { name: name.value }));

async function add(v: CommerceVariant) {
  if (!hasAdd.value || !commerceInStock(v)) return;
  status.value = "adding";
  try {
    await listener("onAddToCart")?.(props.product, v, 1);
    status.value = "added";
    clearTimeout(timer);
    timer = setTimeout(() => (status.value = "idle"), 1800);
  } catch {
    status.value = "idle";
  }
}
function quickAdd() {
  if (!canAdd.value) return;
  if (missing.value) {
    picking.value = true;
    return;
  }
  if (variant.value) void add(variant.value);
}
function pick(optionId: string, valueId: string) {
  const next = { ...selection.value, [optionId]: valueId };
  selection.value = next;
  if (!picking.value) return;
  if (props.product.options.every((o) => next[o.id])) {
    const v = commerceFindVariant(props.product, next);
    picking.value = false;
    if (v) void add(v);
  }
}
function navigate() {
  emit("navigate", props.product);
  if (!listener("onNavigate") && props.href) window.location.assign(props.href);
}
function toggleWish() {
  const next = !isWish.value;
  localWish.value = next;
  emit("toggleWishlist", props.product, next);
}

const actions = computed<ContextMenuAction[]>(() => [
  ...(hasQuickView.value ? [{ id: "quick-view", label: t.value.quickView, icon: Eye, onSelect: () => emit("quickView", props.product), group: "view" }] : []),
  ...(canAdd.value
    ? [
        {
          id: "add",
          label: missing.value ? fillTemplate(t.value.chooseOption, { option: missing.value.name }) : t.value.addToCart,
          icon: ShoppingBag,
          onSelect: () => (missing.value && hasQuickView.value ? emit("quickView", props.product) : quickAdd()),
          group: "buy",
        },
      ]
    : []),
  { id: "wishlist", label: wishLabel.value, icon: Heart, onSelect: toggleWish, group: "buy" },
  ...(hasCompare.value ? [{ id: "compare", label: compareLabel.value, icon: GitCompareArrows, onSelect: () => emit("toggleCompare", props.product, !props.compared), group: "buy" }] : []),
]);
const addLabel = computed(() => (status.value === "added" ? t.value.added : missing.value && !list.value ? t.value.quickAdd : variant.value && !commerceInStock(variant.value) ? t.value.soldOut : t.value.addToCart));
</script>

<template>
  <NqContextMenuActions :actions="actions" :disabled="!props.menu" class="h-full min-w-0">
    <div data-slot="store-product-card-menu" class="h-full min-w-0">
      <article
        v-bind="$attrs"
        data-slot="store-product-card"
        :data-layout="props.layout"
        :data-sold-out="soldOut ? '' : undefined"
        :class="cn('group/card relative flex min-w-0', list ? 'flex-row gap-4 sm:gap-6' : 'flex-col gap-3', props.class)"
      >
        <div
          data-slot="store-product-card-media"
          :class="cn('relative shrink-0 cursor-pointer overflow-hidden rounded-card bg-secondary', list ? 'aspect-square w-32 sm:w-52' : props.ratio === 'square' ? 'aspect-square w-full' : 'aspect-[4/5] w-full')"
          @click="navigate"
        >
          <NqStoreProductImage :src="primaryImage.src" :alt="primaryImage.alt" :eager="props.priority" :class="soldOut ? 'opacity-60' : undefined" />
          <div v-if="secondary" aria-hidden="true" class="absolute inset-0 opacity-0 transition-opacity duration-200 ease-nq group-hover/card:opacity-100 motion-reduce:transition-none pointer-coarse:hidden">
            <NqStoreProductImage :src="secondary.src" alt="" />
          </div>

          <div class="pointer-events-none absolute start-2 top-2 flex max-w-[70%] flex-col items-start gap-1">
            <NqBadge v-if="soldOut" variant="neutral">{{ t.soldOut }}</NqBadge>
            <NqBadge v-if="percent > 0 && !soldOut" variant="danger">
              <bdi>{{ fillTemplate(t.percentOff, { n: percent }) }}</bdi>
            </NqBadge>
            <NqBadge v-for="b in badges" :key="b" variant="accent">{{ b }}</NqBadge>
          </div>

          <div class="absolute end-2 top-2 flex flex-col gap-1.5" @click.stop>
            <NqButton size="icon-sm" variant="secondary" :aria-pressed="isWish" :aria-label="wishLabel" class="rounded-full bg-card/90 shadow-xs backdrop-blur-sm" @click="toggleWish">
              <NqIcon :icon="Heart" :class="cn(isWish && 'fill-current text-nq-danger')" />
            </NqButton>
            <NqButton
              v-if="hasQuickView"
              size="icon-sm"
              variant="secondary"
              :aria-label="fillTemplate(t.quickViewFor, { name })"
              class="rounded-full bg-card/90 opacity-0 shadow-xs backdrop-blur-sm transition-opacity duration-150 focus-visible:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100"
              @click="emit('quickView', props.product)"
            >
              <NqIcon :icon="Eye" />
            </NqButton>
          </div>

          <div
            v-if="!list && canAdd"
            :class="cn('absolute inset-x-2 bottom-2 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100', (picking || status !== 'idle') && 'opacity-100')"
            @click.stop
          >
            <div v-if="picking && missing" class="flex flex-col gap-2 rounded-control border border-border bg-popover p-2 shadow-floating" role="group" :aria-label="fillTemplate(t.chooseOption, { option: missing.name })">
              <div class="flex items-center justify-between gap-2">
                <p class="text-caption font-medium text-foreground">{{ fillTemplate(t.chooseOption, { option: missing.name }) }}</p>
                <NqButton size="icon-sm" variant="ghost" :aria-label="t.close" class="size-5" @click="picking = false"><span aria-hidden="true">×</span></NqButton>
              </div>
              <NqStoreOptionPicker :product="props.product" :option="missing" :selection="selection" size="sm" :labels="props.labels" @select="pick" />
            </div>
            <NqButton v-else variant="primary" size="sm" :loading="status === 'adding'" :disabled="variant ? !commerceInStock(variant) : false" data-slot="store-product-card-add" class="w-full" @click="quickAdd">
              <NqIcon :icon="status === 'added' ? Check : ShoppingBag" />
              {{ addLabel }}
            </NqButton>
          </div>
        </div>

        <div :class="cn('flex min-w-0 flex-1 flex-col gap-1.5', list && 'justify-center')">
          <p v-if="props.product.brand" class="truncate text-caption text-muted-foreground">{{ props.product.brand }}</p>
          <h3 class="text-body font-medium text-foreground">
            <a :href="link" class="line-clamp-2 rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus" @click="emit('navigate', props.product)">{{ name }}</a>
          </h3>
          <NqRating v-if="props.product.rating" :value="props.product.rating.average" :count="props.product.rating.count" :count-label="t.reviews" />
          <p v-if="list && props.product.description" class="line-clamp-2 max-w-prose text-body-sm text-muted-foreground">{{ props.product.description }}</p>
          <NqStorePrice v-if="shown" :amount="shown.price" :currency="currency" size="md" :from="!variant && listingHasPriceRange(props.product)" :compare-at="shown.compareAt" :labels="props.labels" />
          <NqStoreOptionPicker
            v-if="colourOption && colourOption.values.length > 1"
            :product="props.product"
            :option="colourOption"
            :selection="selection"
            size="sm"
            :max="props.maxSwatches"
            :labels="props.labels"
            class="mt-0.5"
            @select="pick"
            @preview="preview = $event"
          />
          <template v-if="list">
            <NqStoreOptionPicker v-for="o in otherOptions.filter((x) => x.values.length > 1)" :key="o.id" :product="props.product" :option="o" :selection="selection" size="sm" :labels="props.labels" @select="pick" />
            <div v-if="canAdd" class="mt-1.5 flex flex-wrap items-center gap-2">
              <NqButton variant="primary" size="sm" :loading="status === 'adding'" :disabled="variant ? !commerceInStock(variant) : false" data-slot="store-product-card-add" class="w-fit" @click="quickAdd">
                <NqIcon :icon="status === 'added' ? Check : ShoppingBag" />
                {{ addLabel }}
              </NqButton>
              <NqButton v-if="hasQuickView" size="sm" variant="secondary" @click="emit('quickView', props.product)">
                <NqIcon :icon="Eye" />
                {{ t.quickView }}
              </NqButton>
            </div>
          </template>
          <label v-if="hasCompare" class="mt-1 flex w-fit cursor-pointer items-center gap-2 text-caption text-muted-foreground">
            <NqCheckbox :model-value="props.compared" :aria-label="compareLabel" @update:model-value="emit('toggleCompare', props.product, $event)" />
            {{ t.compare }}
          </label>
          <span class="sr-only" role="status" aria-live="polite">{{ status === "added" ? fillTemplate(t.addedLive, { name }) : "" }}</span>
        </div>
      </article>
    </div>
  </NqContextMenuActions>
</template>
