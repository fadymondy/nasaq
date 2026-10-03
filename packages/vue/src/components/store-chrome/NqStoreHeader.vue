<script setup lang="ts">
import { Heart, Menu, ShoppingBag, User } from "lucide-vue-next";
import { computed, h, ref, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { NqAccordion, NqAccordionItem, NqAccordionPanel, NqAccordionTrigger } from "../accordion";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { NqIcon } from "../icon";
import { useFormatNumber } from "../numeric";
import { NqSheet, NqSheetBody, NqSheetContent, NqSheetDescription, NqSheetHeader, NqSheetTitle } from "../sheet";
import NqStoreMegaMenu from "./NqStoreMegaMenu.vue";
import NqStoreSearch from "./NqStoreSearch.vue";
import { storeChromeFill, useStoreChromeStrings, type StoreChromeLabels } from "./strings";
import type { StoreNavItem } from "./types";

// The storefront header: announcement slot, brand, mega menu, search, wishlist, account and cart with a count. On phones
// the menu moves into a sheet with an accordion and the search drops to its own row. Slots: brand, announcement,
// utility (extra controls before the cart), account (replaces the account button). Search props go in `search`.
type SearchProps = InstanceType<typeof NqStoreSearch>["$props"];

const props = withDefaults(
  defineProps<{
    brandHref?: string;
    nav?: readonly StoreNavItem[];
    currentNavId?: string;
    /** Search props. Without it the search box is hidden. */
    search?: SearchProps;
    cartCount?: number;
    /** Show the cart as a button (listen for @cart-click) instead of a link. */
    cartButton?: boolean;
    /** Link for the cart when it is not a button. */
    cartHref?: string;
    wishlistCount?: number;
    /** Show the wishlist button (also shown when wishlistCount is given). */
    wishlistButton?: boolean;
    /** Show the account button when there is no account slot. */
    accountButton?: boolean;
    /** Stick to the top of the page. Default true. */
    sticky?: boolean;
    labels?: StoreChromeLabels;
    class?: HTMLAttributes["class"];
  }>(),
  {
    brandHref: "/",
    nav: () => [],
    currentNavId: undefined,
    search: undefined,
    cartCount: undefined,
    cartButton: false,
    cartHref: undefined,
    wishlistCount: undefined,
    wishlistButton: false,
    accountButton: false,
    sticky: true,
    labels: undefined,
  },
);
const emit = defineEmits<{ "cart-click": []; "wishlist-click": []; "account-click": [] }>();

const { t } = useStoreChromeStrings(() => props.labels);
const fmt = useFormatNumber();
const menu = ref(false);
const open = ref<string[]>([]);
const cartLabel = computed(() => (props.cartCount ? storeChromeFill(t.value.cartWithCount, { n: fmt(props.cartCount) }) : t.value.cart));
const wishLabel = computed(() => (props.wishlistCount ? storeChromeFill(t.value.wishlistWithCount, { n: fmt(props.wishlistCount) }) : t.value.wishlist));
const showWish = computed(() => props.wishlistButton || props.wishlistCount !== undefined);
const cartAsLink = computed(() => !props.cartButton && !!props.cartHref);
const showCart = computed(() => props.cartButton || !!props.cartHref);
const searchProps = computed(() => (props.search ? { ...props.search, labels: props.search.labels ?? props.labels } : undefined));

const CountBadge = (p: { n: number | undefined }) =>
  p.n
    ? h(
        "span",
        { "aria-hidden": "true", class: "absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] leading-4 font-semibold text-primary-foreground tabular-nums" },
        p.n > 99 ? `${fmt(99)}+` : fmt(p.n),
      )
    : null;
</script>

<template>
  <header data-slot="store-header" :class="cn(props.sticky && 'sticky top-0 z-40', 'border-b border-border bg-background', props.class)">
    <slot name="announcement" />
    <div class="mx-auto flex h-16 w-full max-w-7xl items-center gap-2 px-3 sm:gap-4 sm:px-6">
      <NqButton v-if="props.nav.length" size="icon" variant="ghost" :aria-label="t.menu" class="lg:hidden" @click="menu = true">
        <NqIcon :icon="Menu" />
      </NqButton>
      <a :href="props.brandHref" class="shrink-0 rounded-sm text-h3 font-semibold text-foreground no-underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
        <slot name="brand" />
      </a>
      <div class="hidden min-w-0 lg:block">
        <NqStoreMegaMenu :items="props.nav" :current-id="props.currentNavId" :labels="props.labels" />
      </div>
      <NqStoreSearch v-if="searchProps" v-bind="searchProps" :class="cn('mx-auto hidden max-w-xl flex-1 md:block', props.search?.class)" />
      <span v-else class="flex-1" />
      <div class="ms-auto flex shrink-0 items-center gap-0.5 md:ms-0">
        <slot name="utility" />
        <NqButton v-if="showWish" size="icon" variant="ghost" :aria-label="wishLabel" class="relative hidden sm:inline-flex" @click="emit('wishlist-click')">
          <NqIcon :icon="Heart" />
          <CountBadge :n="props.wishlistCount" />
        </NqButton>
        <slot name="account">
          <NqButton v-if="props.accountButton" size="icon" variant="ghost" :aria-label="t.account" @click="emit('account-click')">
            <NqIcon :icon="User" />
          </NqButton>
        </slot>
        <NqButton v-if="showCart && cartAsLink" as="a" :href="props.cartHref" size="icon" variant="ghost" :aria-label="cartLabel" class="relative">
          <NqIcon :icon="ShoppingBag" />
          <CountBadge :n="props.cartCount" />
        </NqButton>
        <NqButton v-else-if="showCart" size="icon" variant="ghost" :aria-label="cartLabel" class="relative" @click="emit('cart-click')">
          <NqIcon :icon="ShoppingBag" />
          <CountBadge :n="props.cartCount" />
        </NqButton>
      </div>
    </div>
    <div v-if="searchProps" class="px-3 pb-3 md:hidden">
      <NqStoreSearch v-bind="searchProps" />
    </div>

    <NqSheet v-model:open="menu">
      <NqSheetContent side="start" :close-label="t.closeMenu" class="w-[min(22rem,100vw)]">
        <NqSheetHeader>
          <NqSheetTitle>{{ t.menu }}</NqSheetTitle>
          <NqSheetDescription class="sr-only">{{ t.mobileNavigation }}</NqSheetDescription>
        </NqSheetHeader>
        <NqSheetBody>
          <nav :aria-label="t.mobileNavigation">
            <NqAccordion v-model="open" class="rounded-none border-0 bg-transparent">
              <template v-for="item in props.nav" :key="item.id">
                <NqAccordionItem v-if="item.columns?.length" :value="item.id">
                  <NqAccordionTrigger>{{ item.label }}</NqAccordionTrigger>
                  <NqAccordionPanel>
                    <div class="flex flex-col gap-3 pb-2">
                      <a v-if="item.href" :href="item.href" class="text-body-sm font-medium text-foreground underline underline-offset-4">{{ t.shopAll }}</a>
                      <div v-for="col in item.columns" :key="col.title" class="flex flex-col gap-1">
                        <p class="text-caption font-medium text-muted-foreground">{{ col.title }}</p>
                        <ul class="m-0 flex list-none flex-col p-0">
                          <li v-for="l in col.links" :key="l.href + l.label">
                            <a :href="l.href" class="flex items-center gap-2 rounded-control py-1.5 text-body-sm text-foreground no-underline hover:underline">
                              {{ l.label }}
                              <NqBadge v-if="l.badge" variant="accent">{{ l.badge }}</NqBadge>
                            </a>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </NqAccordionPanel>
                </NqAccordionItem>
                <a v-else :href="item.href ?? '#'" :class="cn('flex h-nav-row items-center border-b border-border px-4 text-label no-underline', item.highlight ? 'text-nq-danger-text' : 'text-foreground')">{{ item.label }}</a>
              </template>
            </NqAccordion>
          </nav>
        </NqSheetBody>
      </NqSheetContent>
    </NqSheet>
  </header>
</template>
