<script setup lang="ts">
import { computed, getCurrentInstance, ref, watch, type HTMLAttributes } from "vue";
import { cn } from "../../lib/cn";
import { useCurrency } from "../../provider";
import { NqBadge } from "../badge";
import { NqButton } from "../button";
import { useFormatNumber } from "../numeric";
import { NqLoadMore, NqPagination } from "../pagination";
import { NqEmptyState, NqErrorState, NqSkeleton } from "../states";
import { storeChipLabel, useStoreMoney } from "./chip-label";
import { COMMERCE_EMPTY_LISTING_FILTERS, type CommerceCategoryNode, type CommerceListingFilters, type CommerceListingSort, type CommerceProduct, type CommerceVariant } from "./commerce";
import {
  listingClear,
  listingFilter,
  listingFilterCount,
  listingLabelIndex,
  listingPage,
  listingRelaxations,
  listingRemoveChip,
  listingSort,
  listingToggleCompare,
  listingVisibleCount,
} from "./listing-model";
import { fillTemplate, useListingStrings, type ListingLabels } from "./listing-strings";
import NqStoreActiveChips from "./NqStoreActiveChips.vue";
import NqStoreCompareDialog from "./NqStoreCompareDialog.vue";
import NqStoreCompareTray from "./NqStoreCompareTray.vue";
import NqStoreFacetSidebar from "./NqStoreFacetSidebar.vue";
import NqStoreFilterSheet from "./NqStoreFilterSheet.vue";
import NqStoreListingToolbar, { type StoreListingDensity, type StoreListingView } from "./NqStoreListingToolbar.vue";
import NqStoreProductCard from "./NqStoreProductCard.vue";
import NqStoreQuickView from "./NqStoreQuickView.vue";

// A product listing: facet sidebar with counts, active chips, sort, grid/list and density, result count, pages or
// load more, empty results with ways to relax the filters, a filter sheet on phones, quick view and compare. All from
// CommerceProduct[]; the page owns nothing else. Works uncontrolled, or controlled through v-model:filters / v-model:sort.
interface Props {
  /** The whole catalogue for this page; filtering, sorting, facets and paging happen here. */
  products: readonly CommerceProduct[];
  /** ISO 4217 code; prices are integer minor units. Default USD, or SAR in Arabic. */
  currency?: string;
  categoryTree?: readonly CommerceCategoryNode[];
  /** Controlled filters (v-model:filters). Uncontrolled starts from `defaultFilters`. */
  filters?: CommerceListingFilters;
  defaultFilters?: Partial<CommerceListingFilters>;
  sort?: CommerceListingSort;
  defaultSort?: CommerceListingSort;
  sorts?: readonly CommerceListingSort[];
  view?: StoreListingView;
  defaultView?: StoreListingView;
  density?: StoreListingDensity;
  /** Products per page, or per "load more" press. Default 12. */
  pageSize?: number;
  /** "pages" (default) shows numbered pagination; "load-more" appends. */
  paging?: "pages" | "load-more";
  /** Heading above the toolbar. */
  title?: string;
  /** Show the query chip in the chip row. Default false. */
  showQueryChip?: boolean;
  loading?: boolean;
  /** Shows the error state; a bound `retry` listener adds the retry button. */
  error?: boolean;
  /** Searches suggested when nothing matches (needs a `search` listener). */
  popularSearches?: readonly string[];
  getHref?: (product: CommerceProduct) => string;
  /** Ids on the wishlist. Without it, hearts keep their own state. */
  wishlistIds?: readonly string[];
  /** Turns the compare boxes, tray and table on. Default true. */
  compare?: boolean;
  /** Most products to compare. Default 4. */
  compareMax?: number;
  compareIds?: readonly string[];
  labels?: ListingLabels;
  class?: HTMLAttributes["class"];
}
const props = withDefaults(defineProps<Props>(), {
  currency: undefined,
  categoryTree: () => [],
  filters: undefined,
  defaultFilters: undefined,
  sort: undefined,
  defaultSort: "relevance",
  sorts: undefined,
  view: undefined,
  defaultView: "grid",
  density: undefined,
  pageSize: 12,
  paging: "pages",
  title: undefined,
  showQueryChip: false,
  loading: false,
  error: false,
  popularSearches: () => [],
  getHref: undefined,
  wishlistIds: undefined,
  compare: true,
  compareMax: 4,
  compareIds: undefined,
  labels: undefined,
});
const emit = defineEmits<{
  "update:filters": [filters: CommerceListingFilters];
  "update:sort": [sort: CommerceListingSort];
  "update:view": [view: StoreListingView];
  "update:density": [density: StoreListingDensity];
  "update:compareIds": [ids: string[]];
  retry: [];
  search: [query: string];
  navigate: [product: CommerceProduct];
  toggleWishlist: [product: CommerceProduct, next: boolean];
  /** A handler may return a promise; the card button shows progress until it settles. */
  addToCart: [product: CommerceProduct, variant: CommerceVariant, quantity: number];
  compareAddToCart: [product: CommerceProduct];
}>();
const instance = getCurrentInstance();
const listener = (name: string) => (instance?.vnode.props as Record<string, unknown> | null | undefined)?.[name] as ((...a: unknown[]) => unknown) | undefined;
const hasAdd = computed(() => Boolean(listener("onAddToCart")));
const hasRetry = computed(() => Boolean(listener("onRetry")));
const hasSearch = computed(() => Boolean(listener("onSearch")));
const hasCompareAdd = computed(() => Boolean(listener("onCompareAddToCart")));
const addToCart = (p: CommerceProduct, v: CommerceVariant, q: number) => listener("onAddToCart")?.(p, v, q);

const currency = useCurrency(() => props.currency);
const { t, locale } = useListingStrings(() => props.labels);
const fmt = useFormatNumber();
const money = useStoreMoney(() => currency.value);

const localFilters = ref<CommerceListingFilters>({ ...COMMERCE_EMPTY_LISTING_FILTERS, ...props.defaultFilters });
const localSort = ref<CommerceListingSort>(props.defaultSort);
const localView = ref<StoreListingView>(props.defaultView);
const localDensity = ref<StoreListingDensity>("comfortable");
const filters = computed(() => props.filters ?? localFilters.value);
const sort = computed(() => props.sort ?? localSort.value);
const view = computed(() => props.view ?? localView.value);
const density = computed(() => props.density ?? localDensity.value);
const setFilters = (f: CommerceListingFilters) => {
  localFilters.value = f;
  emit("update:filters", f);
};
const setSort = (s: CommerceListingSort) => {
  localSort.value = s;
  emit("update:sort", s);
};
const setView = (v: StoreListingView) => {
  localView.value = v;
  emit("update:view", v);
};
const setDensity = (d: StoreListingDensity) => {
  localDensity.value = d;
  emit("update:density", d);
};

const page = ref(1);
const presses = ref(0);
const sheet = ref(false);
const quick = ref<CommerceProduct | null>(null);
const quickOpen = ref(false);
const compareOpen = ref(false);
const localCompare = ref<string[]>([]);
const localWish = ref<string[]>([]);
const notice = ref("");
const top = ref<HTMLElement | null>(null);

const compareIds = computed(() => props.compareIds ?? localCompare.value);
const ctx = computed(() => ({ tree: props.categoryTree }));
const index = computed(() => listingLabelIndex(props.products, props.categoryTree));
const matches = computed(() => listingSort(listingFilter(props.products, filters.value, ctx.value), sort.value, filters.value.query, locale.value));
const total = computed(() => matches.value.length);
const pg = computed(() => listingPage(total.value, page.value, props.pageSize));
const visible = computed(() => (props.paging === "pages" ? matches.value.slice(pg.value.start, pg.value.end) : matches.value.slice(0, listingVisibleCount(total.value, props.pageSize, presses.value))));
const count = computed(() => listingFilterCount(filters.value));
const relax = computed(() => (total.value === 0 ? listingRelaxations(props.products, filters.value, props.categoryTree).slice(0, 4) : []));
const comparedProducts = computed(() => compareIds.value.map((id) => props.products.find((p) => p.id === id)).filter((p): p is CommerceProduct => Boolean(p)));
const wish = computed(() => props.wishlistIds ?? localWish.value);

watch([filters, sort, () => props.pageSize], () => {
  page.value = 1;
  presses.value = 0;
});

function toggleCompare(p: CommerceProduct) {
  const r = listingToggleCompare(compareIds.value, p.id, props.compareMax);
  if (r.rejected) {
    notice.value = fillTemplate(t.value.compareFull, { max: fmt(props.compareMax) });
    return;
  }
  notice.value = "";
  setCompare(r.ids);
}
function setCompare(ids: string[]) {
  localCompare.value = ids;
  emit("update:compareIds", ids);
}
function onWish(p: CommerceProduct, next: boolean) {
  localWish.value = next ? [...localWish.value, p.id] : localWish.value.filter((x) => x !== p.id);
  emit("toggleWishlist", p, next);
}
function openQuick(p: CommerceProduct) {
  quick.value = p;
  quickOpen.value = true;
}
function goPage(n: number) {
  page.value = n;
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  top.value?.scrollIntoView?.({ block: "start", behavior: reduce ? "auto" : "smooth" });
}

const GRID = {
  comfortable: "grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4",
  compact: "grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-4",
} as const;
</script>

<template>
  <div data-slot="store-listing" :class="cn('flex min-w-0 flex-col gap-4', props.class)">
    <div ref="top" class="scroll-mt-20" />
    <slot name="header" />
    <h1 v-if="props.title" class="text-h1 text-foreground">{{ props.title }}</h1>
    <div class="grid gap-x-8 gap-y-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside class="hidden lg:block" :aria-label="t.filters">
        <NqStoreFacetSidebar :products="props.products" :filters="filters" :category-tree="props.categoryTree" :currency="currency" :labels="props.labels" @update:filters="setFilters" />
      </aside>
      <div class="flex min-w-0 flex-col gap-4">
        <NqStoreListingToolbar
          :total="total"
          :sort="sort"
          :sorts="props.sorts"
          :view="view"
          :density="density"
          :filter-count="count"
          :labels="props.labels"
          @update:sort="setSort"
          @update:view="setView"
          @update:density="setDensity"
          @open-filters="sheet = true"
        />
        <NqStoreActiveChips :filters="filters" :index="index" :currency="currency" :include-query="props.showQueryChip" :labels="props.labels" @update:filters="setFilters" />
        <p v-if="notice" role="status" class="text-body-sm text-nq-warning-text">{{ notice }}</p>

        <NqErrorState v-if="props.error" :title="t.errorTitle" :description="t.errorHint">
          <template v-if="hasRetry" #actions><NqButton variant="primary" @click="emit('retry')">{{ t.retry }}</NqButton></template>
        </NqErrorState>
        <div v-else-if="props.loading" role="status" :aria-label="t.loading" :class="cn('grid', GRID[density])">
          <div v-for="i in 8" :key="i" class="flex flex-col gap-2">
            <NqSkeleton class="aspect-[4/5] w-full rounded-card" />
            <NqSkeleton class="h-4 w-3/4" />
            <NqSkeleton class="h-4 w-1/3" />
          </div>
        </div>
        <NqEmptyState v-else-if="total === 0" :title="filters.query ? fillTemplate(t.noResultsFor, { query: filters.query }) : t.noResults" :description="t.noResultsHint">
          <div v-if="relax.length" class="flex flex-col items-center gap-2">
            <p class="text-caption text-muted-foreground">{{ t.tryRemoving }}</p>
            <div class="flex flex-wrap justify-center gap-2">
              <button
                v-for="r in relax"
                :key="r.chip.id"
                type="button"
                class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"
                @click="setFilters(listingRemoveChip(filters, r.chip))"
              >
                <bdi>{{ storeChipLabel(r.chip, index, t, money, fmt) }}</bdi>
                <NqBadge variant="neutral">{{ fmt(r.count) }}</NqBadge>
              </button>
            </div>
          </div>
          <div v-if="props.popularSearches.length && hasSearch" class="flex flex-col items-center gap-2">
            <p class="text-caption text-muted-foreground">{{ t.didYouMean }}</p>
            <div class="flex flex-wrap justify-center gap-2">
              <NqButton v-for="q in props.popularSearches" :key="q" size="sm" variant="secondary" @click="emit('search', q)">{{ q }}</NqButton>
            </div>
          </div>
          <template #actions><NqButton variant="primary" @click="setFilters(listingClear(filters, false))">{{ t.resetFilters }}</NqButton></template>
        </NqEmptyState>
        <template v-else>
          <ul data-slot="store-listing-grid" :data-view="view" :class="view === 'grid' ? cn('grid', GRID[density]) : 'flex flex-col gap-4 sm:gap-6'">
            <li v-for="(p, i) in visible" :key="p.id" :class="cn('min-w-0', view === 'list' && 'border-b border-border pb-4 last:border-b-0 sm:pb-6')">
              <NqStoreProductCard
                :product="p"
                :currency="currency"
                :layout="view"
                :priority="i < 4"
                :href="props.getHref ? props.getHref(p) : undefined"
                :wishlisted="wish.includes(p.id)"
                :labels="props.labels"
                v-bind="{
                  ...(props.compare ? { compared: compareIds.includes(p.id), onToggleCompare: () => toggleCompare(p) } : {}),
                  ...(hasAdd ? { onAddToCart: addToCart } : {}),
                }"
                @toggle-wishlist="onWish"
                @quick-view="openQuick"
                @navigate="emit('navigate', $event)"
              />
            </li>
          </ul>
          <template v-if="props.paging === 'pages'">
            <div v-if="pg.pageCount > 1" class="mt-8 flex flex-col items-center gap-2">
              <p class="text-caption text-muted-foreground">{{ fillTemplate(t.showing, { from: fmt(pg.from), to: fmt(pg.to), total: fmt(pg.total) }) }}</p>
              <NqPagination :page="pg.page" :page-count="pg.pageCount" :label="t.pagination" @page-change="goPage" />
            </div>
          </template>
          <div v-else-if="visible.length < total" class="mt-8 flex flex-col items-center gap-2">
            <p class="text-caption text-muted-foreground">{{ fillTemplate(t.loadedOf, { n: fmt(visible.length), total: fmt(total) }) }}</p>
            <NqLoadMore @click="presses++">{{ t.loadMore }}</NqLoadMore>
          </div>
        </template>
      </div>
    </div>

    <NqStoreFilterSheet v-model:open="sheet" :products="props.products" :filters="filters" :category-tree="props.categoryTree" :currency="currency" :labels="props.labels" @apply="setFilters" />
    <NqStoreQuickView
      v-model:open="quickOpen"
      :product="quick"
      :currency="currency"
      :href="quick && props.getHref ? props.getHref(quick) : undefined"
      :labels="props.labels"
      v-bind="hasAdd ? { onAddToCart: addToCart } : {}"
    />
    <template v-if="props.compare">
      <NqStoreCompareTray :products="comparedProducts" :max="props.compareMax" :labels="props.labels" @remove="(p) => setCompare(compareIds.filter((x) => x !== p.id))" @clear="setCompare([])" @compare="compareOpen = true" />
      <NqStoreCompareDialog
        v-model:open="compareOpen"
        :products="comparedProducts"
        :currency="currency"
        :labels="props.labels"
        v-bind="hasCompareAdd ? { onAddToCart: (p: CommerceProduct) => emit('compareAddToCart', p) } : {}"
        @remove="(p) => setCompare(compareIds.filter((x) => x !== p.id))"
      />
    </template>
  </div>
</template>
