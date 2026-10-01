{{-- <x-nq.money :amount="$order->total" />
     currency defaults to USD, or SAR when the locale is Arabic. :compare-at="$order->list_price" adds the struck-through original price.
     Uses PHP intl (NumberFormatter) with Latin digits; falls back to "USD 12.00" when intl is missing. --}}
@props(['amount', 'currency' => null, 'compareAt' => null, 'locale' => null])
@php
    $locale = $locale ?? app()->getLocale();
    $currency = $currency ?? (str_starts_with($locale, 'ar') ? 'SAR' : 'USD');
    $fmt = function ($n) use ($locale, $currency) {
        if (class_exists(\NumberFormatter::class)) {
            return (new \NumberFormatter($locale.'@numbers=latn', \NumberFormatter::CURRENCY))->formatCurrency((float) $n, $currency);
        }
        return $currency.' '.number_format((float) $n, 2);
    };
@endphp
<span {{ $attributes->merge(['class' => 'nq-price']) }}><span>{{ $fmt($amount) }}</span>@if ($compareAt !== null)<s>{{ $fmt($compareAt) }}</s>@endif</span>
