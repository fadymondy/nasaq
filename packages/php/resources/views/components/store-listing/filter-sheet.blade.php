{{-- <x-nq::store-listing.filter-sheet :facets="$facets" :filters="$filters" currency="USD" />   Listing-scoped; opened by the toolbar's Filters button (sheetOpen).
     The facets in a bottom sheet. Changes are held in a draft and only apply with the button, which shows the live result count (applyText). --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@props(['facets', 'filters', 'currency' => null, 'currencyExponent' => null, 'optionIds' => null, 'count' => 0])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $f = nq_sl_filters($filters);
@endphp
<x-nq::sheet x-model="sheetOpen">
    <x-nq::sheet.content side="bottom" :close-label="nq_sl_t('close')" data-slot="store-filter-sheet" class="max-h-[90dvh]">
        <x-nq::sheet.header>
            <x-nq::sheet.title>{{ nq_sl_t('filters') }}</x-nq::sheet.title>
            <x-nq::sheet.description class="sr-only">{{ nq_sl_t('facets') }}</x-nq::sheet.description>
        </x-nq::sheet.header>
        <x-nq::sheet.body>
            <div data-slot="store-facet-sidebar" role="group" aria-label="{{ nq_sl_t('facets') }}" class="flex flex-col">
                @include('nasaq::components.store-listing._facets', ['target' => 'draft', 'f' => $f, 'facets' => $facets, 'exp' => $exp, 'code' => $code, 'optionIds' => $optionIds])
            </div>
        </x-nq::sheet.body>
        <x-nq::sheet.footer class="flex-row gap-2">
            <x-nq::button variant="secondary" class="flex-1" x-on:click="clearDraft()">{{ nq_sl_t('clearAll') }}</x-nq::button>
            <x-nq::button variant="primary" class="flex-[2]" x-bind:disabled="draftCount === 0" x-on:click="applyDraft()"><span x-text="applyText">{{ $count === 0 ? nq_sl_t('applyNone') : nq_sl_t('apply', ['n' => number_format($count)]) }}</span></x-nq::button>
        </x-nq::sheet.footer>
    </x-nq::sheet.content>
</x-nq::sheet>
