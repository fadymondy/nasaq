<script setup lang="ts">
import { Check, X } from "lucide-vue-next";
import { computed, getCurrentInstance, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { NqRating } from "../rating";
import { NqSwitch } from "../switch";
import type { CommerceProduct } from "./commerce";
import { listingCompareDifferences, listingCompareRows } from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStorePrice from "./NqStorePrice.vue";
import NqStoreProductImage from "./NqStoreProductImage.vue";

// Products side by side: price, brand, category, rating, availability, each option and the description. Differing rows are marked.
// The per-product "Add to cart" and remove buttons only show when their listener is bound.
interface Props {
  products: readonly CommerceProduct[];
  /** Default USD, or SAR in Arabic. */
  currency?: string;
  /** Start with only the differing rows. Default false. */
  differencesOnly?: boolean;
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), { currency: undefined, differencesOnly: false, labels: undefined });
const emit = defineEmits<{ remove: [product: CommerceProduct]; addToCart: [product: CommerceProduct] }>();
const instance = getCurrentInstance();
const bound = (name: string) => Boolean((instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name]);

const currency = useCurrency(() => props.currency);
const { t } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const onlyDiff = ref(props.differencesOnly);
watch(() => props.differencesOnly, (v) => (onlyDiff.value = v));
const all = computed(() => listingCompareRows(props.products));
const rows = computed(() => (onlyDiff.value ? listingCompareDifferences(all.value, props.products.length) : all.value));
const rowLabel = (kind: string, label?: string) =>
  label ?? ({ price: t.value.priceRow, brand: t.value.brandRow, category: t.value.categoryRow, rating: t.value.ratingRow, availability: t.value.availabilityRow, description: t.value.descriptionRow } as Record<string, string>)[kind] ?? kind;
</script>

<template>
  <div data-slot="store-compare-table" :class="cn('flex flex-col gap-3', props.class)">
    <label class="flex w-fit cursor-pointer items-center gap-2 text-body-sm">
      <NqSwitch v-model="onlyDiff" />
      {{ t.onlyDifferences }}
    </label>
    <div class="overflow-x-auto rounded-card border border-border">
      <table class="w-full min-w-[36rem] table-fixed border-collapse text-start text-body-sm">
        <thead>
          <tr class="align-top">
            <th scope="col" class="w-32 bg-secondary p-3 text-start text-label text-muted-foreground sm:w-40">{{ t.attribute }}</th>
            <th v-for="p in props.products" :key="p.id" scope="col" class="border-s border-border p-3 text-start font-normal">
              <div class="flex flex-col gap-2">
                <div class="aspect-square w-full max-w-32 overflow-hidden rounded-control bg-secondary">
                  <NqStoreProductImage :src="p.images[0]?.src" :alt="p.name" />
                </div>
                <p class="text-label text-foreground">{{ p.name }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <NqButton v-if="bound('onAddToCart')" size="sm" variant="primary" @click="emit('addToCart', p)">{{ t.addToCart }}</NqButton>
                  <NqButton v-if="bound('onRemove')" size="sm" variant="ghost" :aria-label="fillTemplate(t.compareRemove, { name: p.name })" @click="emit('remove', p)">
                    <NqIcon :icon="X" />
                  </NqButton>
                </div>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.id" class="border-t border-border align-top" :data-differs="row.differs ? '' : undefined">
            <th scope="row" :class="cn('bg-secondary p-3 text-start font-medium text-foreground', row.differs && 'border-s-2 border-s-primary')">
              {{ rowLabel(row.kind, row.label) }}
              <span v-if="row.differs" class="sr-only"> ({{ t.compareTitle }})</span>
            </th>
            <td v-for="(cell, i) in row.cells" :key="props.products[i]?.id ?? i" :class="cn('border-s border-border p-3', row.differs && 'bg-nq-selected/40')">
              <NqStorePrice v-if="row.kind === 'price' && typeof cell === 'number'" :amount="cell" :currency="currency" :labels="props.labels" />
              <NqRating v-else-if="row.kind === 'rating' && typeof cell === 'number' && props.products[i]?.rating" :value="cell" :count="props.products[i]!.rating!.count" :count-label="t.reviews" />
              <template v-else-if="row.kind === 'availability'">
                <NqBadge v-if="cell" variant="success"><NqIcon :icon="Check" />{{ t.inStock }}</NqBadge>
                <NqBadge v-else variant="danger">{{ t.outOfStock }}</NqBadge>
              </template>
              <span v-else-if="cell === null || cell === ''" class="text-muted-foreground">{{ t.none }}</span>
              <span v-else>{{ typeof cell === "number" ? fmt(cell) : String(cell) }}</span>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="props.products.length + 1" class="p-6 text-center text-muted-foreground">{{ t.noDifferences }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
