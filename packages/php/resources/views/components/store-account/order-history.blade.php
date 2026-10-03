{{-- <x-nq::store-account.order-history :orders="$orders" :products="$catalogue" currency="USD" @nq-open-order="open($event.detail.order)" />
     The customer's order history: filter by status group, search, open an order, track it or order it again.
     orders: the CommerceOrder shape ['id', 'number', 'placedAt', 'status', 'lines' => [...], 'totals' => [...], 'tracking' => ['carrier', 'number', 'url'?]].
     products: the current catalogue, used to decide what "Order again" can add today. currency: ISO 4217 (USD, or SAR in Arabic). tracking-template: carrier link with {number}.
     loading / error: states. labels: override any built-in string by key.
     Events from the root: nq-open-order { order }, nq-reorder { order, plan } (only when something can be added), nq-open-cart, nq-retry. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['orders' => [], 'products' => [], 'currency' => null, 'trackingTemplate' => null, 'loading' => false, 'error' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $config = [
        'orders' => array_values($orders), 'products' => array_values($products), 'trackingTemplate' => $trackingTemplate, 'currency' => $currency,
        'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t, 'labels' => nq_store_admin_labels(), 'loading' => (bool) $loading, 'error' => (bool) $error,
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-order-history') }}" x-data="nqStoreOrderHistory(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-4') }}>
    @if ($error)
        <x-nq::states :title="$t['loadError']" icon="triangle-alert">
            <x-slot:actions>
                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="retry()">{{ $t['retry'] }}</x-nq::button>
            </x-slot:actions>
        </x-nq::states>
    @else
        <section aria-label="{{ $t['ordersTitle'] }}" class="flex min-w-0 flex-col gap-4">
            <div class="flex flex-col gap-3">
                <div class="relative">
                    <x-lucide-search aria-hidden="true" class="pointer-events-none absolute inset-y-0 start-3 my-auto size-4 text-muted-foreground" />
                    <x-nq::field.input type="search" aria-label="{{ $t['searchOrders'] }}" placeholder="{{ $t['searchOrders'] }}" class="ps-9" x-model="query" />
                </div>
                <div class="-mx-1 overflow-x-auto px-1 pb-1">
                    <x-nq::toggle-group aria-label="{{ $t['ordersTitle'] }}" :default-value="['all']" x-model="picked">
                        @foreach (['all', 'active', 'delivered', 'returns', 'cancelled'] as $g)
                            <x-nq::toggle-group.toggle value="{{ $g }}">
                                {{ $t['groups'][$g] }}
                                <span class="ms-1.5 text-muted-foreground tabular-nums" x-text="num(counts.{{ $g }})"></span>
                            </x-nq::toggle-group.toggle>
                        @endforeach
                    </x-nq::toggle-group>
                </div>
            </div>

            <x-nq::store-account.reorder-notice :go-to-cart="$t['goToCart']" />

            @if ($loading)
                <div class="flex flex-col gap-3" aria-busy="true">
                    <x-nq::states.skeleton class="h-32" />
                    <x-nq::states.skeleton class="h-32" />
                    <x-nq::states.skeleton class="h-32" />
                </div>
            @else
                <x-nq::states icon="package" :title="$t['noOrders']" :description="$t['noOrdersText']" x-show="orders.length === 0" style="display: none" />
                <x-nq::states icon="search" :title="$t['noMatch']" :description="$t['noMatchHint']" x-show="noMatch" style="display: none">
                    <x-slot:actions>
                        <x-nq::button type="button" size="sm" variant="secondary" x-on:click="clear()">{{ $t['clearFilters'] }}</x-nq::button>
                    </x-slot:actions>
                </x-nq::states>
                <ul class="m-0 flex list-none flex-col gap-3 p-0" x-show="shown.length > 0">
                    <template x-for="order in shown" x-bind:key="order.id">
                        <li class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
                            <div class="flex flex-wrap items-start justify-between gap-2">
                                <div class="flex min-w-0 flex-col gap-0.5">
                                    <span class="font-semibold">{{ $t['order'] }} <bdi x-text="order.number"></bdi></span>
                                    <span class="text-body-sm text-muted-foreground">{{ $t['placedOn'] }} <span x-text="date(order.placedAt)"></span></span>
                                </div>
                                <x-nq::store-orders-admin.chip expr="statusChip(order.status)" />
                            </div>
                            <div class="flex items-center gap-2 overflow-hidden">
                                <template x-for="line in thumbs(order)" x-bind:key="line.id">
                                    <span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                                        <img x-show="line.image" x-bind:src="line.image" x-bind:alt="line.name" class="size-full object-cover" />
                                        <x-lucide-package x-show="! line.image" aria-hidden="true" class="size-6 text-muted-foreground" />
                                    </span>
                                </template>
                                <span x-show="more(order) > 0" class="text-body-sm text-muted-foreground tabular-nums" x-text="'+' + num(more(order))"></span>
                                <span class="ms-auto flex shrink-0 flex-col items-end text-body-sm">
                                    <span class="font-semibold tabular-nums" x-text="money(order.totals.total)"></span>
                                    <span class="text-muted-foreground"><span class="tabular-nums" x-text="num(lineCount(order))"></span> {{ $t['items'] }}</span>
                                </span>
                            </div>
                            <div class="flex flex-wrap gap-2">
                                <x-nq::button type="button" size="sm" variant="secondary" x-on:click="open(order)">{{ $t['viewOrder'] }}</x-nq::button>
                                <x-nq::button href="#" size="sm" variant="ghost" target="_blank" rel="noreferrer" x-show="hasTrack(order)" x-bind:href="trackUrl(order)">
                                    <x-lucide-truck aria-hidden="true" />
                                    {{ $t['trackOrder'] }}
                                </x-nq::button>
                                <x-nq::button type="button" size="sm" variant="ghost" x-on:click="reorder(order)">
                                    <x-lucide-rotate-ccw aria-hidden="true" />
                                    {{ $t['orderAgain'] }}
                                </x-nq::button>
                            </div>
                        </li>
                    </template>
                </ul>
            @endif
        </section>
    @endif
</div>
