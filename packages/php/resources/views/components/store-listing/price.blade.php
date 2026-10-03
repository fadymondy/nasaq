{{-- <x-nq::store-listing.price :amount="2900" :compare-at="3900" from />
     A price in integer minor units (cents), with the struck-through original when on sale and an optional "From" prefix.
     currency: ISO code (USD, or SAR in Arabic, when omitted). currency-exponent: digits of the minor unit (default from the currency).
     size: sm | md | lg. Static markup; the product card keeps its own live copy. --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@props(['amount', 'compareAt' => null, 'currency' => null, 'currencyExponent' => null, 'from' => false, 'size' => 'md'])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $major = fn ($n) => $n / (10 ** $exp);
@endphp
<span data-slot="{{ $attributes->get('data-slot', 'store-price') }}" {{ $attributes->except('data-slot')->cn('inline-flex flex-wrap items-baseline gap-x-1.5') }}>
    @if ($from)<span class="text-caption text-muted-foreground">{{ nq_sl_t('from') }}</span>@endif
    <x-nq::price :amount="$major($amount)" :currency="$code" :compare-at="$compareAt !== null ? $major($compareAt) : null" :size="$size" :fraction-digits="floor($major($amount)) == $major($amount) && ($compareAt === null || floor($major($compareAt)) == $major($compareAt)) ? 0 : $exp" />
</span>
