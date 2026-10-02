{{-- <x-nq::store-merch.flash-deals :deals="[['id' => 'd1', 'product' => $tee, 'endsAt' => $endsAtMs, 'sold' => 34, 'total' => 50]]" currency="USD" />
     A strip of time-limited offers. The soonest-ending live deal sets the countdown; each deal shows the shared product card and how much of its
     stock is claimed. Ended and not-yet-started deals are not shown; a deal that ends while the page is open leaves the strip, and the last one
     takes the whole section away and fires nq-expire once.
     deals: id, product (the array store-listing.product-card takes), endsAt (epoch ms), startsAt? (epoch ms), sold?, total?.
     currency: default USD, or SAR in Arabic. now: fixed epoch ms for stories (the strip then does not tick). title: heading (default "Flash deals").
     view-all-href: a link to every deal. href-pattern: the product link, with {id} and {slug}. wishlist-ids: ids shown as saved.
     quick-view, add: passed to the cards. server-clock: count against the server's clock instead of the visitor's (default false).
     labels: string overrides. The cards raise nq-add-to-cart, nq-quick-view, nq-wishlist-change and nq-navigate.
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-merch._strings')
@props(['deals' => [], 'currency' => null, 'now' => null, 'title' => null, 'viewAllHref' => null, 'hrefPattern' => null, 'wishlistIds' => [], 'quickView' => null, 'add' => true, 'serverClock' => false, 'labels' => null])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $clock = $now !== null ? (float) $now : nq_merch_now();
    $live = nq_merch_active(array_values($deals), $clock);
    $heading = $title ?? nq_merch_t('flashDeals', [], $labels);
    $parts = nq_merch_parts($live[0]['endsAt'] ?? 0, $clock);
    $config = [
        'now' => $now !== null ? (float) $now : null,
        'serverNow' => $serverClock ? $clock : null,
        'deals' => array_map(fn ($d) => ['id' => (string) $d['id'], 'endsAt' => $d['endsAt'], 'startsAt' => $d['startsAt'] ?? null], $live),
        'labels' => [
            'timeLeft' => nq_merch_t('timeLeft', ['time' => '{time}'], $labels),
            'days' => nq_merch_t('days', [], $labels), 'hours' => nq_merch_t('hours', [], $labels), 'minutes' => nq_merch_t('minutes', [], $labels),
        ],
    ];
@endphp
@if (count($live))
    <section data-slot="{{ $attributes->get('data-slot', 'store-flash-deals') }}" aria-labelledby="store-deals-h" x-data="nqStoreFlashDeals(@js($config))" x-show="hasLive"
        {{ $attributes->except('data-slot')->cn('rounded-card border border-border bg-nq-surface-soft p-4 sm:p-6') }}>
        <div class="mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
                <h2 id="store-deals-h" class="text-h2 text-foreground">{{ $heading }}</h2>
                <span class="inline-flex items-center gap-2 text-body-sm text-muted-foreground">
                    {{ nq_merch_t('endsIn', [], $labels) }}
                    @include('nasaq::components.store-merch._readout')
                </span>
            </div>
            @if ($viewAllHref)
                <x-nq::button variant="link" :href="$viewAllHref">
                    {{ nq_merch_t('viewAllDeals', [], $labels) }}
                    <x-nq::icon name="arrow-right" :directional="true" />
                </x-nq::button>
            @endif
        </div>
        <x-nq::carousel :label="$heading" class="relative">
            <x-nq::carousel.content>
                @foreach ($live as $d)
                    @php $pct = nq_merch_progress($d['sold'] ?? null, $d['total'] ?? null); @endphp
                    <x-nq::carousel.item class="basis-3/4 sm:basis-1/2 lg:basis-1/4" data-deal-id="{{ $d['id'] }}">
                        <div class="flex h-full flex-col gap-2">
                            <x-nq::store-listing.product-card :product="$d['product']" :currency="$code" :href-pattern="$hrefPattern" :wishlisted="in_array($d['product']['id'], $wishlistIds, true)" :quick-view="$quickView" :add="$add" />
                            @if (! empty($d['total']))
                                <div class="flex flex-col gap-1">
                                    <div role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ $pct }}" aria-label="{{ nq_merch_t('claimed', ['percent' => $pct], $labels) }}" class="h-1.5 overflow-hidden rounded-full bg-secondary">
                                        <div class="h-full rounded-full bg-nq-danger-solid" style="width: {{ $pct }}%"></div>
                                    </div>
                                    <span class="text-caption text-muted-foreground">{{ $pct >= 80 ? nq_merch_t('almostGone', [], $labels) : nq_merch_t('claimed', ['percent' => $pct], $labels) }}</span>
                                </div>
                            @endif
                        </div>
                    </x-nq::carousel.item>
                @endforeach
            </x-nq::carousel.content>
            <x-nq::carousel.previous />
            <x-nq::carousel.next />
        </x-nq::carousel>
    </section>
@endif
