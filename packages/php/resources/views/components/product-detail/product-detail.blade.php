{{-- <x-nq::product-detail :product="$product" currency="USD" x-on:nq-add-to-cart="cart.add($event.detail.variantId, $event.detail.quantity)" />
     A complete product page: breadcrumbs, gallery, title, rating, price with compare-at and percent off, variant picker, quantity,
     stock and delivery lines, add to cart (and Buy now), wishlist and share, trust badges, a mobile sticky add bar, a size guide,
     description / specifications / shipping sections and slots for reviews and related products. It holds no cart.
     Server-rendered for the starting variant; the Alpine component nqProductDetail keeps it live. Needs the Alpine runtime (@nasaqScripts).

     product: an array: id, name, brand?, category?, description?, badges?, rating? [average, count], images [[src, alt?]],
       options [[id, name, display? (button|swatch|image|select), values [[id, label, color?, image?]]]],
       variants [[id, sku?, options [optionId => valueId], price (minor units), compareAt?, stock?, allowBackorder?, image?]].
     currency: ISO code (USD, or SAR in Arabic, when omitted). currency-exponent: digits of the minor unit (default 2).
     default-variant-id / blank-selection: open on a variant, or with nothing picked so the shopper must choose.
     impossible: hide (default) | disable. low-stock-threshold (5). max-per-order. breadcrumbs: [[label, href?]].
     size-guide: [title?, description?, columns, rows, footer?] on the size-guide-option-id axis ("size").
     delivery: [cities [[id, label, etaDays [min, max], fee? (minor units)]], defaultCityId?, skipWeekdays?, cutoffHour?, now?].
     description, specs [[label, value]], shipping-info: the section copy. The default slot replaces the description body, the "shipping" slot the shipping copy.
     sections: tabs (default) | accordion. trust-badges: [[id, icon? (secure|returns|delivery|authentic|support), label, description?]], or false.
     buy-now: show the Buy now button. wishlist / wishlisted: show the heart, starting on or off. share-url. sticky-bar (true).
     related-title. Slots: default (description), <x-slot:shipping>, <x-slot:reviews>, <x-slot:related>.

     Events (React's callbacks), bubbling from the buttons; listen on the component or any ancestor:
       nq-add-to-cart, nq-buy-now   detail { variantId, quantity, variant, wait(promise) }. Pass a promise to wait(): the button waits for it,
                                    and a result of { error: "..." } (or a rejection) shows the failure line.
       nq-variant-change            detail { variantId | null, variant, selection }
       nq-wishlist-change           detail { wishlisted }
       nq-share                     detail { url, title }. Cancelable: preventDefault() replaces Web Share / copy-link.
     Parts: product-detail.gallery, .variant-picker, .quantity-stepper, .size-guide (each usable alone). --}}
@include('nasaq::components.product-detail._logic')
@props([
    'product', 'currency' => null, 'currencyExponent' => 2, 'defaultVariantId' => null, 'blankSelection' => false, 'wishlisted' => null, 'wishlist' => false,
    'shareUrl' => null, 'breadcrumbs' => null, 'sizeGuide' => null, 'sizeGuideOptionId' => 'size', 'impossible' => 'hide', 'lowStockThreshold' => 5,
    'maxPerOrder' => null, 'delivery' => null, 'description' => null, 'specs' => [], 'shippingInfo' => null, 'sections' => 'tabs', 'trustBadges' => null,
    'relatedTitle' => null, 'stickyBar' => true, 'buyNow' => false,
])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $locale = app()->getLocale();
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $exp = (int) $currencyExponent;
    $minor = 10 ** $exp;
    $options = $product['options'] ?? [];
    $selection = nq_pdp_initial_selection($product, $defaultVariantId, (bool) $blankSelection);
    $variant = nq_pdp_find_variant($product, $selection);
    $stock = nq_pdp_stock_state($variant, (int) $lowStockThreshold);
    $price = nq_pdp_display_price($product, $variant);
    $max = nq_pdp_max_purchasable($variant, $maxPerOrder);
    $soldOut = $stock['kind'] === 'out';
    $money = fn ($amount) => nq_pdp_money($amount, $exp, $code);
    $pct = fn (int $p) => ($p).'%';
    $images = $product['images'] ?? [];
    $showWish = $wishlist || $wishlisted !== null;
    $wish = (bool) $wishlisted;

    $stockLine = match ($stock['kind']) {
        'low' => [$t('Only '.$stock['left'].' left in stock', 'باقي '.$stock['left'].' فقط في المخزون'), 'warning'],
        'in-stock', 'untracked' => [$t('In stock', 'متوفر'), 'success'],
        'backorder' => [$t('Available on backorder', 'متاح بالطلب المسبق'), 'info'],
        'out' => [$t('Out of stock', 'غير متوفر حاليًا'), 'danger'],
        default => ['', ''],
    };

    $cities = $delivery['cities'] ?? [];
    $cityId = $delivery['defaultCityId'] ?? ($cities[0]['id'] ?? null);
    $city = collect($cities)->firstWhere('id', $cityId);
    $deliveryLine = '';
    if ($city) {
        [$from, $to] = nq_pdp_delivery_window($delivery['now'] ?? time(), $city['etaDays'], $delivery['skipWeekdays'] ?? [], $delivery['cutoffHour'] ?? null);
        $range = nq_pdp_date_range($from, $to);
        $fee = ! empty($city['fee']) ? $t('Delivery '.$money($city['fee']), 'رسوم التوصيل '.$money($city['fee'])) : $t('Free delivery', 'توصيل مجاني');
        $deliveryLine = $t('Arrives '.$range, 'يصلك '.$range).' · '.$fee;
    }

    $trust = $trustBadges === false ? [] : ($trustBadges ?? [
        ['id' => 'secure', 'icon' => 'secure', 'label' => $t('Secure payment', 'دفع آمن'), 'description' => $t('Your payment details are encrypted.', 'بيانات الدفع الخاصة بك مشفرة.')],
        ['id' => 'returns', 'icon' => 'returns', 'label' => $t('Easy returns', 'إرجاع سهل'), 'description' => $t('Return within 14 days.', 'أرجع خلال 14 يومًا.')],
        ['id' => 'delivery', 'icon' => 'delivery', 'label' => $t('Fast delivery', 'توصيل سريع'), 'description' => $t('Tracked shipping across Egypt.', 'شحن مع تتبع داخل مصر.')],
        ['id' => 'authentic', 'icon' => 'authentic', 'label' => $t('Original products', 'منتجات أصلية'), 'description' => $t('Sold by the brand or its partners.', 'تباع من العلامة التجارية أو شركائها.')],
    ]);
    $trustIcons = ['secure' => 'shield-check', 'returns' => 'rotate-ccw', 'delivery' => 'truck', 'authentic' => 'badge-check', 'support' => 'life-buoy'];

    $longDescription = $description ?? ($product['description'] ?? null);
    $hasSku = collect($product['variants'])->contains(fn ($v) => ! empty($v['sku']));
    $specRows = array_values(array_filter([
        $hasSku ? ['label' => $t('SKU', 'رمز المنتج'), 'sku' => true, 'value' => $variant['sku'] ?? ''] : null,
        ! empty($product['brand']) ? ['label' => $t('Brand', 'العلامة التجارية'), 'value' => $product['brand']] : null,
        ! empty($product['category']) ? ['label' => $t('Category', 'الفئة'), 'value' => $product['category']] : null,
        ...array_map(fn ($r) => ['label' => $r['label'], 'value' => $r['value']], $specs ?? []),
    ]));
    $panels = array_values(array_filter([
        (isset($slot) && $slot->isNotEmpty()) || $longDescription ? ['id' => 'description', 'title' => $t('Description', 'الوصف')] : null,
        $specRows ? ['id' => 'specs', 'title' => $t('Specifications', 'المواصفات')] : null,
        $shippingInfo || (isset($shipping) && $shipping->isNotEmpty()) ? ['id' => 'shipping', 'title' => $t('Shipping and returns', 'الشحن والإرجاع')] : null,
    ]));

    $config = [
        'product' => $product,
        'images' => array_values($images),
        'currency' => $code,
        'exponent' => $exp,
        'selection' => $selection,
        'wishlisted' => $wish,
        'lowStock' => (int) $lowStockThreshold,
        'maxPerOrder' => $maxPerOrder,
        'impossible' => $impossible,
        'delivery' => $delivery,
        'shareUrl' => $shareUrl,
    ];
    $statusId = 'nq-pdp-status-'.substr(md5((string) ($product['id'] ?? '')), 0, 6);
    $tones = ['warning' => ['text-nq-warning-text', 'bg-nq-warning'], 'success' => ['text-nq-success-text', 'bg-nq-success'], 'info' => ['text-nq-info-text', 'bg-nq-info'], 'danger' => ['text-nq-danger-text', 'bg-nq-danger']];
    $tone = $tones[$stockLine[1]] ?? ['', ''];
    $prose = 'text-pretty text-body text-muted-foreground';
    $addLabel = $soldOut ? $t('Sold out', 'نفد المخزون') : $t('Add to cart', 'أضف إلى السلة');
    $iconBtn = 'w-[calc(var(--nq-control)+8px)] px-0';
@endphp
<div data-slot="product-detail" x-data="nqProductDetail(@js($config))" :class="{ 'pb-24': barVisible }"
    {{ $attributes->cn('mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-6 md:px-6') }}>
    @if ($breadcrumbs)
        <x-nq::breadcrumb>
            <x-nq::breadcrumb.list>
                @foreach ($breadcrumbs as $i => $crumb)
                    <x-nq::breadcrumb.item>
                        @if ($i === count($breadcrumbs) - 1 || empty($crumb['href']))
                            <x-nq::breadcrumb.page>{{ $crumb['label'] }}</x-nq::breadcrumb.page>
                        @else
                            <x-nq::breadcrumb.link :href="$crumb['href']">{{ $crumb['label'] }}</x-nq::breadcrumb.link>
                        @endif
                    </x-nq::breadcrumb.item>
                    @if ($i !== count($breadcrumbs) - 1)
                        <x-nq::breadcrumb.separator />
                    @endif
                @endforeach
            </x-nq::breadcrumb.list>
        </x-nq::breadcrumb>
    @endif

    <div class="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-12">
        <div class="min-w-0 lg:sticky lg:top-6 lg:self-start">
            <x-nq::product-detail.gallery :images="$images" :name="$product['name']" />
        </div>

        <div class="flex min-w-0 flex-col gap-5">
            <header class="flex flex-col gap-2">
                @if (! empty($product['badges']))
                    <div class="flex flex-wrap gap-1.5">
                        @foreach ($product['badges'] as $b)
                            <x-nq::badge variant="accent">{{ $b }}</x-nq::badge>
                        @endforeach
                    </div>
                @endif
                @if (! empty($product['brand']))
                    <p class="text-label text-muted-foreground">{{ $product['brand'] }}</p>
                @endif
                <h1 class="text-balance text-h1 text-foreground">{{ $product['name'] }}</h1>
                @if (! empty($product['rating']))
                    <button type="button" x-on:click="document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth', block: 'start' })"
                        class="w-fit rounded-[3px] outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus">
                        <x-nq::rating :value="$product['rating']['average']" :count="$product['rating']['count']" :count-label="$t('Reviews', 'تقييم')" />
                    </button>
                @endif
            </header>

            <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span class="text-body-sm text-muted-foreground" x-show="price.from" @if (! $price['from']) style="display:none" @endif>{{ $t('From', 'ابتداءً من') }}</span>
                <span data-slot="price" class="inline-flex flex-wrap items-baseline gap-x-1.5 text-body-sm text-foreground">
                    <span><bdi class="text-h2 font-semibold tracking-tight tabular-nums" x-text="priceText">{{ $money($price['price']) }}</bdi></span>
                    <s class="text-caption text-muted-foreground decoration-muted-foreground/60" x-show="compareText" @if (! $price['compareAt']) style="display:none" @endif>
                        <span class="sr-only">{{ $t('was ', 'بدلًا من ') }}</span>
                        <bdi class="tabular-nums" x-text="compareText">{{ $price['compareAt'] ? $money($price['compareAt']) : '' }}</bdi>
                    </s>
                </span>
                <x-nq::badge variant="danger" x-show="price.percentOff > 0" x-text="percentText" :style="$price['percentOff'] > 0 ? '' : 'display:none'">{{ $t($pct($price['percentOff']).' off', 'خصم '.$pct($price['percentOff'])) }}</x-nq::badge>
            </div>

            @if (count($options) > 0)
                <div class="scroll-mt-24">
                    <x-nq::product-detail.variant-picker :product="$product" :selection="$selection" :impossible="$impossible" :size-guide="$sizeGuide" :size-guide-option-id="$sizeGuideOptionId" />
                </div>
            @endif

            <div class="flex flex-wrap items-start gap-x-6 gap-y-3">
                <x-nq::product-detail.quantity-stepper :value="1" :max="$max" :disabled="$soldOut" x-model="quantity" x-effect="max = maxQty ?? null; disabled = soldOut" />
                <p aria-live="polite" class="flex h-control items-center gap-2 text-label {{ $tone[0] }}"
                    :class="{ 'text-nq-warning-text': stockTone === 'warning', 'text-nq-success-text': stockTone === 'success', 'text-nq-info-text': stockTone === 'info', 'text-nq-danger-text': stockTone === 'danger' }">
                    <span aria-hidden="true" class="size-2 rounded-full {{ $tone[1] }}" x-show="stockText" @if (! $stockLine[0]) style="display:none" @endif
                        :class="{ 'bg-nq-warning': stockTone === 'warning', 'bg-nq-success': stockTone === 'success', 'bg-nq-info': stockTone === 'info', 'bg-nq-danger': stockTone === 'danger' }"></span>
                    <span x-text="stockText">{{ $stockLine[0] }}</span>
                </p>
            </div>

            @if ($city)
                <div data-slot="product-delivery" class="flex flex-col gap-2 rounded-card border border-border p-3">
                    <div class="flex flex-wrap items-center gap-2">
                        <x-lucide-truck aria-hidden="true" class="size-4 text-muted-foreground" />
                        <span class="text-label text-foreground">{{ $t('Deliver to', 'التوصيل إلى') }}</span>
                        <x-nq::select x-model="cityId" :value="$cityId">
                            <x-nq::select.trigger aria-label="{{ $t('City', 'المدينة') }}" class="w-auto min-w-32">
                                <x-nq::select.value />
                            </x-nq::select.trigger>
                            <x-nq::select.content>
                                @foreach ($cities as $c)
                                    <x-nq::select.item :value="$c['id']">{{ $c['label'] }}</x-nq::select.item>
                                @endforeach
                            </x-nq::select.content>
                        </x-nq::select>
                    </div>
                    <p class="text-body-sm text-muted-foreground" x-text="deliveryLine">{{ $deliveryLine }}</p>
                </div>
            @endif

            <div data-slot="product-cta" class="flex flex-col gap-2">
                <div class="flex flex-wrap gap-2">
                    <x-nq::button variant="primary" size="lg" :disabled="$soldOut" aria-describedby="{{ $statusId }}" class="min-w-44 flex-1"
                        x-on:click="run('add')" x-bind:disabled="soldOut || pending !== null" x-bind:aria-busy="pending === 'add'">
                        <span x-show="pending === 'add'" style="display:none" class="contents"><x-nq::spinner /></span>
                        <span x-text="addLabel">{{ $addLabel }}</span>
                    </x-nq::button>
                    @if ($buyNow)
                        <x-nq::button variant="secondary" size="lg" :disabled="$soldOut" class="min-w-32 flex-1"
                            x-on:click="run('buy')" x-bind:disabled="soldOut || pending !== null" x-bind:aria-busy="pending === 'buy'">
                            <span x-show="pending === 'buy'" style="display:none" class="contents"><x-nq::spinner /></span>
                            {{ $t('Buy now', 'اشتري الآن') }}
                        </x-nq::button>
                    @endif
                    @if ($showWish)
                        <x-nq::button variant="secondary" size="lg" aria-pressed="{{ $wish ? 'true' : 'false' }}"
                            aria-label="{{ $wish ? $t('Remove from wishlist', 'أزل من المفضلة') : $t('Add to wishlist', 'أضف إلى المفضلة') }}"
                            title="{{ $wish ? $t('Remove from wishlist', 'أزل من المفضلة') : $t('Add to wishlist', 'أضف إلى المفضلة') }}" class="{{ $iconBtn }}"
                            x-on:click="toggleWish()" x-bind:aria-pressed="wish"
                            x-bind:aria-label="wish ? @js($t('Remove from wishlist', 'أزل من المفضلة')) : @js($t('Add to wishlist', 'أضف إلى المفضلة'))"
                            x-bind:title="wish ? @js($t('Remove from wishlist', 'أزل من المفضلة')) : @js($t('Add to wishlist', 'أضف إلى المفضلة'))">
                            <x-lucide-heart aria-hidden="true" class="{{ $wish ? 'fill-nq-danger text-nq-danger' : '' }}" x-bind:class="{ 'fill-nq-danger text-nq-danger': wish }" />
                        </x-nq::button>
                    @endif
                    <x-nq::button variant="secondary" size="lg" aria-label="{{ $t('Share', 'مشاركة') }}" title="{{ $t('Share', 'مشاركة') }}" class="{{ $iconBtn }}" x-on:click="share()">
                        <x-lucide-share-2 aria-hidden="true" />
                    </x-nq::button>
                </div>
                <p id="{{ $statusId }}" role="status" aria-live="polite" class="sr-only flex items-center gap-1.5 text-body-sm"
                    x-effect="$el.classList.toggle('sr-only', !status); $el.setAttribute('role', status?.kind === 'error' ? 'alert' : 'status')"
                    :class="{ 'text-nq-danger-text': status?.kind === 'error', 'text-nq-success-text': status?.kind === 'ok', 'text-muted-foreground': status?.kind === 'info' }">
                    <x-lucide-triangle-alert aria-hidden="true" class="size-4 shrink-0" x-show="status?.kind === 'error'" style="display:none" />
                    <span x-text="status?.text"></span>
                </p>
            </div>

            @if (count($trust) > 0)
                <ul data-slot="product-trust" class="grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
                    @foreach ($trust as $b)
                        <li class="flex items-start gap-2.5">
                            <x-dynamic-component :component="'lucide-'.($trustIcons[$b['icon'] ?? 'secure'] ?? 'shield-check')" aria-hidden="true" class="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                            <span class="flex min-w-0 flex-col">
                                <span class="text-label text-foreground">{{ $b['label'] }}</span>
                                @if (! empty($b['description']))
                                    <span class="text-caption text-muted-foreground">{{ $b['description'] }}</span>
                                @endif
                            </span>
                        </li>
                    @endforeach
                </ul>
            @endif
        </div>
    </div>

    @if (count($panels) > 0)
        @if ($sections === 'accordion')
            <x-nq::accordion :default-value="[$panels[0]['id']]" multiple aria-label="{{ $t('Product information', 'معلومات المنتج') }}">
                @foreach ($panels as $p)
                    <x-nq::accordion.item :value="$p['id']">
                        <x-nq::accordion.trigger>{{ $p['title'] }}</x-nq::accordion.trigger>
                        <x-nq::accordion.panel>
                            @include('nasaq::components.product-detail._panel', ['id' => $p['id'], 'prose' => $prose, 'longDescription' => $longDescription, 'shippingInfo' => $shippingInfo, 'specRows' => $specRows, 'descriptionSlot' => $slot, 'shippingInfoSlot' => $shipping ?? null])
                        </x-nq::accordion.panel>
                    </x-nq::accordion.item>
                @endforeach
            </x-nq::accordion>
        @else
            <x-nq::tabs :default-value="$panels[0]['id']" aria-label="{{ $t('Product information', 'معلومات المنتج') }}">
                <x-nq::tabs.list variant="underline">
                    @foreach ($panels as $p)
                        <x-nq::tabs.tab :value="$p['id']">{{ $p['title'] }}</x-nq::tabs.tab>
                    @endforeach
                </x-nq::tabs.list>
                @foreach ($panels as $p)
                    <x-nq::tabs.panel :value="$p['id']" class="max-w-3xl">
                        @include('nasaq::components.product-detail._panel', ['id' => $p['id'], 'prose' => $prose, 'longDescription' => $longDescription, 'shippingInfo' => $shippingInfo, 'specRows' => $specRows, 'descriptionSlot' => $slot, 'shippingInfoSlot' => $shipping ?? null])
                    </x-nq::tabs.panel>
                @endforeach
            </x-nq::tabs>
        @endif
    @endif

    @isset($reviews)
        <section id="reviews" data-slot="product-detail-reviews" aria-label="{{ $t('Reviews', 'التقييمات') }}" class="scroll-mt-6 border-t border-border pt-8">{{ $reviews }}</section>
    @endisset

    @isset($related)
        <section data-slot="product-detail-related" aria-label="{{ $relatedTitle ?? $t('You may also like', 'قد يعجبك أيضًا') }}" class="flex flex-col gap-4 border-t border-border pt-8">
            <h2 class="text-h2 text-foreground">{{ $relatedTitle ?? $t('You may also like', 'قد يعجبك أيضًا') }}</h2>
            {{ $related }}
        </section>
    @endisset

    @if ($stickyBar)
        <div data-slot="product-sticky-bar" role="region" aria-label="{{ $t('Add to cart bar', 'شريط الإضافة إلى السلة') }}" x-show="barVisible" style="display:none"
            class="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-background p-3 shadow-lg md:hidden">
            <div class="flex min-w-0 flex-1 flex-col">
                <span class="inline-flex flex-wrap items-baseline gap-x-1.5 text-body text-foreground">
                    <bdi class="font-medium tabular-nums" x-text="priceText">{{ $money($price['price']) }}</bdi>
                    <s class="text-caption text-muted-foreground" x-show="compareText" @if (! $price['compareAt']) style="display:none" @endif><bdi class="tabular-nums" x-text="compareText">{{ $price['compareAt'] ? $money($price['compareAt']) : '' }}</bdi></s>
                </span>
                <span class="truncate text-caption text-muted-foreground" x-text="pickedLabels"></span>
            </div>
            <x-nq::button variant="primary" size="lg" :disabled="$soldOut" class="shrink-0" x-on:click="run('add')" x-bind:disabled="soldOut || pending !== null">
                <span x-text="addLabel">{{ $addLabel }}</span>
            </x-nq::button>
        </div>
    @endif
</div>
