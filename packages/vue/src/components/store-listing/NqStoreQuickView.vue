<script setup lang="ts">
import { Minus, Plus } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, watch } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDialog, NqDialogContent, NqDialogDescription, NqDialogTitle } from "../dialog";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { NqRating } from "../rating";
import { commerceClampQuantity, commerceFindVariant, commerceInStock, type CommerceProduct, type CommerceSelection, type CommerceVariant } from "./commerce";
import { listingCheapestVariant, listingHasPriceRange } from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreOptionPicker from "./NqStoreOptionPicker.vue";
import NqStorePrice from "./NqStorePrice.vue";
import NqStoreProductImage from "./NqStoreProductImage.vue";

// A dialog with the gallery, options, price, stock and quantity of one product, so a shopper can add it without
// leaving the listing. Options start on the first in-stock variant, so the add button is usable at once.
interface Props {
  /** The product to show. `null` keeps the dialog closed. */
  product: CommerceProduct | null;
  /** v-model:open. */
  open: boolean;
  /** ISO 4217 code; prices are integer minor units. Default USD, or SAR in Arabic. */
  currency?: string;
  /** Full product page. Shows a "View full details" link when given. */
  href?: string;
  /** Closes the dialog after a successful add. Default true. */
  closeOnAdd?: boolean;
  /** Stock at or under this shows "Only n left". Default 5. */
  lowStockAt?: number;
  labels?: ListingLabels;
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, href: undefined, closeOnAdd: true, lowStockAt: 5, labels: undefined });
const emit = defineEmits<{
  "update:open": [open: boolean];
  /** A handler may return a promise; the button shows progress until it settles. */
  addToCart: [product: CommerceProduct, variant: CommerceVariant, quantity: number];
}>();
const instance = getCurrentInstance();
const addHandler = () => (instance?.vnode.props as Record<string, unknown> | null | undefined)?.onAddToCart as ((...a: unknown[]) => unknown) | undefined;

const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();

function firstAvailable(product: CommerceProduct): CommerceSelection {
  const start = product.variants.find((v) => commerceInStock(v)) ?? product.variants[0];
  return start ? { ...start.options } : {};
}
const selection = ref<CommerceSelection>({});
const quantity = ref(1);
const image = ref(0);
const busy = ref(false);
const live = ref("");
watch(
  () => props.product?.id,
  () => {
    if (!props.product) return;
    selection.value = firstAvailable(props.product);
    quantity.value = 1;
    image.value = 0;
    live.value = "";
  },
  { immediate: true },
);

const variant = computed(() => (props.product ? commerceFindVariant(props.product, selection.value) : undefined));
const shown = computed(() => variant.value ?? (props.product ? listingCheapestVariant(props.product) : undefined));
const inStock = computed(() => commerceInStock(variant.value));
const max = computed(() => (variant.value?.stock !== undefined && !variant.value.allowBackorder ? Math.max(variant.value.stock, 1) : 99));
const qty = computed(() => commerceClampQuantity(quantity.value, max.value));
const missing = computed(() => props.product?.options.find((o) => !selection.value[o.id]));
const gallery = computed(() => props.product?.images ?? []);
const current = computed(() => {
  const vi = variant.value?.image;
  return vi && image.value === 0 ? { src: vi, alt: props.product?.name ?? "" } : (gallery.value[image.value] ?? gallery.value[0]);
});

function pick(optionId: string, valueId: string) {
  selection.value = { ...selection.value, [optionId]: valueId };
  image.value = 0;
  quantity.value = 1;
}
async function add() {
  const product = props.product;
  const v = variant.value;
  if (!product || !v || !inStock.value || !addHandler()) return;
  busy.value = true;
  try {
    await addHandler()?.(product, v, qty.value);
    live.value = fillTemplate(t.value.addedLive, { name: product.name });
    if (props.closeOnAdd) emit("update:open", false);
  } finally {
    busy.value = false;
  }
}
const stockLine = computed(() => {
  const v = variant.value;
  if (!v) return missing.value ? fillTemplate(t.value.selectOption, { option: missing.value.name }) : t.value.unavailableCombo;
  if (!inStock.value) return t.value.outOfStock;
  if (v.stock !== undefined && !v.allowBackorder && v.stock <= props.lowStockAt) return fillTemplate(t.value.lowStock, { n: fmt(v.stock) });
  return t.value.inStock;
});
</script>

<template>
  <NqDialog v-if="props.product" :open="props.open" @update:open="emit('update:open', $event)">
    <NqDialogContent data-slot="store-quick-view" class="max-w-3xl p-0 sm:p-0" :close-label="t.close">
      <div class="grid gap-0 md:grid-cols-2">
        <div class="flex flex-col gap-2 p-4 md:p-6" role="group" :aria-label="t.gallery">
          <div class="aspect-square overflow-hidden rounded-card bg-secondary">
            <NqStoreProductImage :src="current?.src" :alt="current?.alt ?? props.product.name" eager />
          </div>
          <div v-if="gallery.length > 1" class="flex gap-2 overflow-x-auto">
            <button
              v-for="(img, i) in gallery"
              :key="`${img.src}-${i}`"
              type="button"
              :aria-label="fillTemplate(t.showImage, { n: fmt(i + 1) })"
              :aria-current="i === image"
              :class="cn('size-14 shrink-0 overflow-hidden rounded-control border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus', i === image ? 'border-primary' : 'border-border')"
              @click="image = i"
            >
              <NqStoreProductImage :src="img.src" alt="" />
            </button>
          </div>
        </div>

        <div class="flex min-w-0 flex-col gap-4 p-4 pt-0 md:p-6 md:ps-2">
          <div class="flex flex-col gap-1.5 pe-8">
            <p v-if="props.product.brand" class="text-caption text-muted-foreground">{{ props.product.brand }}</p>
            <NqDialogTitle>{{ props.product.name }}</NqDialogTitle>
            <NqDialogDescription class="sr-only">{{ t.quickViewTitle }}</NqDialogDescription>
            <NqRating v-if="props.product.rating" :value="props.product.rating.average" :count="props.product.rating.count" :count-label="t.reviews" />
          </div>
          <NqStorePrice v-if="shown" :amount="shown.price" :currency="currency" size="lg" :from="!variant && listingHasPriceRange(props.product)" :compare-at="shown.compareAt" :labels="props.labels" />
          <p v-if="props.product.description" class="text-body-sm text-muted-foreground">{{ props.product.description }}</p>

          <NqStoreOptionPicker v-for="o in props.product.options" :key="o.id" :product="props.product" :option="o" :selection="selection" show-label :labels="props.labels" @select="pick" />

          <div class="flex flex-wrap items-center gap-3">
            <div role="group" :aria-label="t.quantity" class="inline-flex h-control items-center rounded-control border border-border">
              <NqButton size="icon-sm" variant="ghost" :aria-label="t.decrease" :disabled="qty <= 1" class="rounded-e-none" @click="quantity = qty - 1">
                <NqIcon :icon="Minus" />
              </NqButton>
              <output aria-live="polite" class="min-w-8 text-center text-label tabular-nums"><bdi>{{ fmt(qty) }}</bdi></output>
              <NqButton size="icon-sm" variant="ghost" :aria-label="t.increase" :disabled="qty >= max" class="rounded-s-none" @click="quantity = qty + 1">
                <NqIcon :icon="Plus" />
              </NqButton>
            </div>
            <NqBadge :variant="!variant ? 'neutral' : inStock ? 'success' : 'danger'">{{ stockLine }}</NqBadge>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <NqButton v-if="addHandler()" variant="primary" :loading="busy" :disabled="!variant || !inStock" class="min-w-40 flex-1 sm:flex-none" @click="add">{{ t.addToCart }}</NqButton>
            <NqButton v-if="props.href" variant="secondary" as="a" :href="props.href">{{ t.viewDetails }}</NqButton>
          </div>
          <p class="sr-only" role="status" aria-live="polite">{{ live }}</p>
        </div>
      </div>
    </NqDialogContent>
  </NqDialog>
</template>
