{{-- <x-nq::store-cart.mini-cart :lines="$lines" currency="USD" :free-shipping-threshold="15000"> <x-slot:trigger><x-nq::store-cart.button /></x-slot:trigger> </x-nq::store-cart.mini-cart>
     The cart drawer that slides in when something is added: lines with quantity and remove (with undo), the free-shipping progress bar, the subtotal, and Checkout /
     View cart. It is a dialog: focus moves in, Escape closes, and focus returns to the trigger. Checkout is off while a line is out of stock.
     The trigger slot is the button that opens it, usually <x-nq::store-cart.button>; without one, open it with x-model on the root or window "store-cart-add".
     It shares one cart with <x-nq::store-cart> (the same key, "default"): put the lines on either; the first one on the page seeds the cart.
     lines, currency, free-shipping-threshold, key, feedback, undo-ms, open: as <x-nq::store-cart>. open: start open. The drawer is x-modelable (x-model).
     Events: store-cart-quantity, store-cart-remove, store-cart-undo, store-cart-checkout, store-cart-view (View cart), store-cart-continue, store-cart-change (see x-nq::store-cart).
     Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-cart._logic')
@props(['lines' => [], 'currency' => null, 'freeShippingThreshold' => null, 'key' => 'default', 'feedback' => 'drawer', 'undoMs' => 8000, 'open' => false, 'trigger' => null])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $config = [
        'lines' => array_values((array) $lines), 'currency' => $code, 'exponent' => nq_cart_exponent($code), 'freeShippingThreshold' => $freeShippingThreshold,
        'key' => $key, 'feedback' => $feedback, 'undoMs' => (int) $undoMs, 'open' => (bool) $open,
    ];
@endphp
<div data-slot="store-mini-cart-root" x-data="nqStoreCart(@js($config))" x-on:store-cart-add.window="onAdd($event)" {{ $attributes->cn('contents') }}>
    <x-nq::sheet x-model="drawerOpen">
        @if ($trigger && ! $trigger->isEmpty())
            <span class="contents" x-on:click="show()">{{ $trigger }}</span>
        @endif
        <x-nq::sheet.content side="end" :close-label="$t('Close cart', 'إغلاق السلة')" data-slot="store-mini-cart">
            <x-nq::store-cart.announcer />
            <x-nq::sheet.header>
                <x-nq::sheet.title>
                    {{ $t('Your cart', 'سلتك') }}
                    <span x-show="hasActive" style="display: none" class="ms-2 text-body-sm font-normal text-muted-foreground" x-text="countText"></span>
                </x-nq::sheet.title>
                <x-nq::sheet.description>{{ $t('Review what you are buying before checkout.', 'راجع مشترياتك قبل إتمام الطلب.') }}</x-nq::sheet.description>
            </x-nq::sheet.header>
            <x-nq::sheet.body class="flex flex-col gap-3">
                <div x-show="removed" style="display: none" data-slot="store-cart-removed" class="flex items-center justify-between gap-3 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
                    <span class="min-w-0 [overflow-wrap:anywhere]" x-text="removedText"></span>
                    <x-nq::button variant="link" size="sm" x-on:click="undo()">
                        <x-lucide-undo-2 aria-hidden="true" />
                        {{ $t('Undo', 'تراجع') }}
                    </x-nq::button>
                </div>
                <x-nq::store-cart.empty x-show="!hasActive" style="display: none" class="border-0 px-0" />
                <div x-show="hasActive" style="display: none" class="flex flex-col gap-3">
                    @if ($freeShippingThreshold)
                        <x-nq::store-cart.free-shipping />
                    @endif
                    <ul role="list" class="flex flex-col divide-y divide-border">
                        <template x-for="line in active" :key="line.id"><x-nq::store-cart.line-item compact /></template>
                    </ul>
                </div>
            </x-nq::sheet.body>
            <x-nq::sheet.footer x-show="hasActive" style="display: none" class="flex-col items-stretch gap-3">
                <div class="flex items-baseline justify-between gap-3">
                    <span class="text-label text-foreground">{{ $t('Subtotal', 'المجموع الفرعي') }}</span>
                    @include('nasaq::components.store-cart._money', ['amount' => 'totals.subtotal', 'compare' => null, 'size' => 'md'])
                </div>
                <p class="text-caption text-muted-foreground">{{ $t('Shipping and taxes are worked out at checkout.', 'يُحتسب الشحن والضرائب عند إتمام الشراء.') }}</p>
                <x-nq::button variant="primary" size="lg" x-bind:disabled="blocked" x-on:click="checkout()">{{ $t('Checkout', 'إتمام الشراء') }}</x-nq::button>
                <x-nq::button variant="secondary" x-on:click="viewCart()">{{ $t('View cart', 'عرض السلة') }}</x-nq::button>
            </x-nq::sheet.footer>
        </x-nq::sheet.content>
    </x-nq::sheet>
</div>
