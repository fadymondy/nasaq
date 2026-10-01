{{-- <x-nq::store-listing.product-card :product="$product" currency="USD" href="/p/tee" x-on:nq-add-to-cart="cart.add($event.detail.variantId)" />
     The storefront product card: image with a second image on hover, badges, wishlist heart, colour swatches that preview the variant image,
     a from-price, quick view and quick add (asks for any option still unchosen). Inside <x-nq::store-listing> it reads the listing's
     view (grid | list) and wishlist / compare state; on its own it keeps its own wishlist state and layout.
     product: the array product-detail takes (id, name, brand?, description?, badges?, rating?, images, options, variants), plus slug?. Prices are minor units.
     currency, currency-exponent. href: the product page. layout: grid | list. ratio: portrait (default) | square. wishlisted. compare: show the
     compare box (the listing turns it on). quick-view: show the quick-view button. add: show the add button (default true). max-swatches (5). priority: eager image.
     Events (bubbling from the control): nq-add-to-cart { productId, variantId, quantity, product, variant, wait(promise) } (a promise that rejects,
     or { error }, leaves the button as it was), nq-wishlist-change { productId, wishlisted }, nq-quick-view { productId },
     nq-navigate { productId, href }. The listing turns the compare box into nq-compare-change.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@include('nasaq::components.product-detail._logic')
@props(['product', 'currency' => null, 'currencyExponent' => null, 'href' => null, 'layout' => 'grid', 'ratio' => 'portrait', 'wishlisted' => false, 'compare' => null, 'quickView' => null, 'add' => true, 'maxSwatches' => 5, 'priority' => false, 'hrefPattern' => null])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $list = $layout === 'list';
    $options = $product['options'] ?? [];
    $selection = [];
    foreach ($options as $o) {
        if (count($o['values']) === 1) { $selection[$o['id']] = $o['values'][0]['id']; }
    }
    $variant = nq_pdp_find_variant($product, $selection);
    $soldOut = ! nq_sl_product_in_stock($product);
    $shown = $variant ?? nq_sl_cheapest($product);
    $percent = $variant ? nq_sl_discount($variant['price'], $variant['compareAt'] ?? null) : nq_sl_best_discount($product);
    $colour = collect($options)->first(fn ($o) => in_array($o['display'] ?? 'button', ['swatch', 'image'], true));
    $others = array_values(array_filter($options, fn ($o) => $o !== $colour && count($o['values']) > 1));
    $missing = collect($options)->first(fn ($o) => empty($selection[$o['id']]));
    $primary = $variant['image'] ?? ($product['images'][0]['src'] ?? '');
    $secondary = ! ($variant['image'] ?? null) ? ($product['images'][1]['src'] ?? '') : '';
    $name = $product['name'];
    $hasCompare = (bool) $compare;
    $hasQuick = (bool) $quickView;
    $hasAdd = (bool) $add;
    $canAdd = $hasAdd && ! $soldOut;
    $link = $href ?? ($hrefPattern ? str_replace(['{id}', '{slug}'], [rawurlencode($product['id']), rawurlencode($product['slug'] ?? $product['id'])], $hrefPattern) : '#'.($product['slug'] ?? $product['id']));
    $money = fn ($m) => nq_sl_money($m, $exp, $code);
    $addLabel = $missing && ! $list ? nq_sl_t('quickAdd') : ($variant && ! nq_sl_in_stock($variant) ? nq_sl_t('soldOut') : nq_sl_t('addToCart'));
    $range = ! $variant && nq_sl_has_price_range($product);
    $wishLabel = nq_sl_t($wishlisted ? 'wishlistRemove' : 'wishlistAdd', ['name' => $name]);
    $compareLabel = nq_sl_t('compareFor', ['name' => $name]);
    $config = ['product' => $product, 'layout' => $layout, 'currency' => $code, 'exponent' => $exp, 'href' => $href, 'wishlisted' => (bool) $wishlisted, 'compare' => $compare, 'quickView' => $quickView, 'add' => $hasAdd, 'maxSwatches' => (int) $maxSwatches];
    $ratioCls = $ratio === 'square' ? 'aspect-square w-full' : 'aspect-[4/5] w-full';
    $mediaList = 'aspect-square w-32 sm:w-52';
    $iconBtn = 'rounded-full bg-card/90 shadow-xs backdrop-blur-sm';
    $onSale = ($shown['compareAt'] ?? 0) > ($shown['price'] ?? 0);
@endphp
<div data-slot="store-product-card-menu" class="h-full min-w-0">
    <article data-slot="store-product-card" data-layout="{{ $layout }}" x-data="nqStoreCard(@js($config))" x-bind:data-layout="list ? 'list' : 'grid'"
        @if ($soldOut) data-sold-out @endif x-bind:data-sold-out="soldOut ? '' : undefined"
        x-bind:class="{ 'flex-row gap-4 sm:gap-6': list, 'flex-col gap-3': !list }"
        {{ $attributes->cn('group/card relative flex min-w-0', $list ? 'flex-row gap-4 sm:gap-6' : 'flex-col gap-3') }}>
        <div data-slot="store-product-card-media" x-on:click="navigate()"
            x-bind:class="{ '{{ $mediaList }}': list, '{{ $ratioCls }}': !list }"
            class="relative shrink-0 cursor-pointer overflow-hidden rounded-card bg-secondary {{ $list ? $mediaList : $ratioCls }}">
            <div class="contents">
                <img alt="{{ $name }}" x-bind:src="primarySrc" x-bind:alt="product.name" x-show="imgOk" @if (! $primary) style="display: none" @else src="{{ $primary }}" @endif
                    loading="{{ $priority ? 'eager' : 'lazy' }}" decoding="async" data-slot="store-image" x-on:error="failed = true"
                    x-bind:class="soldOut ? 'opacity-60' : ''" class="size-full object-cover {{ $soldOut ? 'opacity-60' : '' }}">
                <div role="img" aria-label="{{ $name }}" data-slot="store-image-placeholder" x-show="!imgOk" @if ($primary) style="display: none" @endif
                    class="flex size-full items-center justify-center bg-secondary text-muted-foreground"><x-lucide-image-off aria-hidden="true" class="size-6 opacity-60" /></div>
            </div>
            <div aria-hidden="true" x-show="secondarySrc" @if (! $secondary) style="display: none" @endif
                class="absolute inset-0 opacity-0 transition-opacity duration-200 ease-nq group-hover/card:opacity-100 motion-reduce:transition-none pointer-coarse:hidden">
                <x-nq::store-listing.product-image :src="$secondary ?: null" alt="" src-expr="secondarySrc" alt-expr="''" />
            </div>

            <div class="pointer-events-none absolute start-2 top-2 flex max-w-[70%] flex-col items-start gap-1">
                <span class="contents" x-show="soldOut" @unless ($soldOut) style="display: none" @endunless><x-nq::badge variant="neutral">{{ nq_sl_t('soldOut') }}</x-nq::badge></span>
                <span class="contents" x-show="percent > 0 && !soldOut" @unless ($percent > 0 && ! $soldOut) style="display: none" @endunless>
                    <x-nq::badge variant="danger"><bdi x-text="percentText">{{ nq_sl_t('percentOff', ['n' => $percent]) }}</bdi></x-nq::badge>
                </span>
                @foreach (array_slice($product['badges'] ?? [], 0, 2) as $b)
                    <x-nq::badge variant="accent">{{ $b }}</x-nq::badge>
                @endforeach
            </div>

            <div class="absolute end-2 top-2 flex flex-col gap-1.5" x-on:click.stop>
                <x-nq::button size="icon-sm" variant="secondary" aria-pressed="{{ $wishlisted ? 'true' : 'false' }}" aria-label="{{ $wishLabel }}"
                    x-bind:aria-pressed="isWish ? 'true' : 'false'" x-bind:aria-label="wishLabel" x-on:click="toggleWish()" class="{{ $iconBtn }}">
                    <x-lucide-heart class="{{ $wishlisted ? 'fill-current text-nq-danger' : '' }}" x-bind:class="{ 'fill-current text-nq-danger': isWish }" />
                </x-nq::button>
                <span class="contents" x-show="hasQuick" @unless ($hasQuick) style="display: none" @endunless>
                    <x-nq::button size="icon-sm" variant="secondary" aria-label="{{ nq_sl_t('quickViewFor', ['name' => $name]) }}" x-on:click="quickView()"
                        class="{{ $iconBtn }} opacity-0 transition-opacity duration-150 focus-visible:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100">
                        <x-lucide-eye />
                    </x-nq::button>
                </span>
            </div>

            @if ($canAdd)
                <div x-show="!list && canAdd" @if ($list) style="display: none" @endif x-on:click.stop
                    x-bind:class="(picking || status !== 'idle') ? 'opacity-100' : ''"
                    class="absolute inset-x-2 bottom-2 opacity-0 transition-opacity duration-150 focus-within:opacity-100 group-focus-within/card:opacity-100 group-hover/card:opacity-100 pointer-coarse:opacity-100">
                    <div x-show="picking && missing" style="display: none" role="group" x-bind:aria-label="missingText" class="flex flex-col gap-2 rounded-control border border-border bg-popover p-2 shadow-floating">
                        <div class="flex items-center justify-between gap-2">
                            <p class="text-caption font-medium text-foreground" x-text="missingText"></p>
                            <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ nq_sl_t('close') }}" x-on:click="picking = false" class="size-5"><span aria-hidden="true">×</span></x-nq::button>
                        </div>
                        <template x-for="o in (missing ? [missing] : [])" x-bind:key="o.id">
                            @include('nasaq::components.store-listing._option-picker', ['mode' => 'tpl', 'size' => 'sm'])
                        </template>
                    </div>
                    <div x-show="!(picking && missing)">
                        <x-nq::button variant="primary" size="sm" data-slot="store-product-card-add" x-on:click="quickAdd()" class="w-full"
                            x-bind:disabled="status === 'adding' || addDisabled" x-bind:aria-busy="status === 'adding' ? 'true' : undefined">
                            <x-lucide-check x-show="status === 'added'" style="display: none" />
                            <x-lucide-shopping-bag x-show="status !== 'added'" />
                            <span x-text="addLabel">{{ $addLabel }}</span>
                        </x-nq::button>
                    </div>
                </div>
            @endif
        </div>

        <div class="flex min-w-0 flex-1 flex-col gap-1.5 {{ $list ? 'justify-center' : '' }}" x-bind:class="{ 'justify-center': list }">
            @if (! empty($product['brand']))<p class="truncate text-caption text-muted-foreground">{{ $product['brand'] }}</p>@endif
            <h3 class="text-body font-medium text-foreground">
                <a href="{{ $link }}" x-bind:href="link" x-on:click="$dispatch('nq-navigate', { productId: product.id, href: link })"
                    class="line-clamp-2 rounded-sm outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ $name }}</a>
            </h3>
            @if (! empty($product['rating']))
                <x-nq::rating :value="$product['rating']['average']" :count="$product['rating']['count']" :count-label="nq_sl_t('reviews')" />
            @endif
            @if (! empty($product['description']))
                <p x-show="list" @unless ($list) style="display: none" @endunless class="line-clamp-2 max-w-prose text-body-sm text-muted-foreground">{{ $product['description'] }}</p>
            @endif
            @if ($shown)
                <span data-slot="store-price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-body text-foreground">
                    <span class="text-caption text-muted-foreground" x-show="fromText" x-text="fromText" @unless ($range) style="display: none" @endunless>{{ $range ? nq_sl_t('from') : '' }}</span>
                    <bdi class="font-medium tabular-nums" x-text="priceText">{{ $money($shown['price']) }}</bdi>
                    <s class="text-caption text-muted-foreground decoration-muted-foreground/60" x-show="compareText" @unless ($onSale) style="display: none" @endunless>
                        <span class="sr-only">{{ \Nasaq\Nasaq::t('was ', 'بدلًا من ') }}</span><bdi class="tabular-nums" x-text="compareText">{{ $onSale ? $money($shown['compareAt']) : '' }}</bdi>
                    </s>
                </span>
            @endif
            @if ($colour && count($colour['values']) > 1)
                @include('nasaq::components.store-listing._option-picker', ['mode' => 'ssr', 'product' => $product, 'opt' => $colour, 'selection' => $selection, 'size' => 'sm', 'max' => (int) $maxSwatches])
            @endif
            <template x-for="o in (colour && colour.values.length > 1 ? [colour] : [])" x-bind:key="o.id">
                @include('nasaq::components.store-listing._option-picker', ['mode' => 'tpl', 'size' => 'sm', 'max' => (int) $maxSwatches])
            </template>
            @if ($list)
                @foreach ($others as $o)
                    @include('nasaq::components.store-listing._option-picker', ['mode' => 'ssr', 'product' => $product, 'opt' => $o, 'selection' => $selection, 'size' => 'sm', 'max' => 99])
                @endforeach
            @endif
            <div x-show="list" @unless ($list) style="display: none" @endunless class="contents">
                <template x-for="o in otherOptions" x-bind:key="o.id">
                    @include('nasaq::components.store-listing._option-picker', ['mode' => 'tpl', 'size' => 'sm', 'max' => 99])
                </template>
                @if ($canAdd)
                    <div class="mt-1.5 flex flex-wrap items-center gap-2">
                        <x-nq::button variant="primary" size="sm" data-slot="store-product-card-add" x-on:click="quickAdd()" class="w-fit"
                            x-bind:disabled="status === 'adding' || addDisabled" x-bind:aria-busy="status === 'adding' ? 'true' : undefined">
                            <x-lucide-check x-show="status === 'added'" style="display: none" />
                            <x-lucide-shopping-bag x-show="status !== 'added'" />
                            <span x-text="addLabel">{{ $addLabel }}</span>
                        </x-nq::button>
                        <span class="contents" x-show="hasQuick" @unless ($hasQuick) style="display: none" @endunless>
                            <x-nq::button size="sm" variant="secondary" x-on:click="quickView()"><x-lucide-eye />{{ nq_sl_t('quickView') }}</x-nq::button>
                        </span>
                    </div>
                @endif
            </div>
            <label x-show="hasCompare" @unless ($hasCompare) style="display: none" @endunless class="mt-1 flex w-fit cursor-pointer items-center gap-2 text-caption text-muted-foreground">
                <x-nq::checkbox x-model="compareModel" aria-label="{{ $compareLabel }}" />
                {{ nq_sl_t('compare') }}
            </label>
            <span class="sr-only" role="status" aria-live="polite" x-text="liveText"></span>
        </div>
    </article>
</div>
