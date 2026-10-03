{{-- <x-nq::store-settings.discount-simulator :discounts="$discounts" :products="$products" :collections="$collections" currency="USD" now="2026-09-29T09:00:00" />
     Try a basket against the discounts: pick items, type codes and past orders, and see which discounts apply, what each takes off, what is rejected and why, and the new total.
     discounts: the same array the discounts manager takes. products: [['id', 'name', 'variants' => [['id', 'price' (minor units), 'compareAt'?]]]]. collections: [['id', 'name', 'productIds' => []]].
     now: an ISO date-time treated as now. currency: USD, or SAR in Arabic. labels: override any string by key. Needs the Alpine runtime (@nasaqScripts). --}}
@include('nasaq::components.store-settings._words')
@props(['discounts' => [], 'products' => [], 'collections' => [], 'currency' => null, 'now' => null, 'labels' => [], 'locale' => null])
@php
    $locale ??= app()->getLocale();
    $t = nq_store_settings_words($locale, (array) $labels);
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency($locale));
    $config = ['discounts' => array_values((array) $discounts), 'products' => array_values((array) $products), 'collections' => array_values((array) $collections), 'currency' => $code, 'locale' => str_starts_with($locale, 'ar') ? 'ar' : 'en', 'labels' => (array) $labels, 'now' => $now];
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'discount-simulator') }}" x-data="nqDiscountSimulator(@js($config))" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-col gap-3 rounded-card border border-border bg-card p-4') }}>
    @include('nasaq::components.store-settings._simulator')
</div>
