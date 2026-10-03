{{-- <x-nq::store-listing.quick-view />   Used inside <x-nq::store-listing>, which already includes it.
     A dialog with the gallery, options, quantity and add to cart for the product the listing opened (the card's eye button).
     currency, currency-exponent, low-stock-at (5), close-on-add (true: close after a successful add).
     Add to cart fires nq-add-to-cart { productId, variantId, quantity, product, variant, wait(promise) } from the dialog; a rejection keeps it open. --}}
@include('nasaq::components.store-listing._strings')
@props(['currency' => null, 'currencyExponent' => null, 'lowStockAt' => 5, 'closeOnAdd' => true, 'add' => true])
@php
    $config = ['currency' => $currency, 'exponent' => $currencyExponent !== null ? (int) $currencyExponent : null, 'lowStockAt' => (int) $lowStockAt, 'closeOnAdd' => (bool) $closeOnAdd];
    $config = array_filter($config, fn ($v) => $v !== null);
@endphp
<div x-data="nqStoreQuickView(@js((object) $config))" class="contents">
    <x-nq::dialog x-model="host.quickOpen">
        <x-nq::dialog.content data-slot="store-quick-view" class="max-w-3xl p-0 sm:p-0" :close-label="nq_sl_t('close')">
            <div class="grid gap-0 md:grid-cols-2" x-show="product" style="display: none">
                <div class="flex flex-col gap-2 p-4 md:p-6" role="group" aria-label="{{ nq_sl_t('gallery') }}">
                    <div class="aspect-square overflow-hidden rounded-card bg-secondary">
                        <x-nq::store-listing.product-image src-expr="currentSrc" alt-expr="product ? product.name : ''" eager />
                    </div>
                    <div x-show="gallery.length > 1" style="display: none" class="flex gap-2 overflow-x-auto">
                        <template x-for="(img, i) in gallery" x-bind:key="img.src + '-' + i">
                            <button type="button" x-bind:aria-label="s('showImage', { n: n(i + 1) })" x-bind:aria-current="i === image ? 'true' : undefined" x-on:click="image = i"
                                x-bind:class="i === image ? 'border-primary' : 'border-border'"
                                class="size-14 shrink-0 overflow-hidden rounded-control border bg-secondary outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                                <x-nq::store-listing.product-image src-expr="img.src" alt-expr="''" />
                            </button>
                        </template>
                    </div>
                </div>

                <div class="flex min-w-0 flex-col gap-4 p-4 pt-0 md:p-6 md:ps-2">
                    <div class="flex flex-col gap-1.5 pe-8">
                        <p x-show="product && product.brand" class="text-caption text-muted-foreground" x-text="product ? product.brand : ''"></p>
                        <x-nq::dialog.title><span x-text="product ? product.name : ''"></span></x-nq::dialog.title>
                        <x-nq::dialog.description class="sr-only">{{ nq_sl_t('quickViewTitle') }}</x-nq::dialog.description>
                        <span x-show="ratingText" data-slot="rating" class="inline-flex items-center gap-1.5 text-caption text-muted-foreground">
                            <x-lucide-star aria-hidden="true" class="size-3.5 shrink-0 fill-nq-accent text-nq-accent" />
                            <bdi class="tabular-nums" x-text="ratingText"></bdi>
                        </span>
                    </div>
                    <span data-slot="store-price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-body-sm text-foreground">
                        <span class="text-caption text-muted-foreground" x-show="fromText" x-text="fromText"></span>
                        <bdi class="text-h2 font-semibold tracking-tight tabular-nums" x-text="priceText"></bdi>
                        <s class="text-caption text-muted-foreground decoration-muted-foreground/60" x-show="compareText"><bdi class="tabular-nums" x-text="compareText"></bdi></s>
                    </span>
                    <p x-show="product && product.description" class="text-body-sm text-muted-foreground" x-text="product ? product.description : ''"></p>

                    <template x-for="o in (product ? product.options : [])" x-bind:key="o.id">
                        @include('nasaq::components.store-listing._option-picker', ['mode' => 'tpl', 'size' => 'md', 'max' => 99, 'label' => true])
                    </template>

                    <div class="flex flex-wrap items-center gap-3">
                        <div role="group" aria-label="{{ nq_sl_t('quantity') }}" class="inline-flex h-control items-center rounded-control border border-border">
                            <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ nq_sl_t('decrease') }}" x-on:click="step(-1)" x-bind:disabled="qty <= 1" class="rounded-e-none"><x-lucide-minus /></x-nq::button>
                            <output aria-live="polite" class="min-w-8 text-center text-label tabular-nums"><bdi x-text="qtyText()">1</bdi></output>
                            <x-nq::button size="icon-sm" variant="ghost" aria-label="{{ nq_sl_t('increase') }}" x-on:click="step(1)" x-bind:disabled="qty >= max" class="rounded-s-none"><x-lucide-plus /></x-nq::button>
                        </div>
                        <span class="contents" x-show="stockTone === 'neutral'"><x-nq::badge variant="neutral"><span x-text="stockText"></span></x-nq::badge></span>
                        <span class="contents" x-show="stockTone === 'success'" style="display: none"><x-nq::badge variant="success"><span x-text="stockText"></span></x-nq::badge></span>
                        <span class="contents" x-show="stockTone === 'danger'" style="display: none"><x-nq::badge variant="danger"><span x-text="stockText"></span></x-nq::badge></span>
                    </div>

                    <div class="flex flex-wrap items-center gap-2">
                        @if ($add)
                            <x-nq::button variant="primary" data-slot="store-quick-view-add" x-on:click="add()" x-bind:disabled="busy || !variant || !inStock" x-bind:aria-busy="busy ? 'true' : undefined" class="min-w-40 flex-1 sm:flex-none">{{ nq_sl_t('addToCart') }}</x-nq::button>
                        @endif
                        <a x-show="detailsHref" style="display: none" x-bind:href="detailsHref"
                            class="inline-flex h-control shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control border border-border bg-card px-[var(--nq-control-pad)] font-sans text-label text-foreground transition-colors duration-150 ease-nq hover:bg-nq-hover outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">{{ nq_sl_t('viewDetails') }}</a>
                    </div>
                    <p class="sr-only" role="status" aria-live="polite" x-text="live"></p>
                </div>
            </div>
        </x-nq::dialog.content>
    </x-nq::dialog>
</div>
