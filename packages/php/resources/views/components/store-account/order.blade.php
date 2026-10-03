{{-- <x-nq::store-account.order :order="$order" :requests="$returns" :products="$catalogue" currency="USD" can-back @nq-return="startReturn($event.detail.order)" />
     One order in the customer's account: the tracking timeline with a carrier link, the items with what shipped or was refunded, the totals, the address and any returns with their RMA status.
     order: the CommerceOrder shape (events, tracking and shippingAddress are read). requests: return requests, the ones of this order are listed. products: the catalogue for "Order again".
     return-days: days after delivery a return can be requested (30). now: ISO reference time for the return window (default now). tracking-template: carrier link with {number}. can-back: shows the back button.
     Events from the root: nq-back, nq-reorder { order, plan }, nq-open-cart, nq-return { order }, nq-cancel-return { request } (from a return card). Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-account._strings')
@props(['order', 'currency' => null, 'requests' => [], 'products' => [], 'trackingTemplate' => null, 'returnDays' => 30, 'now' => null, 'canBack' => false, 'labels' => []])
@php
    $t = nq_store_account_t($labels);
    $currency ??= \Nasaq\Nasaq::currency();
    $mine = array_values(array_filter($requests, fn ($r) => ($r['orderId'] ?? null) === $order['id']));
    $config = [
        'order' => $order, 'requests' => array_values($requests), 'products' => array_values($products), 'trackingTemplate' => $trackingTemplate, 'returnDays' => $returnDays,
        'now' => $now ?? now()->toIso8601String(), 'currency' => $currency, 'locale' => \Nasaq\Nasaq::rtl() ? 'ar' : 'en', 't' => $t, 'labels' => nq_store_admin_labels(),
    ];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-account-order') }}" x-data="nqStoreAccountOrder(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-5') }}>
    @if ($canBack)
        <x-nq::button type="button" variant="ghost" size="sm" class="self-start" x-on:click="back()">
            <x-lucide-arrow-left aria-hidden="true" class="rtl:-scale-x-100" />
            {{ $t['backToOrders'] }}
        </x-nq::button>
    @endif
    <header class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex min-w-0 flex-col gap-1">
            <h2 class="m-0 text-h3 font-semibold">{{ $t['order'] }} <bdi x-text="order.number"></bdi></h2>
            <span class="text-body-sm text-muted-foreground">{{ $t['placedOn'] }} <span x-text="date(order.placedAt, 'long')"></span></span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
            <x-nq::store-orders-admin.chip expr="statusChip(order.status)" />
            <x-nq::button type="button" size="sm" variant="secondary" x-on:click="reorder()">
                <x-lucide-rotate-ccw aria-hidden="true" />
                {{ $t['orderAgain'] }}
            </x-nq::button>
            <x-nq::button type="button" size="sm" variant="secondary" x-show="canReturn" style="display: none" x-on:click="startReturn()">
                <x-lucide-undo-2 aria-hidden="true" />
                {{ $t['returnItems'] }}
            </x-nq::button>
        </div>
    </header>

    <x-nq::store-account.reorder-notice :go-to-cart="$t['goToCart']" />

    <section class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h3 class="m-0 text-label font-semibold">{{ $t['progress'] }}</h3>
        <x-nq::store-order-timeline variant="tracking" :status="$order['status']" :payment="$order['payment'] ?? null" :placed-at="$order['placedAt'] ?? null" :events="$order['events'] ?? []" :tracking="$order['tracking'] ?? null" :tracking-template="$trackingTemplate" />
    </section>

    <section class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h3 class="m-0 text-label font-semibold">{{ $t['itemsOrdered'] }}</h3>
        <ul class="m-0 flex list-none flex-col divide-y divide-border p-0">
            <template x-for="line in order.lines" x-bind:key="line.id">
                <li class="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
                    <span class="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-control border border-border bg-secondary">
                        <img x-show="line.image" x-bind:src="line.image" alt="" class="size-full object-cover" />
                        <x-lucide-package x-show="! line.image" aria-hidden="true" class="size-6 text-muted-foreground" />
                    </span>
                    <div class="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span class="truncate font-medium" x-text="line.name"></span>
                        <span class="truncate text-body-sm text-muted-foreground" x-show="line.variantLabel" x-text="line.variantLabel"></span>
                        <span class="flex flex-wrap gap-1">
                            <span x-show="shipped(line) !== ''" x-text="shipped(line)" x-bind:class="chipClass('info')" class="inline-flex h-5 items-center rounded-[4px] border px-1.5 text-caption font-medium"></span>
                            <span x-show="refunded(line) !== ''" x-text="refunded(line)" x-bind:class="chipClass('neutral')" class="inline-flex h-5 items-center rounded-[4px] border px-1.5 text-caption font-medium"></span>
                        </span>
                    </div>
                    <div class="flex shrink-0 flex-col items-end text-body-sm">
                        <span class="font-medium tabular-nums" x-text="money(line.unitPrice * line.quantity)"></span>
                        <span class="text-muted-foreground">{{ $t['quantity'] }} <span class="tabular-nums" x-text="num(line.quantity)"></span></span>
                    </div>
                </li>
            </template>
        </ul>
        <dl class="m-0 ms-auto grid w-full max-w-xs grid-cols-[1fr_auto] gap-x-6 gap-y-1 border-t border-border pt-3 text-body-sm">
            <dt class="text-muted-foreground">{{ $t['subtotal'] }}</dt>
            <dd class="m-0 text-end tabular-nums" x-text="money(order.totals.subtotal)"></dd>
            <dt class="text-muted-foreground" x-show="order.totals.discount > 0">{{ $t['discount'] }}</dt>
            <dd class="m-0 text-end tabular-nums" x-show="order.totals.discount > 0" x-text="money(order.totals.discount, true)"></dd>
            <dt class="text-muted-foreground">{{ $t['shipping'] }}</dt>
            <dd class="m-0 text-end tabular-nums" x-text="order.totals.shipping > 0 ? money(order.totals.shipping) : t.free"></dd>
            <dt class="text-muted-foreground" x-show="order.totals.tax > 0">{{ $t['tax'] }}</dt>
            <dd class="m-0 text-end tabular-nums" x-show="order.totals.tax > 0" x-text="money(order.totals.tax)"></dd>
            <dt class="font-semibold">{{ $t['paid'] }}</dt>
            <dd class="m-0 text-end font-semibold tabular-nums" x-text="money(order.totals.total)"></dd>
        </dl>
    </section>

    @if (! empty($order['shippingAddress']))
        @php($a = $order['shippingAddress'])
        <section class="flex flex-col gap-1 rounded-card border border-border bg-card p-4 text-body-sm">
            <h3 class="m-0 mb-1 text-label font-semibold">{{ $t['shippingAddress'] }}</h3>
            <address class="flex flex-col not-italic">
                <span class="font-medium">{{ $a['name'] }}</span>
                <span>{{ $a['line1'] }}</span>
                @if (! empty($a['line2']))<span>{{ $a['line2'] }}</span>@endif
                <span>{{ implode(\Nasaq\Nasaq::rtl() ? '، ' : ', ', array_filter([$a['region'] ?? null, $a['city'] ?? null])) }}</span>
                @if (! empty($a['phone']))<bdi dir="ltr" class="text-start text-muted-foreground">{{ $a['phone'] }}</bdi>@endif
            </address>
        </section>
    @endif

    <section class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
            <h3 class="m-0 text-label font-semibold">{{ $t['returnsTitle'] }}</h3>
            <span class="text-body-sm text-muted-foreground" x-text="windowText"></span>
        </div>
        @if (count($mine) === 0)
            <p class="m-0 text-body-sm text-muted-foreground">{{ $t['noReturnsYet'] }}</p>
        @else
            @foreach ($mine as $r)
                <x-nq::store-account.return-status :request="$r" :order="$order" :currency="$currency" can-cancel :labels="$labels" />
            @endforeach
        @endif
    </section>
</div>
