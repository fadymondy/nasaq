{{-- <x-nq::store-account.recently-viewed :ids="['p1', 'p2']" :products="$catalogue" currency="USD" @nq-open-product="go($event.detail.product)" />
     Products the shopper looked at, newest first, with a way to drop one or clear the list. ids: product ids, most recent first. Ids no longer in the catalogue are skipped.
     products: the catalogue (CommerceProduct shape). currency: ISO 4217 (USD, or SAR in Arabic). loading: skeleton. labels: override strings by key.
     Events from the root: nq-open-product { product }, nq-remove { id }, nq-clear. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['ids' => [], 'products' => [], 'currency' => null, 'loading' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = ['ids' => array_values($ids), 'products' => array_values($products), 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t, 'loading' => (bool) $loading];
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'store-recently-viewed') }}" aria-label="{{ $t['recentTitle'] }}" x-data="nqStoreRecentlyViewed(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3') }}>
    <x-nq::button type="button" size="sm" variant="ghost" class="self-end" x-show="any" style="display: none" x-on:click="clearAll()">{{ $t['clearAll'] }}</x-nq::button>
    @if ($loading)
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4" aria-busy="true">
            <x-nq::states.skeleton class="h-48" />
            <x-nq::states.skeleton class="h-48" />
            <x-nq::states.skeleton class="h-48" />
        </div>
    @else
        <x-nq::states icon="clock" :title="$t['recentEmpty']" :description="$t['recentEmptyText']" x-show="shown.length === 0" style="display: none" />
        <ul class="m-0 grid list-none grid-cols-2 gap-3 p-0 sm:grid-cols-3 lg:grid-cols-4" x-show="shown.length > 0">
            <template x-for="product in shown" x-bind:key="product.id">
                <li class="group relative flex flex-col gap-2 rounded-card border border-border bg-card p-2">
                    <button type="button" x-bind:aria-label="viewLabel(product)" x-on:click="open(product)" class="flex flex-col gap-2 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                        <span class="flex aspect-square items-center justify-center overflow-hidden rounded-control bg-secondary">
                            <img x-show="product.images[0]" x-bind:src="product.images[0] ? product.images[0].src : ''" alt="" class="size-full object-cover" />
                            <x-lucide-image-off x-show="! product.images[0]" aria-hidden="true" class="size-6 text-muted-foreground" />
                        </span>
                        <span class="line-clamp-2 text-body-sm font-medium" x-text="product.name"></span>
                        <span class="text-body-sm text-muted-foreground tabular-nums" x-text="money(minPrice(product))"></span>
                    </button>
                    <x-nq::button type="button" size="icon-sm" variant="secondary" x-bind:aria-label="removeLabel(product)" class="absolute end-3 top-3" x-on:click="remove(product)">
                        <x-lucide-x aria-hidden="true" />
                    </x-nq::button>
                </li>
            </template>
        </ul>
    @endif
</section>
