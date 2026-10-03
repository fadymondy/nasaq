{{-- <x-nq::store-listing.facet-sidebar :facets="$facets" :filters="$filters" currency="USD" />   Listing-scoped (the listing includes it in its aside).
     The facets as collapsible groups: categories (a tree), price (slider), brand (check list with show more), one group per product option
     (swatches or buttons), rating and availability. Counts are disjunctive: each facet counts as if its own filter were off, and values
     with no matches stay visible but disabled. Bound to the listing's filters; with target="draft" it edits the mobile sheet's draft.
     facets: nq_sl_facets(...) for the first paint. filters: nq_sl_filters(...). currency, currency-exponent. option-ids: show only these options. --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@props(['facets', 'filters', 'currency' => null, 'currencyExponent' => null, 'optionIds' => null, 'target' => 'filters'])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $f = nq_sl_filters($filters);
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-facet-sidebar') }}" role="group" aria-label="{{ nq_sl_t('facets') }}" {{ $attributes->except('data-slot')->cn('flex flex-col') }}>
    @include('nasaq::components.store-listing._facets', ['target' => $target, 'f' => $f, 'facets' => $facets, 'exp' => $exp, 'code' => $code, 'optionIds' => $optionIds])
</div>
