<script setup lang="ts">
import { Clock, Heart, MapPin, Package, Undo2 } from "lucide-vue-next";
import type { Component, HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqNum } from "../numeric";
import { useStoreAccountStrings, type StoreAccountLabels } from "./account-strings";

// Account section navigation. A vertical list on wide screens and a scrolling row on narrow ones.
// Every item is a button that reports the section, so it works with any router.
export type StoreAccountSection = "orders" | "returns" | "wishlist" | "addresses" | "recent";

const ICON: Record<StoreAccountSection, Component> = { orders: Package, returns: Undo2, wishlist: Heart, addresses: MapPin, recent: Clock };

const props = withDefaults(
  defineProps<{
    active: StoreAccountSection;
    onNavigate?: (section: StoreAccountSection) => void;
    /** Small counts next to a section, for example the wishlist size. */
    counts?: Partial<Record<StoreAccountSection, number>>;
    /** Which sections to list, in order. Default: all five. */
    sections?: readonly StoreAccountSection[];
    labels?: StoreAccountLabels;
    class?: HTMLAttributes["class"];
  }>(),
  { sections: () => ["orders", "returns", "wishlist", "addresses", "recent"] },
);
const { t } = useStoreAccountStrings(() => props.labels);
const name = (s: StoreAccountSection) => ({ orders: t.value.navOrders, returns: t.value.navReturns, wishlist: t.value.navWishlist, addresses: t.value.navAddresses, recent: t.value.navRecent })[s];
</script>

<template>
  <nav data-slot="store-account-nav" :aria-label="t.account" :class="cn('min-w-0', props.class)">
    <ul class="m-0 flex list-none gap-1 overflow-x-auto p-0 pb-1 md:flex-col md:overflow-visible md:pb-0">
      <li v-for="section in props.sections" :key="section" class="shrink-0">
        <button
          type="button"
          :aria-current="section === props.active ? 'page' : undefined"
          :class="
            cn(
              'flex w-full items-center gap-2 rounded-control px-3 py-2 text-start text-body-sm font-medium outline-none',
              'transition-colors duration-150 ease-nq focus-visible:outline-2 focus-visible:outline-nq-focus',
              section === props.active ? 'bg-nq-selected text-foreground' : 'text-muted-foreground hover:bg-nq-hover hover:text-foreground',
            )
          "
          @click="props.onNavigate?.(section)"
        >
          <component :is="ICON[section]" aria-hidden="true" class="size-4" />
          <span class="whitespace-nowrap">{{ name(section) }}</span>
          <NqNum v-if="props.counts?.[section]" :value="props.counts[section]!" class="ms-auto text-caption text-muted-foreground" />
        </button>
      </li>
    </ul>
  </nav>
</template>
