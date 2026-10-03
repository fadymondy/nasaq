<script setup lang="ts">
import { Clock, ImageOff, X } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqButton } from "../button";
import { NqEmptyState, NqSkeleton } from "../states";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceProduct } from "./commerce";

// Products the shopper looked at, newest first, with a way to drop one or clear the list.
const props = defineProps<{
  /** Product ids, most recent first (see `pushRecentlyViewed`). Ids that are no longer in the catalogue are skipped. */
  ids: readonly string[];
  products: readonly CommerceProduct[];
  /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onOpenProduct?: (product: CommerceProduct) => void;
  onRemove?: (id: string) => void;
  onClear?: () => void;
  loading?: boolean;
  labels?: StoreAccountLabels;
  class?: HTMLAttributes["class"];
}>();

const currency = useCurrency(() => props.currency);
const { t } = useStoreAccountStrings(() => props.labels);
const shown = computed(() => props.ids.map((id) => props.products.find((p) => p.id === id && p.status !== "archived")).filter((p): p is CommerceProduct => !!p));
const minPrice = (product: CommerceProduct) => Math.min(...product.variants.map((v) => v.price));
</script>

<template>
  <section data-slot="store-recently-viewed" :aria-label="t.recentTitle" :class="cn('flex min-w-0 flex-col gap-3', props.class)">
    <NqButton v-if="shown.length > 0 && props.onClear" size="sm" variant="ghost" class="self-end" @click="props.onClear()">{{ t.clearAll }}</NqButton>
    <div v-if="props.loading" class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
      <NqSkeleton class="h-48" />
      <NqSkeleton class="h-48" />
      <NqSkeleton class="h-48" />
    </div>
    <NqEmptyState v-else-if="shown.length === 0" :icon="Clock" :title="t.recentEmpty" :description="t.recentEmptyText" />
    <ul v-else class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4">
      <li v-for="product in shown" :key="product.id" class="group relative flex flex-col gap-2 rounded-card border border-border bg-card p-2">
        <button type="button" :aria-label="`${t.viewProduct}: ${product.name}`" class="flex flex-col gap-2 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus" @click="props.onOpenProduct?.(product)">
          <span class="flex aspect-square items-center justify-center overflow-hidden rounded-control bg-secondary">
            <img v-if="product.images[0]" :src="product.images[0].src" alt="" class="size-full object-cover" />
            <ImageOff v-else aria-hidden="true" class="size-6 text-muted-foreground" />
          </span>
          <span class="line-clamp-2 text-body-sm font-medium">{{ product.name }}</span>
          <NqStoreMoney :amount="minPrice(product)" :currency="currency" class="text-body-sm text-muted-foreground" />
        </button>
        <NqButton v-if="props.onRemove" size="icon-sm" variant="secondary" :aria-label="`${t.remove}: ${product.name}`" class="absolute end-3 top-3" @click="props.onRemove(product.id)">
          <X aria-hidden="true" />
        </NqButton>
      </li>
    </ul>
  </section>
</template>
