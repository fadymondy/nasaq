{{-- <x-nq::store-merch.product-carousel title="Recently viewed" :products="$products" currency="USD" href-pattern="/p/{slug}" />
     A scroll-snapping row of storefront product cards: related products, recently viewed, new arrivals. Swipes and arrow keys mirror in RTL.
     products: the arrays store-listing.product-card takes. currency: default USD, or SAR in Arabic. title: heading (default "You may also like").
     label: plain-text name for the carousel region. view-all-href: a link beside the heading. per-view: slides at large widths, 2 to 6 (default 4).
     href-pattern: the product link, with {id} and {slug}. wishlist-ids: ids shown as saved. quick-view, add: passed to the cards. labels: string overrides.
     The cards raise nq-add-to-cart, nq-quick-view, nq-wishlist-change and nq-navigate.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-merch._strings')
@props(['products' => [], 'currency' => null, 'title' => null, 'label' => null, 'viewAllHref' => null, 'perView' => 4, 'hrefPattern' => null, 'wishlistIds' => [], 'quickView' => null, 'add' => true, 'labels' => null])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $heading = $title ?? nq_merch_t('relatedProducts', [], $labels);
    $name = $label ?? $heading;
    $hid = 'store-car-'.preg_replace('/\W+/', '-', $name);
    $basis = [2 => 'lg:basis-1/2', 3 => 'lg:basis-1/3', 4 => 'lg:basis-1/4', 5 => 'lg:basis-1/5', 6 => 'lg:basis-1/6'][(int) $perView] ?? 'lg:basis-1/4';
@endphp
@if (count($products))
    <section data-slot="{{ $attributes->get('data-slot', 'store-product-carousel') }}" aria-labelledby="{{ $hid }}" {{ $attributes->except('data-slot') }}>
        <div class="mb-4 flex items-end justify-between gap-4">
            <h2 id="{{ $hid }}" class="text-h2 text-foreground">{{ $heading }}</h2>
            @if ($viewAllHref)
                <x-nq::button variant="link" :href="$viewAllHref">
                    {{ nq_merch_t('viewAll', [], $labels) }}
                    <x-nq::icon name="arrow-right" :directional="true" />
                </x-nq::button>
            @endif
        </div>
        <x-nq::carousel :label="nq_merch_t('carouselOf', ['title' => $name], $labels)" class="relative">
            <x-nq::carousel.content>
                @foreach (array_values($products) as $i => $p)
                    <x-nq::carousel.item class="basis-[70%] snap-start sm:basis-1/3 {{ $basis }}">
                        <x-nq::store-listing.product-card :product="$p" :currency="$code" :priority="$i < (int) $perView" :href-pattern="$hrefPattern" :wishlisted="in_array($p['id'], $wishlistIds, true)" :quick-view="$quickView" :add="$add" />
                    </x-nq::carousel.item>
                @endforeach
            </x-nq::carousel.content>
            <x-nq::carousel.previous />
            <x-nq::carousel.next />
        </x-nq::carousel>
    </section>
@endif
