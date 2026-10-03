{{-- <x-nq::store-cart :lines="$lines" currency="USD" :free-shipping-threshold="15000" x-on:store-cart-checkout="location.href = '/checkout'" />
     The cart page: lines with a clamped quantity stepper, remove with an undo bar (8 seconds), save for later and move back, stock warnings, the free-shipping bar,
     a promo code, a shipping estimator, the summary with savings, a cross-sell slot, and empty, loading and error states. Cart changes are announced through a polite
     live region. The first paint is server-rendered (the lines, the count, the totals, the free-shipping bar, the stock warnings), and the browser (nqStoreCart) takes over
     at once: it drops the server rows and draws the lines from its own state, so totals, the free-shipping bar, the undo bar and the announcer follow every change. Money is minor units (cents). Needs the Alpine runtime (@nasaqScripts).

     lines: [['id', 'productId', 'variantId', 'name', 'variantLabel'?, 'image'?, 'unitPrice', 'compareAt'?, 'quantity', 'maxQuantity'?, 'savedForLater'?]].
     currency: ISO code (USD, or SAR in Arabic, when omitted). free-shipping-threshold: minor units; leave out to hide the bar.
     zones: delivery zones for the estimator (see store-cart.shipping-estimator); leave out to hide it.
     promo: turns on the promo box (x-nq::loyalty-promo.promo-code-field): ['applied' => ['code', 'discount'], 'promos' => [...], 'firstOrder'?, 'today'?].
     tax-bps, tax-inclusive: a tax rate in basis points. key: parts with the same key share one cart (the mini cart and the page share "default").
     Controls (React and Vue hide a control whose callback is not passed; here the flags are all true, and false hides the control): quantity (the stepper), remove, save (Save for
     later and Move to cart), open-product (View product), fix-stock (Adjust quantities), checkout (the button), continue-shopping (the links), retry (Try again).
     feedback: drawer (adding opens the mini cart, default) | none. undo-ms: how long the undo bar stays (8000; 0 keeps it). loading / error: the two states.
     Slots: <x-slot:cross-sell> under the lines (usually <x-nq::store-cart.cross-sell>), <x-slot:summary-footer> under the total (payment badges, a guarantee).

     Events (React's callbacks), bubbling from the cart; listen on it, an ancestor or window:
       store-cart-quantity { lineId, quantity, line }   store-cart-remove { lineId, line }   store-cart-undo { line }   store-cart-save { lineId, line }
       store-cart-move { lineId, line }   store-cart-checkout { lines, totals } (not fired while a line is out of stock)   store-cart-continue
       store-cart-open-product { line } (a cross-sell card sends { productId, name })   store-cart-shipping-change { selection }
       store-cart-change { lines } (after every change, to persist the cart)   store-cart-retry
     In: window "store-cart-add" { item, quantity } adds a product (the cross-sell Add button fires it; cancelable). Parts: store-cart.mini-cart, .line-item, .quantity-stepper,
     .summary, .shipping-estimator, .cross-sell, .free-shipping, .empty, .button, .announcer, .image. --}}
@include('nasaq::components.store-cart._logic')
@props([
    'lines' => [], 'currency' => null, 'freeShippingThreshold' => null, 'zones' => null, 'promo' => null, 'taxBps' => null, 'taxInclusive' => null,
    'key' => 'default', 'feedback' => 'drawer', 'undoMs' => 8000, 'loading' => false, 'error' => false,
    'quantity' => true, 'remove' => true, 'save' => true, 'openProduct' => true, 'fixStock' => true, 'checkout' => true, 'continueShopping' => true, 'retry' => true,
])
@php
    $t = fn (string $en, string $ar) => \Nasaq\Nasaq::t($en, $ar);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency());
    $lines = array_values((array) $lines);
    $zones = $zones ? array_values((array) $zones) : [];
    $activeLines = array_values(array_filter($lines, fn ($l) => ! nq_cart_saved($l)));
    $savedLines = array_values(array_filter($lines, fn ($l) => nq_cart_saved($l)));
    $discount = (int) ($promo['applied']['discount'] ?? 0);
    $totals = nq_cart_totals($lines, $discount, $taxBps ? (int) $taxBps : null, (bool) $taxInclusive);
    $subtotal = $totals['subtotal'];
    $blockers = array_filter($activeLines, fn ($l) => in_array(nq_cart_stock_issue($l)['kind'] ?? null, ['out', 'over'], true));
    $blocked = count($blockers) > 0;
    $canFix = count(array_filter($blockers, fn ($l) => isset($l['maxQuantity']) && $l['maxQuantity'] > 0)) > 0;
    $hasActive = count($activeLines) > 0;
    $hasSaved = count($savedLines) > 0;
    $showEmpty = ! $error && ! $loading && ! $lines;
    $showContent = ! $error && ! $loading && $lines;
    $config = [
        'lines' => $lines, 'currency' => $code, 'exponent' => nq_cart_exponent($code), 'freeShippingThreshold' => $freeShippingThreshold, 'zones' => $zones,
        'taxBps' => $taxBps, 'taxInclusive' => $taxInclusive, 'promo' => $promo ? ['applied' => $promo['applied'] ?? null] : null, 'key' => $key, 'feedback' => $feedback,
        'undoMs' => (int) $undoMs, 'loading' => (bool) $loading, 'error' => (bool) $error,
    ];
    $promoContext = ['subtotal' => $subtotal, 'today' => $promo['today'] ?? date('Y-m-d')] + (isset($promo['firstOrder']) ? ['firstOrder' => $promo['firstOrder']] : []);
    $listClass = 'flex flex-col divide-y divide-border border-y border-border';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-cart-page') }}" x-data="nqStoreCart(@js($config))"
    x-on:store-cart-add.window="onAdd($event)" x-on:nq-promo-apply.capture="wrapPromo($event)" x-on:nq-promo-applied="promoApplied($event)" x-on:nq-promo-remove="promoRemoved()"
    {{ $attributes->except('data-slot')->cn('mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6') }}>
    <x-nq::store-cart.announcer />
    <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h1 class="text-h1 font-semibold tracking-tight text-foreground">
            {{ $t('Cart', 'السلة') }}
            <span x-show="hasActive" @unless ($hasActive) style="display: none" @endunless class="ms-2 text-body font-normal text-muted-foreground" x-text="countText">{{ nq_cart_items_text($totals['itemCount']) }}</span>
        </h1>
        @if ($continueShopping)
            <x-nq::button variant="link" x-show="hasActive" :style="$hasActive ? null : 'display: none'" x-on:click="continueShopping()">{{ $t('Continue shopping', 'متابعة التسوق') }}</x-nq::button>
        @endif
    </div>

    <div x-show="showError" @if (! $error) style="display: none" @endif>
        <x-nq::states.error :title="$t('We could not load your cart', 'تعذّر تحميل سلتك')" :description="$t('Check your connection and try again.', 'تحقق من اتصالك بالإنترنت وحاول مرة أخرى.')">
            @if ($retry)
                <div class="mt-1 flex flex-wrap items-center justify-center gap-2">
                    <x-nq::button variant="primary" x-on:click="retry()">{{ $t('Try again', 'حاول مرة أخرى') }}</x-nq::button>
                </div>
            @endif
        </x-nq::states.error>
    </div>
    <div x-show="showLoading" @if (! $loading || $error) style="display: none" @endif role="status" aria-busy="true" aria-label="{{ $t('Loading your cart', 'جارٍ تحميل سلتك') }}" class="flex flex-col gap-4">
        @foreach ([1, 2, 3] as $i)
            <div class="flex gap-4 py-2">
                <x-nq::states.skeleton class="size-22 shrink-0" />
                <div class="flex flex-1 flex-col gap-2">
                    <x-nq::states.skeleton class="h-4 w-2/3" />
                    <x-nq::states.skeleton class="h-3 w-1/3" />
                    <x-nq::states.skeleton class="mt-2 h-8 w-28" />
                </div>
            </div>
        @endforeach
    </div>
    <x-nq::store-cart.empty x-show="showEmpty" :action="$continueShopping" :style="$showEmpty ? null : 'display: none'" />
    <div x-show="showContent" @unless ($showContent) style="display: none" @endunless class="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <div class="flex min-w-0 flex-col gap-6">
            <div x-show="blocked" @unless ($blocked) style="display: none" @endunless>
                <x-nq::alert tone="warning" :title="$t('Some items need attention', 'بعض المنتجات تحتاج إلى انتباهك')">
                    {{ $t('Adjust or remove them to continue to checkout.', 'عدّل الكميات أو أزل هذه المنتجات لتتمكن من إتمام الشراء.') }}
                    <x-slot:action>
                        @if ($fixStock)
                            <x-nq::button size="sm" variant="secondary" x-show="canFix" :style="$canFix ? null : 'display: none'" x-on:click="fixStock()">{{ $t('Adjust quantities', 'ضبط الكميات') }}</x-nq::button>
                        @endif
                    </x-slot:action>
                </x-nq::alert>
            </div>
            @if ($freeShippingThreshold)
                <x-nq::store-cart.free-shipping x-show="hasActive" :style="$hasActive ? null : 'display: none'" :subtotal="$subtotal" :threshold="$freeShippingThreshold" :currency="$code" class="rounded-card border border-border bg-card p-4" />
            @endif
            <div x-show="removed" style="display: none" data-slot="store-cart-removed" class="flex items-center justify-between gap-3 rounded-control border border-border bg-secondary px-3 py-2 text-body-sm text-foreground">
                <span class="min-w-0 [overflow-wrap:anywhere]" x-text="removedText"></span>
                <x-nq::button variant="link" size="sm" x-on:click="undo()">
                    <x-lucide-undo-2 aria-hidden="true" />
                    {{ $t('Undo', 'تراجع') }}
                </x-nq::button>
            </div>
            <ul role="list" aria-label="{{ $t('Cart', 'السلة') }}" x-show="hasActive" @unless ($hasActive) style="display: none" @endunless class="{{ $listClass }}">
                @foreach ($activeLines as $line)
                    <x-nq::store-cart.line-item :ssr="$line" :currency="$code" :quantity="$quantity" :remove="$remove" :save="$save" :open-product="$openProduct" />
                @endforeach
                <template x-for="line in active" :key="line.id"><x-nq::store-cart.line-item :quantity="$quantity" :remove="$remove" :save="$save" :open-product="$openProduct" /></template>
            </ul>
            <x-nq::store-cart.empty x-show="showEmptyActive" :action="$continueShopping" :style="$hasActive || ! $showContent ? 'display: none' : null" />
            <section x-show="hasSaved" @unless ($hasSaved) style="display: none" @endunless class="flex flex-col gap-2" x-id="['store-saved']" x-bind:aria-labelledby="$id('store-saved')">
                <div class="flex flex-col gap-0.5">
                    <h2 x-bind:id="$id('store-saved')" class="text-h3 font-semibold text-foreground" x-text="savedTitle">{{ $t('Saved for later ('.count($savedLines).')', 'محفوظ لوقت لاحق ('.count($savedLines).')') }}</h2>
                    <p class="text-caption text-muted-foreground">{{ $t('These are not part of your order until you move them back.', 'هذه المنتجات ليست ضمن طلبك حتى تعيدها إلى السلة.') }}</p>
                </div>
                <ul role="list" class="{{ $listClass }}">
                    @foreach ($savedLines as $line)
                        <x-nq::store-cart.line-item saved :ssr="$line" :currency="$code" :quantity="$quantity" :remove="$remove" :save="$save" :open-product="$openProduct" />
                    @endforeach
                    <template x-for="line in saved" :key="line.id"><x-nq::store-cart.line-item saved :quantity="$quantity" :remove="$remove" :save="$save" :open-product="$openProduct" /></template>
                </ul>
            </section>
            {{ $crossSell ?? '' }}
        </div>
        <aside aria-label="{{ $t('Order summary', 'ملخص الطلب') }}" x-show="hasActive" @unless ($hasActive) style="display: none" @endunless class="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4">
            <x-nq::store-cart.summary :checkout="$checkout" :totals="$totals" :currency="$code" :blocked="$blocked">{{ $summaryFooter ?? '' }}</x-nq::store-cart.summary>
            @if ($promo)
                <section aria-label="{{ $t('Promo code', 'رمز الخصم') }}" class="rounded-card border border-border bg-card p-4">
                    <x-nq::loyalty-promo.promo-code-field :currency="$code" :applied="$promo['applied'] ?? null" :promos="$promo['promos'] ?? null" :context="$promoContext" />
                </section>
            @endif
            @if ($zones)
                <x-nq::store-cart.shipping-estimator :zones="$zones" />
            @endif
        </aside>
    </div>
</div>
