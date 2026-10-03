{{-- <x-nq::store-cart.button :count="2" />
     The cart button for a header: a cart icon with a count badge (hidden at zero). Inside the cart or mini cart it follows the cart count; count is only
     the first paint. As the mini cart's trigger slot it opens the drawer. The accessible name reads "Cart, 2 items".
     Needs the Alpine runtime (@nasaqScripts). --}}
@props(['count' => 0])
@php
    $n = max(0, (int) $count);
    $ar = $n === 1 ? 'عنصر واحد' : ($n === 2 ? 'عنصران' : ($n <= 10 ? $n.' عناصر' : $n.' عنصرًا'));
    $label = $n > 0 ? \Nasaq\Nasaq::t('Cart, '.$n.($n === 1 ? ' item' : ' items'), 'السلة، '.$ar) : \Nasaq\Nasaq::t('Cart', 'السلة');
@endphp
<x-nq::button variant="ghost" size="icon" aria-label="{{ $label }}" x-bind:aria-label="cartLabel" {{ $attributes->cn('relative') }}>
    <x-lucide-shopping-cart aria-hidden="true" />
    <span data-slot="store-cart-count" aria-hidden="true" @if ($n === 0) style="display: none" @endif x-show="hasCount" x-text="countBadge"
        class="absolute -end-1 -top-1 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.6875rem] font-medium leading-4 text-primary-foreground">{{ $n }}</span>
</x-nq::button>
