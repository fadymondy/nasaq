{{-- <x-nq::store-checkout.confirmation can-track-order can-continue-shopping />
     The page after an order is placed: thanks with the order number, where it goes and how it is paid, the items and totals, and what happens next. It lives inside
     <x-nq::store-checkout>, which shows it in place of the form once the order is placed (the heading takes focus). can-track-order / can-continue-shopping show the buttons
     (events "nq-store-checkout-track" { order } and "nq-store-checkout-continue"). labels: string overrides keyed like the checkout strings. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-checkout._strings')
@props(['canTrackOrder' => false, 'canContinueShopping' => false, 'labels' => []])
@php
    $t = nq_store_checkout_t((array) $labels);
    $cell = 'flex flex-col gap-0.5';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-order-confirmation') }}" {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6') }}>
    <header class="flex flex-col items-center gap-3 text-center">
        <span class="inline-flex size-12 items-center justify-center rounded-full bg-nq-success-soft text-nq-success-text">
            <x-lucide-circle-check aria-hidden="true" class="size-7" />
        </span>
        <h1 x-ref="thanks" tabindex="-1" x-text="thanksText" class="text-h1 font-semibold tracking-tight text-foreground outline-none"></h1>
        <p class="text-body text-foreground">{{ $t['confirmed'] }}</p>
        <p class="flex items-center gap-2 text-body-sm text-muted-foreground">
            {{ $t['orderNumber'] }}
            <bdi dir="ltr" x-text="order.number" class="rounded-control bg-secondary px-2 py-0.5 font-medium tabular-nums text-foreground"></bdi>
        </p>
        <p x-show="!! emailedText" style="display: none" x-text="emailedText" class="text-body-sm text-muted-foreground"></p>
    </header>

    <section class="rounded-card border border-border bg-card p-4">
        <dl class="grid gap-4 sm:grid-cols-2">
            <div class="{{ $cell }}" x-show="hasAddress" style="display: none">
                <dt class="text-caption text-muted-foreground">{{ $t['deliveryTo'] }}</dt>
                <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]">
                    <span class="flex flex-col">
                        <span class="font-medium" x-text="order.shippingAddress ? order.shippingAddress.name : ''"></span>
                        <template x-for="line in orderAddress" x-bind:key="line"><span x-text="line"></span></template>
                    </span>
                </dd>
            </div>
            <div class="{{ $cell }}" x-show="hasOrderMethod" style="display: none">
                <dt class="text-caption text-muted-foreground">{{ $t['deliveryMethod'] }}</dt>
                <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]">
                    <span class="flex flex-col">
                        <span x-text="orderMethodLabel"></span>
                        <span x-show="hasOrderEta" style="display: none" x-text="orderMethodEta" class="text-muted-foreground"></span>
                    </span>
                </dd>
            </div>
            <div class="{{ $cell }}">
                <dt class="text-caption text-muted-foreground">{{ $t['paymentLabel'] }}</dt>
                <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]" x-text="orderPaymentText"></dd>
            </div>
            <div class="{{ $cell }}">
                <dt class="text-caption text-muted-foreground">{{ $t['placedOn'] }}</dt>
                <dd class="text-body-sm text-foreground [overflow-wrap:anywhere]" x-text="placedDate"></dd>
            </div>
        </dl>
        <span data-slot="badge" x-show="giftOn" style="display: none" class="mt-4 inline-flex h-5 shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-nq-info/40 bg-nq-info-soft px-1.5 text-caption font-medium text-nq-info-text">{{ $t['giftOrder'] }}</span>
    </section>

    <section aria-labelledby="nq-co-items" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h2 id="nq-co-items" class="text-h3 font-semibold text-foreground">{{ $t['itemsTitle'] }}</h2>
        <ul class="flex flex-col divide-y divide-border">
            <template x-for="line in order.lines" x-bind:key="line.id">
                <li class="flex items-center gap-3 py-3 first:pt-0">
                    <x-nq::store-cart.image :size="56" src-expr="line.image" alt-expr="line.name" />
                    <span class="flex min-w-0 flex-1 flex-col">
                        <span class="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]" x-text="line.name"></span>
                        <span class="text-caption text-muted-foreground" x-text="lineMeta(line)"></span>
                    </span>
                    <span class="text-body-sm text-foreground"><bdi class="tabular-nums" x-text="lineTotal(line)"></bdi></span>
                </li>
            </template>
        </ul>
        <dl class="flex flex-col gap-1.5 border-t border-border pt-3 text-body-sm">
            <div class="flex justify-between gap-3">
                <dt class="text-muted-foreground">{{ $t['subtotal'] }}</dt>
                <dd><bdi class="tabular-nums" x-text="money(order.totals.subtotal)"></bdi></dd>
            </div>
            <div class="flex justify-between gap-3" x-show="orderHasDiscount" style="display: none">
                <dt class="text-muted-foreground">{{ $t['discount'] }}</dt>
                <dd class="text-nq-success-text"><bdi dir="ltr">&minus;</bdi><bdi class="tabular-nums" x-text="money(order.totals.discount)"></bdi></dd>
            </div>
            <div class="flex justify-between gap-3">
                <dt class="text-muted-foreground">{{ $t['shipping'] }}</dt>
                <dd>
                    <span x-show="orderShipFree" style="display: none" class="text-nq-success-text">{{ $t['free'] }}</span>
                    <bdi x-show="orderShipPaid" style="display: none" class="tabular-nums" x-text="money(order.totals.shipping)"></bdi>
                </dd>
            </div>
            <div class="flex justify-between gap-3" x-show="orderHasTax" style="display: none">
                <dt class="text-muted-foreground">{{ $t['tax'] }}</dt>
                <dd><bdi class="tabular-nums" x-text="money(order.totals.tax)"></bdi></dd>
            </div>
            <div class="flex justify-between gap-3" x-show="orderHasFees" style="display: none">
                <dt class="text-muted-foreground">{{ $t['fees'] }}</dt>
                <dd><bdi class="tabular-nums" x-text="money(orderFees)"></bdi></dd>
            </div>
            <div class="mt-1 flex items-baseline justify-between gap-3 border-t border-border pt-2">
                <dt class="text-label text-foreground">{{ $t['total'] }}</dt>
                <dd>@include('nasaq::components.store-cart._money', ['amount' => 'order.totals.total', 'compare' => null, 'size' => 'lg'])</dd>
            </div>
        </dl>
    </section>

    <section aria-labelledby="nq-co-next" class="flex flex-col gap-3 rounded-card border border-border bg-card p-4">
        <h2 id="nq-co-next" class="text-h3 font-semibold text-foreground">{{ $t['nextTitle'] }}</h2>
        <ol class="flex flex-col gap-2">
            <template x-for="(step, i) in nextSteps" x-bind:key="i">
                <li class="flex items-start gap-3 text-body-sm text-foreground">
                    <span aria-hidden="true" x-text="n(i + 1)" class="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-caption text-muted-foreground"></span>
                    <span x-text="step"></span>
                </li>
            </template>
        </ol>
    </section>

    <div class="flex flex-wrap items-center justify-center gap-3">
        @if ($canTrackOrder)
            <x-nq::button variant="primary" x-on:click="track()">{{ $t['trackOrder'] }}</x-nq::button>
        @endif
        @if ($canContinueShopping)
            <x-nq::button variant="secondary" x-on:click="continueShopping()">{{ $t['continueShopping'] }}</x-nq::button>
        @endif
    </div>
</div>
