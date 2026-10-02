{{-- <x-nq::store-account.wishlist :items="$saved" :products="$catalogue" currency="USD" @nq-move-to-cart="add($event.detail.entry)" />
     Saved products with live availability. Move an item to the cart, ask to be told when a sold-out item returns.
     items: [['id', 'productId', 'variantId', 'addedAt', 'notify'?, 'priceWhenSaved'?]]. products: the catalogue (CommerceProduct shape). currency: ISO 4217 (USD, or SAR in Arabic). loading / error: states.
     Events from the root: nq-move-to-cart { entry }, nq-toggle-notify { item }, nq-remove { item }, nq-open-product { product }, nq-retry. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['items' => [], 'products' => [], 'currency' => null, 'loading' => false, 'error' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'items' => array_values($items), 'products' => array_values($products), 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en',
        't' => $t, 'loading' => (bool) $loading, 'error' => (bool) $error,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-wishlist') }}" x-data="nqStoreWishlist(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($error)
        <x-nq::states :title="$t['loadError']" icon="triangle-alert">
            <x-slot:actions>
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button>
            </x-slot:actions>
        </x-nq::states>
    @else
        <section aria-label="{{ $t['wishlistTitle'] }}" class="flex min-w-0 flex-col gap-4">
            <p role="status" x-show="returned !== ''" style="display: none" class="m-0 flex items-center gap-2 rounded-card border border-border bg-secondary px-3 py-2 text-body-sm font-medium">
                <x-lucide-bell-ring aria-hidden="true" class="size-4" />
                <span x-text="returned"></span>
            </p>
            @if ($loading)
                <div class="grid gap-3 sm:grid-cols-2" aria-busy="true">
                    <x-nq::states.skeleton class="h-28" />
                    <x-nq::states.skeleton class="h-28" />
                </div>
            @else
                <x-nq::states icon="heart" :title="$t['wishlistEmpty']" :description="$t['wishlistEmptyText']" x-show="entries.length === 0" style="display: none" />
                <ul class="m-0 grid list-none gap-3 p-0 sm:grid-cols-2" x-show="entries.length > 0">
                    <template x-for="entry in entries" x-bind:key="entry.item.id">
                        <li class="flex gap-3 rounded-card border border-border bg-card p-3">
                            <button type="button" x-bind:disabled="! entry.product" x-bind:aria-label="entry.product ? entry.product.name : null" x-on:click="openProduct(entry)"
                                class="flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-nq-focus">
                                <img x-show="imageOf(entry) !== ''" x-bind:src="imageOf(entry)" alt="" class="size-full object-cover" x-bind:class="entry.availability === 'out' ? 'opacity-60' : ''" />
                                <x-lucide-image-off x-show="imageOf(entry) === ''" aria-hidden="true" class="size-6 text-muted-foreground" />
                            </button>
                            <div class="flex min-w-0 flex-1 flex-col gap-1.5">
                                <span class="truncate font-medium" x-text="entry.product ? entry.product.name : '-'"></span>
                                <span x-show="entry.variant" class="flex flex-wrap items-baseline gap-x-2 text-body-sm">
                                    <span class="font-semibold tabular-nums" x-text="money(entry.variant ? entry.variant.price : 0)"></span>
                                    <template x-if="entry.priceDrop > 0">
                                        <span class="flex items-baseline gap-2">
                                            <span x-bind:class="chipClass('success')" class="inline-flex h-5 items-center rounded-[4px] border px-1.5 text-caption font-medium">{{ $t['priceDropped'] }}</span>
                                            <span class="text-muted-foreground line-through"><span class="sr-only">{{ $t['was'] }} </span><span class="tabular-nums" x-text="money(entry.item.priceWhenSaved)"></span></span>
                                        </span>
                                    </template>
                                </span>
                                <span class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
                                    <span x-bind:class="chipClass(badge(entry).variant)" x-text="badge(entry).label" class="inline-flex h-5 items-center rounded-[4px] border px-1.5 text-caption font-medium"></span>
                                    <span>{{ $t['savedOn'] }} <span x-text="date(entry.item.addedAt)"></span></span>
                                </span>
                                <div class="mt-auto flex flex-wrap items-center gap-2">
                                    <x-nq::button type="button" size="sm" variant="primary" x-show="entry.canMoveToCart" x-on:click="moveToCart(entry)">
                                        <x-lucide-shopping-cart aria-hidden="true" />
                                        {{ $t['moveToCart'] }}
                                    </x-nq::button>
                                    <x-nq::button type="button" size="sm" variant="secondary" x-show="entry.canNotify" x-bind:aria-pressed="pressed(entry)" x-on:click="notify(entry)">
                                        <x-lucide-bell aria-hidden="true" x-show="! entry.item.notify" />
                                        <x-lucide-bell-ring aria-hidden="true" x-show="entry.item.notify" />
                                        <span x-text="entry.item.notify ? t.notifying : t.notifyMe"></span>
                                    </x-nq::button>
                                    <x-nq::button type="button" size="icon-sm" variant="ghost" x-bind:aria-label="removeLabel(entry)" x-on:click="remove(entry)">
                                        <x-lucide-trash-2 aria-hidden="true" />
                                    </x-nq::button>
                                </div>
                            </div>
                        </li>
                    </template>
                </ul>
                <p class="m-0 text-caption text-muted-foreground" x-show="entries.length > 0"><span class="tabular-nums" x-text="num(entries.length)"></span> {{ $t['items'] }}</p>
            @endif
        </section>
    @endif
</div>
