{{-- <x-nq::store-cart.summary> optional footer (payment badges, a guarantee) </x-nq::store-cart.summary>
     The order summary: items, promo discount, shipping ("Calculated at checkout" until an estimate is picked), tax, total, "You are saving ..." and Checkout.
     Inside the cart page, so it follows every change. checkout="false" leaves the button out.
     totals, currency: the server-rendered figures the bindings start from (the cart page passes them; the browser takes over at once). Checkout is off while a line is out of stock, and fires
     "store-cart-checkout" { lines, totals }. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['checkout' => true, 'totals' => null, 'currency' => null, 'blocked' => false])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $tt = is_array($totals) ? $totals : null;
    $m = fn (int $minor) => $tt ? nq_cart_money($minor, $code) : '';
    $row = 'flex items-baseline justify-between gap-3 text-body-sm';
@endphp
<section data-slot="{{ $attributes->get('data-slot', 'store-cart-summary') }}" x-id="['store-cart-summary']" x-bind:aria-labelledby="$id('store-cart-summary')"
    {{ $attributes->except('data-slot')->cn('flex flex-col gap-4 rounded-card border border-border bg-card p-4') }}>
    <h2 x-bind:id="$id('store-cart-summary')" class="text-h3 font-semibold text-foreground">{{ $t('Order summary', 'ملخص الطلب') }}</h2>
    <dl class="flex flex-col gap-2">
        <div class="{{ $row }}">
            <dt class="text-muted-foreground" x-text="countText">{{ $tt ? nq_cart_items_text($tt['itemCount']) : '' }}</dt>
            <dd class="text-foreground" x-text="money(totals.subtotal)">{{ $m($tt['subtotal'] ?? 0) }}</dd>
        </div>
        <div x-show="hasDiscount" @if (! $tt || $tt['discount'] <= 0) style="display: none" @endif class="{{ $row }}">
            <dt class="text-muted-foreground">{{ $t('Promo discount', 'خصم الرمز') }}</dt>
            <dd class="text-foreground">
                <span class="text-nq-success-text"><bdi dir="ltr">&minus;</bdi><span x-text="money(totals.discount)">{{ $m($tt['discount'] ?? 0) }}</span></span>
            </dd>
        </div>
        <div class="{{ $row }}">
            <dt class="text-muted-foreground">{{ $t('Shipping', 'الشحن') }}</dt>
            <dd class="text-foreground">
                <span x-show="shippingFree" style="display: none" class="text-nq-success-text">{{ $t('Free', 'مجاني') }}</span>
                <span x-show="shippingPaid" style="display: none" x-text="money(totals.shipping)"></span>
                <span x-show="noShipping" class="text-muted-foreground">{{ $t('Calculated at checkout', 'يُحتسب عند إتمام الشراء') }}</span>
            </dd>
        </div>
        <div x-show="hasTax" @if (! $tt || $tt['tax'] <= 0) style="display: none" @endif class="{{ $row }}">
            <dt class="text-muted-foreground">{{ $t('Tax', 'الضريبة') }}</dt>
            <dd class="text-foreground" x-text="money(totals.tax)">{{ $m($tt['tax'] ?? 0) }}</dd>
        </div>
    </dl>
    <div class="flex items-baseline justify-between gap-3 border-t border-border pt-3">
        <span class="text-label text-foreground">{{ $t('Total', 'الإجمالي') }}</span>
        @include('nasaq::components.store-cart._money', ['amount' => 'totals.total', 'compare' => null, 'size' => 'lg', 'amountText' => $tt ? nq_cart_price($tt['total'], $code) : null, 'compareText' => null])
    </div>
    <div x-show="hasSavings" @if (! $tt || $tt['savings'] <= 0) style="display: none" @endif class="w-fit"><x-nq::badge variant="success"><span x-text="savingText">{{ $tt && $tt['savings'] > 0 ? $t('You are saving '.$m($tt['savings']), 'وفّرت '.$m($tt['savings'])) : '' }}</span></x-nq::badge></div>
    @if ($checkout)
        <x-nq::button variant="primary" size="lg" x-bind:disabled="checkoutDisabled" :disabled="$tt ? ($tt['itemCount'] === 0 || ! empty($blocked)) : null" x-on:click="checkout()">{{ $t('Checkout', 'إتمام الشراء') }}</x-nq::button>
    @endif
    {{ $slot }}
</section>
