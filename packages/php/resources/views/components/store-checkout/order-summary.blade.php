{{-- <x-nq::store-checkout.order-summary can-edit-cart />
     The order summary beside the checkout form: folded behind a toggle on small screens, always open from the lg breakpoint; items with quantity badges, then subtotal, discount, shipping,
     tax, cash on delivery fee, gift wrap, total and "You save". It lives inside <x-nq::store-checkout> and follows its state. can-edit-cart shows "Edit cart" (fires "nq-store-checkout-edit-cart").
     labels: string overrides keyed like the checkout strings. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-checkout._strings')
@props(['canEditCart' => false, 'labels' => []])
@php
    $t = nq_store_checkout_t((array) $labels);
    $row = 'flex items-baseline justify-between gap-3 text-body-sm';
@endphp
<aside data-slot="{{ $attributes->get('data-slot', 'store-order-summary') }}" aria-label="{{ $t['summary'] }}" x-id="['nq-co-summary']" {{ $attributes->except('data-slot')->cn('flex flex-col rounded-card border border-border bg-card') }}>
    <button type="button" x-on:click="summaryOpen = ! summaryOpen" aria-expanded="false" x-bind:aria-expanded="summaryOpen ? 'true' : 'false'" x-bind:aria-controls="$id('nq-co-summary')"
        class="flex w-full items-center justify-between gap-3 rounded-card p-4 text-start outline-none focus-visible:outline-2 focus-visible:outline-nq-focus lg:hidden">
        <span class="flex items-center gap-2 text-label text-foreground">
            <x-lucide-shopping-bag aria-hidden="true" class="size-4" />
            <span x-text="summaryToggleLabel">{{ $t['showSummary'] }}</span>
            <x-lucide-chevron-down aria-hidden="true" class="size-4 transition-transform motion-reduce:transition-none" x-bind:class="{ 'rotate-180': summaryOpen }" />
        </span>
        @include('nasaq::components.store-cart._money', ['amount' => 'summary.payable', 'compare' => null, 'size' => 'sm'])
    </button>
    <div x-bind:id="$id('nq-co-summary')" x-bind:class="{ 'flex': summaryOpen, 'hidden': ! summaryOpen }" class="hidden flex-col gap-4 p-4 pt-0 lg:flex lg:pt-4">
        <div class="flex items-center justify-between gap-3">
            <h2 class="hidden text-h3 font-semibold text-foreground lg:block">{{ $t['summary'] }}</h2>
            @if ($canEditCart)
                <x-nq::button variant="link" size="sm" class="ms-auto" x-on:click="editCart()">{{ $t['editCart'] }}</x-nq::button>
            @endif
        </div>
        <ul class="flex flex-col gap-3">
            <template x-for="line in active" x-bind:key="line.id">
                <li class="flex items-center gap-3">
                    <span class="relative shrink-0">
                        <x-nq::store-cart.image :size="48" src-expr="line.image" alt-expr="line.name" />
                        <span aria-hidden="true" x-text="n(line.quantity)" class="absolute -end-1.5 -top-1.5 inline-flex min-w-5 items-center justify-center rounded-full bg-foreground px-1 text-[0.6875rem] font-medium leading-5 text-background"></span>
                    </span>
                    <span class="flex min-w-0 flex-1 flex-col">
                        <span class="text-body-sm font-medium text-foreground [overflow-wrap:anywhere]" x-text="line.name"></span>
                        <span class="text-caption text-muted-foreground" x-text="lineMeta(line)"></span>
                    </span>
                    <span class="text-body-sm text-foreground"><bdi class="tabular-nums" x-text="lineTotal(line)"></bdi></span>
                </li>
            </template>
        </ul>
        <dl class="flex flex-col gap-2 border-t border-border pt-3">
            <div class="{{ $row }}">
                <dt class="text-muted-foreground" x-text="subtotalLabel">{{ $t['subtotal'] }}</dt>
                <dd class="text-foreground"><bdi class="tabular-nums" x-text="money(summary.subtotal)"></bdi></dd>
            </div>
            <div class="{{ $row }}" x-show="hasDiscount" style="display: none">
                <dt class="text-muted-foreground">{{ $t['discount'] }}</dt>
                <dd class="text-foreground"><span class="text-nq-success-text"><bdi dir="ltr">&minus;</bdi><bdi class="tabular-nums" x-text="money(summary.discount)"></bdi></span></dd>
            </div>
            <div class="{{ $row }}">
                <dt class="text-muted-foreground" x-text="shippingLabel">{{ $t['shipping'] }}</dt>
                <dd class="text-foreground">
                    <span x-show="shippingFree" style="display: none" class="text-nq-success-text">{{ $t['free'] }}</span>
                    <bdi x-show="shippingPaid" style="display: none" class="tabular-nums" x-text="money(summary.shipping)"></bdi>
                    <span x-show="noMethod" class="text-muted-foreground">{{ $t['shippingPending'] }}</span>
                </dd>
            </div>
            <div class="{{ $row }}" x-show="hasTax" style="display: none">
                <dt class="text-muted-foreground">{{ $t['tax'] }}</dt>
                <dd class="text-foreground"><bdi class="tabular-nums" x-text="money(summary.tax)"></bdi></dd>
            </div>
            <div class="{{ $row }}" x-show="hasCodFee" style="display: none">
                <dt class="text-muted-foreground">{{ $t['codFee'] }}</dt>
                <dd class="text-foreground"><bdi class="tabular-nums" x-text="money(summary.codFee)"></bdi></dd>
            </div>
            <div class="{{ $row }}" x-show="hasWrapFee" style="display: none">
                <dt class="text-muted-foreground">{{ $t['giftWrapRow'] }}</dt>
                <dd class="text-foreground"><bdi class="tabular-nums" x-text="money(summary.giftWrapFee)"></bdi></dd>
            </div>
        </dl>
        <div class="flex items-baseline justify-between gap-3 border-t border-border pt-3">
            <span class="text-label text-foreground">{{ $t['total'] }}</span>
            @include('nasaq::components.store-cart._money', ['amount' => 'summary.payable', 'compare' => null, 'size' => 'lg'])
        </div>
        <span data-slot="badge" x-show="hasSavings" style="display: none" x-text="savingText" class="inline-flex h-5 w-fit shrink-0 items-center gap-1 whitespace-nowrap rounded-[4px] border border-nq-success/40 bg-nq-success-soft px-1.5 text-caption font-medium text-nq-success-text"></span>
    </div>
</aside>
