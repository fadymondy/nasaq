<script setup lang="ts">
import { Bell, BellRing, Heart, ImageOff, ShoppingCart, Trash2 } from "lucide-vue-next";
import { computed, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqDateTime, NqNum } from "../numeric";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import NqStoreMoney from "../store-orders-admin/NqStoreMoney.vue";
import { backInStock, wishlistEntries, type WishlistEntry, type WishlistItem } from "./account-logic";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";
import type { CommerceProduct } from "./commerce";

// Saved products with live availability. Move an item to the cart, ask to be told when a sold-out item returns.
const props = defineProps<{
  items: readonly WishlistItem[];
  products: readonly CommerceProduct[];
  /** ISO 4217 code. Defaults to USD, or SAR in Arabic. */
  currency?: string;
  onMoveToCart?: (entry: WishlistEntry) => void;
  onToggleNotify?: (item: WishlistItem) => void;
  onRemove?: (item: WishlistItem) => void;
  onOpenProduct?: (product: CommerceProduct) => void;
  loading?: boolean;
  error?: boolean;
  onRetry?: () => void;
  labels?: StoreAccountLabels;
  class?: HTMLAttributes["class"];
}>();

const currency = useCurrency(() => props.currency);
const { t } = useStoreAccountStrings(() => props.labels);
const entries = computed(() => wishlistEntries(props.items, props.products));
const returned = computed(() => backInStock(props.items, props.products));
const imageOf = (entry: WishlistEntry) => entry.variant?.image ?? entry.product?.images[0]?.src;
</script>

<template>
  <NqErrorState v-if="props.error" :title="t.loadError">
    <template v-if="props.onRetry" #actions>
      <NqButton size="sm" variant="secondary" @click="props.onRetry()">{{ t.retry }}</NqButton>
    </template>
  </NqErrorState>

  <section v-else data-slot="store-wishlist" :aria-label="t.wishlistTitle" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <p v-if="returned.length > 0" role="status" class="m-0 flex items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm font-medium">
      <BellRing aria-hidden="true" class="size-4" />
      {{ t.backInStock(returned.length) }}
    </p>
    <div v-if="props.loading" class="grid gap-3 sm:grid-cols-2" aria-busy="true">
      <NqSkeleton class="h-28" />
      <NqSkeleton class="h-28" />
    </div>
    <NqEmptyState v-else-if="entries.length === 0" :icon="Heart" :title="t.wishlistEmpty" :description="t.wishlistEmptyText" />
    <ul v-else class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2">
      <li v-for="entry in entries" :key="entry.item.id" class="flex gap-3 rounded-card border border-border bg-card p-3">
        <button
          type="button"
          :disabled="!entry.product"
          :aria-label="entry.product?.name"
          class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus"
          @click="entry.product && props.onOpenProduct?.(entry.product)"
        >
          <img v-if="imageOf(entry)" :src="imageOf(entry)" alt="" :class="cn('size-full object-cover', entry.availability === 'out' && 'opacity-60')" />
          <ImageOff v-else aria-hidden="true" class="size-6 text-muted-foreground" />
        </button>
        <div class="flex min-w-0 flex-1 flex-col gap-1.5">
          <span class="truncate font-medium">{{ entry.product?.name ?? "-" }}</span>
          <span v-if="entry.variant" class="flex flex-wrap items-baseline gap-x-2 text-body-sm">
            <NqStoreMoney :amount="entry.variant.price" :currency="currency" class="font-semibold" />
            <template v-if="entry.priceDrop > 0 && entry.item.priceWhenSaved !== undefined">
              <NqBadge variant="success">{{ t.priceDropped }}</NqBadge>
              <span class="text-muted-foreground line-through">
                <span class="sr-only">{{ t.was }} </span>
                <NqStoreMoney :amount="entry.item.priceWhenSaved" :currency="currency" />
              </span>
            </template>
          </span>
          <span class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
            <NqBadge v-if="entry.availability === 'in-stock'" variant="success">{{ t.inStock }}</NqBadge>
            <NqBadge v-else-if="entry.availability === 'low'" variant="warning">{{ t.lowStock(entry.stock ?? 0) }}</NqBadge>
            <NqBadge v-else-if="entry.availability === 'out'" variant="neutral">{{ t.outOfStock }}</NqBadge>
            <NqBadge v-else variant="danger">{{ t.unavailable }}</NqBadge>
            <span>{{ t.savedOn }} <NqDateTime :value="entry.item.addedAt" :format="{ dateStyle: 'medium' }" /></span>
          </span>
          <div class="mt-auto flex flex-wrap items-center gap-2">
            <NqButton v-if="entry.canMoveToCart" size="sm" variant="primary" @click="props.onMoveToCart?.(entry)">
              <ShoppingCart aria-hidden="true" />
              {{ t.moveToCart }}
            </NqButton>
            <NqButton v-if="entry.canNotify" size="sm" variant="secondary" :aria-pressed="!!entry.item.notify" @click="props.onToggleNotify?.(entry.item)">
              <BellRing v-if="entry.item.notify" aria-hidden="true" />
              <Bell v-else aria-hidden="true" />
              {{ entry.item.notify ? t.notifying : t.notifyMe }}
            </NqButton>
            <NqButton size="icon-sm" variant="ghost" :aria-label="`${t.remove}: ${entry.product?.name ?? ''}`" @click="props.onRemove?.(entry.item)">
              <Trash2 aria-hidden="true" />
            </NqButton>
          </div>
        </div>
      </li>
    </ul>
    <p v-if="entries.length > 0" class="m-0 text-caption text-muted-foreground"><NqNum :value="entries.length" /> {{ t.items }}</p>
  </section>
</template>
