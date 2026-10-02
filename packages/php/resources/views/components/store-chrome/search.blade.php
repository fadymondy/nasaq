{{-- <x-nq::store-chrome.search :products="$products" :category-tree="$tree" currency="USD" :popular="['tee', 'hoodie']" />
     The store search box with autocomplete: matching categories and products (image, name with the match emphasised, price), recent and popular
     searches on focus. Arrow keys move, Enter picks, Escape closes. A real ARIA combobox. Needs the Alpine runtime (@nasaqScripts).
     products: the catalogue (same shape as <x-nq::store-listing>; prices in minor units). category-tree: [['id', 'label', 'children' => [...]]].
     currency: ISO code; adds a price to product suggestions. recent / popular: lists of searches. query: the starting text. loading: spinner.
     product-hrefs: ['productId' => '/p/tee'] makes picking a product follow its page. placeholder, labels: override any string.
     Events: nq-store-search { query }; nq-store-select-product { product } and nq-store-select-category { categoryId, label } (cancelable:
     preventDefault() means your page handled it; otherwise the href is followed or the name searched); nq-store-recent-change { recent }. --}}
@include('nasaq::components.store-chrome._strings')
@props(['products' => [], 'categoryTree' => [], 'currency' => null, 'currencyExponent' => 2, 'recent' => [], 'popular' => [], 'query' => '', 'loading' => false, 'productHrefs' => [], 'placeholder' => null, 'labels' => []])
@php
    $L = nq_sch_all((array) $labels);
    $locale = \Nasaq\Nasaq::rtl() ? 'ar' : str_replace('_', '-', app()->getLocale());
    $cfg = [
        'products' => array_values((array) $products), 'tree' => array_values((array) $categoryTree), 'currency' => $currency ? strtoupper($currency) : null, 'exponent' => (int) $currencyExponent,
        'recent' => array_values((array) $recent), 'popular' => array_values((array) $popular), 'query' => (string) $query, 'loading' => (bool) $loading, 'hrefs' => (object) $productHrefs,
        'locale' => $locale, 'labels' => $L,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-search') }}" x-data="nqStoreSearch(@js($cfg))" x-on:focusout="onFocusout($event)"
    {{ $attributes->except('data-slot')->cn('relative w-full') }}>
    <form role="search" aria-label="{{ $L['searchLabel'] }}" x-on:submit.prevent="submit()">
        <x-nq::input-group>
            <x-nq::input-group.addon>
                <span x-show="loading" class="contents" @unless ($loading) style="display: none" @endunless><x-lucide-loader-2 aria-hidden="true" class="size-4 animate-spin motion-reduce:animate-none" /></span>
                <span x-show="!loading" class="contents" @if ($loading) style="display: none" @endif><x-lucide-search aria-hidden="true" class="size-4" /></span>
            </x-nq::input-group.addon>
            <x-nq::input-group.input x-ref="input" type="search" role="combobox" autocomplete="off" enterkeyhint="search" aria-autocomplete="list" aria-haspopup="listbox"
                aria-label="{{ $L['searchLabel'] }}" placeholder="{{ $placeholder ?? $L['searchPlaceholder'] }}" class="[&::-webkit-search-cancel-button]:hidden"
                x-model="query" x-bind:aria-expanded="showList" x-bind:aria-controls="listId" x-bind:aria-activedescendant="activeId"
                x-on:input="onInput()" x-on:focus="open = true" x-on:click="open = true" x-on:keydown="onKeydown($event)" />
            <x-nq::input-group.addon align="end" x-show="query" style="display: none">
                <button type="button" aria-label="{{ $L['clearSearch'] }}" x-on:click="clear()"
                    class="inline-flex size-6 items-center justify-center rounded-full outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-nq-focus"><x-lucide-x aria-hidden="true" class="size-4" /></button>
            </x-nq::input-group.addon>
        </x-nq::input-group>
    </form>
    <p role="status" aria-live="polite" class="sr-only" x-text="liveText"></p>

    <div data-slot="store-search-popup" x-show="showList" style="display: none" x-on:mousedown.prevent
        class="absolute inset-x-0 top-full z-40 mt-1.5 max-h-[min(28rem,70dvh)] overflow-y-auto rounded-floating border border-border bg-popover p-1.5 text-popover-foreground shadow-floating">
        <ul role="listbox" aria-label="{{ $L['suggestions'] }}" x-bind:id="listId" class="m-0 flex list-none flex-col p-0">
            <template x-for="g in groups" x-bind:key="g.kind">
                <li role="presentation" class="contents">
                    <ul role="presentation" class="m-0 flex list-none flex-col p-0">
                        <li role="presentation" class="flex items-center justify-between px-2.5 pt-2 pb-1 text-caption font-medium text-muted-foreground">
                            <span x-text="g.title"></span>
                            <button type="button" x-show="g.kind === 'recent' ? !q : false" style="display: none" x-on:click="clearRecent()"
                                class="rounded-sm text-caption outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus">{{ $L['clearRecent'] }}</button>
                        </li>
                        <template x-for="r in g.rows" x-bind:key="r.key">
                            <li role="option" x-bind:id="uid + '-opt-' + r.i" x-bind:aria-selected="String(r.i === active)" x-bind:data-active="r.i === active ? '' : null"
                                x-on:mousemove="active = r.i" x-on:click.prevent="choose(r.i)"
                                x-bind:class="r.i === active ? 'bg-nq-selected' : ''"
                                class="flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-1.5 text-body-sm">
                                <template x-if="r.hasProduct">
                                    <span class="contents">
                                        <span class="size-10 shrink-0 overflow-hidden rounded-control bg-secondary"><x-nq::store-listing.product-image src-expr="r.image" /></span>
                                        <span class="flex min-w-0 flex-1 flex-col">
                                            <span class="truncate text-foreground"><template x-for="s in r.segments"><span x-text="s.text" x-bind:class="s.match ? 'font-semibold text-foreground' : ''"></span></template></span>
                                            <span x-show="r.brand" x-text="r.brand" class="truncate text-caption text-muted-foreground"></span>
                                        </span>
                                        <bdi x-show="r.priceText" x-text="r.priceText" class="shrink-0 text-body-sm font-medium text-foreground tabular-nums"></bdi>
                                    </span>
                                </template>
                                <template x-if="!r.hasProduct">
                                    <span class="contents">
                                        <span aria-hidden="true" class="inline-flex size-6 shrink-0 items-center justify-center text-muted-foreground">
                                            <span x-show="r.kind === 'recent'" class="contents"><x-lucide-clock class="size-4" /></span>
                                            <span x-show="r.kind === 'popular'" class="contents"><x-lucide-trending-up class="size-4" /></span>
                                            <span x-show="r.kind === 'category'" class="contents"><x-lucide-search class="size-4" /></span>
                                        </span>
                                        <span class="min-w-0 flex-1 truncate"><template x-for="s in r.segments"><span x-text="s.text" x-bind:class="s.match ? 'font-semibold text-foreground' : ''"></span></template></span>
                                        <span x-show="r.note" x-text="r.note" class="truncate text-caption text-muted-foreground"></span>
                                    </span>
                                </template>
                            </li>
                        </template>
                    </ul>
                </li>
            </template>
            <template x-if="submitRow">
                <li role="option" x-bind:id="uid + '-opt-' + submitRow.i" x-bind:aria-selected="String(submitRow.i === active)" x-on:mousemove="active = submitRow.i" x-on:click="run(query)"
                    x-bind:class="submitRow.i === active ? 'bg-nq-selected' : ''"
                    class="mt-1 flex cursor-pointer items-center gap-2 rounded-control border-t border-border px-2.5 py-2 text-body-sm">
                    <x-lucide-search aria-hidden="true" class="size-4 text-muted-foreground" />
                    <bdi x-text="submitRow.label"></bdi>
                </li>
            </template>
            <li x-show="noSuggestions" style="display: none" role="presentation" class="px-2.5 py-2 text-body-sm text-muted-foreground" x-text="noSuggestionsText"></li>
        </ul>
    </div>
</div>
