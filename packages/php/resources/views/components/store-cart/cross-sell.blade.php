{{-- <x-nq::store-cart.cross-sell :products="$products" title="You might also like" />
     "You might also like": a carousel of product cards with a quick Add. Each card has a context menu with View product and Add. Add puts the product's first in-stock
     variant in the cart (a sold-out product has no Add button): it fires window "store-cart-add" { item, quantity: 1 }, which the cart page and mini cart listen for.
     View product fires "store-cart-open-product" { productId, name }. Without a cart on the page, listen for these yourself.
     products: the product-detail shape: id, name, category?, images [[src, alt?]], options, variants [[id, options, price (minor units), compareAt?, stock?, allowBackorder?, image?]].
     title replaces the heading. currency: USD, or SAR in Arabic, when omitted. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-cart._logic')
@props(['products' => [], 'currency' => null, 'title' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $heading = $title ?? $t('You might also like', 'قد يعجبك أيضًا');
    $products = array_values((array) $products);
    $cards = array_map(fn ($p) => ['id' => $p['id'], 'name' => $p['name'], 'item' => nq_cart_item_from_product($p)], $products);
@endphp
@if ($products)
    <section data-slot="{{ $attributes->get('data-slot', 'store-cross-sell') }}" x-data="nqStoreCrossSell(@js($cards))" x-id="['store-cross-sell']" x-bind:aria-labelledby="$id('store-cross-sell')"
        {{ $attributes->except('data-slot')->cn('flex flex-col gap-3') }}>
        <h2 x-bind:id="$id('store-cross-sell')" class="text-h3 font-semibold text-foreground">{{ $heading }}</h2>
        <x-nq::carousel :label="$heading" class="px-0">
            <x-nq::carousel.content class="-ms-4">
                @foreach ($products as $i => $p)
                    @php($image = $p['images'][0] ?? null)
                    <x-nq::carousel.item class="basis-3/4 ps-4 sm:basis-1/2 lg:basis-1/3">
                        <x-nq::context-menu>
                            <x-nq::context-menu.trigger class="@container">
                                <x-nq::product-card layout="tile" :name="$p['name']" :category="$p['category'] ?? null" class="w-full">
                                    <x-slot:artwork>
                                        <x-nq::store-cart.image fluid :size="320" :src="nq_cart_image_src($image)" :alt="nq_cart_image_alt($image) ?? $p['name']" class="aspect-[4/3] rounded-card" />
                                    </x-slot:artwork>
                                    <x-slot:price>
                                        <x-nq::price :amount="nq_cart_major(nq_cart_min_price($p), $code)" :currency="$code" size="sm" />
                                    </x-slot:price>
                                    @if ($cards[$i]['item'])
                                        <x-slot:action>
                                            <x-nq::button variant="secondary" size="sm" aria-label="{{ $t('Add '.$p['name'].' to cart', 'أضف '.$p['name'].' إلى السلة') }}" x-on:click="add({{ $i }})">
                                                <x-lucide-plus aria-hidden="true" />
                                                {{ $t('Add', 'أضف') }}
                                            </x-nq::button>
                                        </x-slot:action>
                                    @endif
                                </x-nq::product-card>
                            </x-nq::context-menu.trigger>
                            <x-nq::context-menu.content class="min-w-44">
                                <x-nq::context-menu.item x-on:click="openProduct({{ $i }})">
                                    <x-lucide-eye aria-hidden="true" />
                                    {{ $t('View product', 'عرض المنتج') }}
                                </x-nq::context-menu.item>
                                @if ($cards[$i]['item'])
                                    <x-nq::context-menu.item x-on:click="add({{ $i }})">
                                        <x-lucide-shopping-bag aria-hidden="true" />
                                        {{ $t('Add '.$p['name'].' to cart', 'أضف '.$p['name'].' إلى السلة') }}
                                    </x-nq::context-menu.item>
                                @endif
                            </x-nq::context-menu.content>
                        </x-nq::context-menu>
                    </x-nq::carousel.item>
                @endforeach
            </x-nq::carousel.content>
            <x-nq::carousel.previous />
            <x-nq::carousel.next />
        </x-nq::carousel>
    </section>
@endif
