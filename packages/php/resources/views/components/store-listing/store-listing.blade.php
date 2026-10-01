{{-- <x-nq::store-listing :products="$products" currency="USD" :category-tree="$tree" x-on:nq-add-to-cart="cart.add($event.detail.variantId, $event.detail.quantity)" />
     A product listing: facet sidebar with counts, active chips, sort, grid / list and density, result count, pages or load more, empty results with ways
     to relax the filters, a filter sheet on phones, quick view and compare. All from a products array; the page owns nothing else.
     The first paint is server-rendered (every product card once, in catalogue order, with the first page showing); Alpine takes over and
     filters, sorts, pages and re-renders it live. Needs the Alpine runtime (@nasaqScripts).
     products: arrays shaped like product-detail's product, plus slug?, category? (an id), tags?. Prices are minor units. currency (USD, or SAR in Arabic, when omitted),
     currency-exponent. category-tree: [[id, label, children?]]. filters: a starting filter set ['query', 'category', 'brands', 'options' => [optionId => [valueId]],
     'price' => [min, max], 'minRating', 'inStock', 'onSale']. sort (relevance), sorts (all), view (grid | list), density (comfortable | compact),
     page-size (12), paging (pages | load-more), title, show-query-chip (false), loading, error, popular-searches, compare (true), compare-max (4),
     compare-add (an Add to cart in the compare table), wishlist-ids, href-pattern ("/p/{slug}" with {id} / {slug}), option-ids.
     Events (bubbling): nq-add-to-cart { productId, variantId, quantity, product, variant, wait(promise) }, nq-wishlist-change { productId, wishlisted },
     nq-quick-view { productId }, nq-navigate { productId, href } (cancelable), nq-filters-change { filters }, nq-sort-change { sort }, nq-search { query },
     nq-retry, nq-compare-change { ids }, nq-compare-add-to-cart { productId, product }. --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@props([
    'products' => [], 'currency' => null, 'currencyExponent' => null, 'categoryTree' => [], 'filters' => null, 'sort' => 'relevance',
    'sorts' => ['relevance', 'popular', 'rating', 'price-asc', 'price-desc', 'discount', 'name'], 'view' => 'grid', 'density' => 'comfortable',
    'pageSize' => 12, 'paging' => 'pages', 'title' => null, 'showQueryChip' => false, 'loading' => false, 'error' => false, 'popularSearches' => [],
    'compare' => true, 'compareMax' => 4, 'compareAdd' => false, 'wishlistIds' => [], 'hrefPattern' => null, 'optionIds' => null,
])
@php
    $products = array_values($products);
    $tree = array_values($categoryTree);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $f = nq_sl_filters($filters);
    $index = nq_sl_label_index($products, $tree);
    $matches = nq_sl_sort(nq_sl_filter($products, $f, $tree), $sort, $f['query']);
    $total = count($matches);
    $pg = nq_sl_page($total, 1, (int) $pageSize);
    $visible = array_slice($matches, 0, (int) $pageSize);
    $visibleIds = array_column($visible, 'id');
    $position = array_flip(array_column($matches, 'id'));
    $facets = nq_sl_facets($products, $f, $tree, $index);
    $count = collect([$f['category'] !== null, count($f['brands']) > 0, count($f['options']) > 0, $f['price'] !== null, $f['minRating'] !== null, $f['inStock'], $f['onSale'], trim($f['query']) !== ''])->filter()->count();
    $sheetCount = count(nq_sl_filter($products, $f, $tree));
    $relax = [];
    $grid = ['comfortable' => 'grid-cols-2 gap-x-3 gap-y-6 md:grid-cols-3 md:gap-x-4', 'compact' => 'grid-cols-2 gap-x-3 gap-y-5 md:grid-cols-3 xl:grid-cols-4'];
    $gridCls = $view === 'grid' ? 'grid '.$grid[$density] : 'flex flex-col gap-4 sm:gap-6';
    $wish = array_values($wishlistIds);
    $config = [
        'products' => $products, 'tree' => $tree, 'currency' => $code, 'exponent' => $exp, 'filters' => $f, 'sort' => $sort, 'sorts' => array_values($sorts),
        'view' => $view, 'density' => $density, 'pageSize' => (int) $pageSize, 'paging' => $paging, 'compare' => (bool) $compare, 'compareMax' => (int) $compareMax,
        'wishlistIds' => $wish, 'showQueryChip' => (bool) $showQueryChip, 'hrefPattern' => $hrefPattern,
    ];
    $emptyTitle = new \Illuminate\Support\HtmlString('<span x-text="emptyTitle">'.e($f['query'] !== '' ? nq_sl_t('noResultsFor', ['query' => $f['query']]) : nq_sl_t('noResults')).'</span>');
    $pageCount = $pg['pageCount'];
    $lastVisible = $visible ? end($visible)['id'] : null;
@endphp
<div data-slot="store-listing" x-data="nqStoreListing(@js($config))" x-on:nq-wishlist-change="onWish($event)" {{ $attributes->cn('flex min-w-0 flex-col gap-4') }}>
    <div x-ref="top" class="scroll-mt-20"></div>
    @if ($title)
        <h1 class="text-h1 text-foreground">{{ $title }}</h1>
    @endif
    <div class="grid gap-x-8 gap-y-4 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <aside class="hidden lg:block" aria-label="{{ nq_sl_t('filters') }}">
            <x-nq::store-listing.facet-sidebar :facets="$facets" :filters="$f" :currency="$code" :currency-exponent="$exp" :option-ids="$optionIds" />
        </aside>
        <div class="flex min-w-0 flex-col gap-4">
            <x-nq::store-listing.toolbar :total="$total" :sort="$sort" :sorts="$sorts" :view="$view" :density="$density" :filter-count="$count" />
            <x-nq::store-listing.active-chips :filters="$f" :index="$index" :currency="$code" :currency-exponent="$exp" :include-query="$showQueryChip" />
            <p role="status" x-show="notice" style="display: none" class="text-body-sm text-nq-warning-text" x-text="notice"></p>

            @if ($error)
                <x-nq::states.error :title="nq_sl_t('errorTitle')" :description="nq_sl_t('errorHint')">
                    <x-slot:actions><x-nq::button variant="primary" x-on:click="$dispatch('nq-retry')">{{ nq_sl_t('retry') }}</x-nq::button></x-slot:actions>
                </x-nq::states.error>
            @elseif ($loading)
                <div role="status" aria-label="{{ nq_sl_t('loading') }}" class="grid {{ $grid[$density] }}">
                    @for ($i = 0; $i < 8; $i++)
                        <div class="flex flex-col gap-2">
                            <x-nq::states.skeleton class="aspect-[4/5] w-full rounded-card" />
                            <x-nq::states.skeleton class="h-4 w-3/4" />
                            <x-nq::states.skeleton class="h-4 w-1/3" />
                        </div>
                    @endfor
                </div>
            @else
                <div x-show="empty" @if ($total > 0) style="display: none" @endif>
                    <x-nq::states.empty :title="$emptyTitle" :description="nq_sl_t('noResultsHint')">
                        <x-slot:actions><x-nq::button variant="primary" x-on:click="resetFilters()">{{ nq_sl_t('resetFilters') }}</x-nq::button></x-slot:actions>
                        <div class="flex flex-col items-center gap-2" x-show="relaxations.length" style="display: none">
                            <p class="text-caption text-muted-foreground">{{ nq_sl_t('tryRemoving') }}</p>
                            <div class="flex flex-wrap justify-center gap-2">
                                <template x-for="r in relaxations" x-bind:key="r.chip.id">
                                    <button type="button" x-on:click="removeChip(r.chip)"
                                        class="inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus">
                                        <bdi x-text="chipLabel(r.chip)"></bdi>
                                        <x-nq::badge variant="neutral"><span x-text="n(r.count)"></span></x-nq::badge>
                                    </button>
                                </template>
                            </div>
                        </div>
                        @if (count($popularSearches))
                            <div class="flex flex-col items-center gap-2">
                                <p class="text-caption text-muted-foreground">{{ nq_sl_t('didYouMean') }}</p>
                                <div class="flex flex-wrap justify-center gap-2">
                                    @foreach ($popularSearches as $q)
                                        <x-nq::button size="sm" variant="secondary" x-on:click="search('{{ addslashes($q) }}')">{{ $q }}</x-nq::button>
                                    @endforeach
                                </div>
                            </div>
                        @endif
                    </x-nq::states.empty>
                </div>

                <div x-show="!empty" @if ($total === 0) style="display: none" @endif class="contents">
                    <ul data-slot="store-listing-grid" data-view="{{ $view }}" x-bind:data-view="view" class="{{ $gridCls }}"
                        x-bind:class="{ 'grid': view === 'grid', 'flex flex-col gap-4 sm:gap-6': view === 'list', @js($grid['comfortable']): view === 'grid' && density === 'comfortable', @js($grid['compact']): view === 'grid' && density === 'compact' }">
                        @foreach ($products as $i => $p)
                            @php
                                $shown = in_array($p['id'], $visibleIds, true);
                                $isLast = $view === 'list' && $p['id'] === $lastVisible;
                            @endphp
                            <li x-show="isShown(@js($p['id']))" style="order: {{ $position[$p['id']] ?? 0 }};{{ $shown ? '' : ' display: none;' }}"
                                x-effect="$el.style.order = orderOf(@js($p['id']))"
                                x-bind:class="{ 'border-b border-border pb-4 sm:pb-6': view === 'list' && !isLast(@js($p['id'])), 'pb-4 sm:pb-6': view === 'list' && isLast(@js($p['id'])) }"
                                class="min-w-0 {{ $view === 'list' ? ($isLast ? 'pb-4 sm:pb-6' : 'border-b border-border pb-4 sm:pb-6') : '' }}">
                                <x-nq::store-listing.product-card :product="$p" :currency="$code" :currency-exponent="$exp" :layout="$view" :compare="$compare" :quick-view="true"
                                    :wishlisted="in_array($p['id'], $wish, true)" :href-pattern="$hrefPattern" :priority="$i < 4" />
                            </li>
                        @endforeach
                    </ul>

                    @if ($paging === 'pages')
                        <div class="mt-8 flex flex-col items-center gap-2" x-show="totalPages > 1" @if ($pageCount <= 1) style="display: none" @endif>
                            <p class="text-caption text-muted-foreground" x-text="showingText">{{ nq_sl_t('showing', ['from' => number_format($pg['from']), 'to' => number_format($pg['to']), 'total' => number_format($pg['total'])]) }}</p>
                            <x-nq::pagination :page-count="$pageCount" :page="1" :label="nq_sl_t('pagination')" x-model="page" x-effect="pageCount = totalPages" x-on:page-change="goPage($event.detail)" />
                        </div>
                    @else
                        <div class="mt-8 flex flex-col items-center gap-2" x-show="hasMore" @if ($total <= count($visible)) style="display: none" @endif>
                            <p class="text-caption text-muted-foreground" x-text="loadedText">{{ nq_sl_t('loadedOf', ['n' => number_format(count($visible)), 'total' => number_format($total)]) }}</p>
                            <x-nq::pagination.load-more x-on:click="loadMore()">{{ nq_sl_t('loadMore') }}</x-nq::pagination.load-more>
                        </div>
                    @endif
                </div>
            @endif
        </div>
    </div>

    <x-nq::store-listing.filter-sheet :facets="$facets" :filters="$f" :currency="$code" :currency-exponent="$exp" :option-ids="$optionIds" :count="$sheetCount" />
    <x-nq::store-listing.quick-view :currency="$code" :currency-exponent="$exp" />
    @if ($compare)
        <x-nq::store-listing.compare-tray />
        <x-nq::store-listing.compare-dialog :add="$compareAdd" />
    @endif
</div>
