{{-- <x-nq::store-listing.active-chips :filters="$filters" :index="$index" currency="USD" />   Listing-scoped.
     One removable chip per applied filter, and Clear all. Hidden when nothing is applied. Reads the listing's chips and removeChip().
     filters: nq_sl_filters(...) and index: nq_sl_label_index(...) for the first paint. include-query: show the query chip (default false). --}}
@include('nasaq::components.store-listing._strings')
@include('nasaq::components.store-listing._logic')
@props(['filters', 'index', 'currency' => null, 'currencyExponent' => null, 'includeQuery' => false])
@php
    $code = strtoupper($currency ?? \Nasaq\Nasaq::currency(app()->getLocale()));
    $exp = $currencyExponent !== null ? (int) $currencyExponent : nq_sl_exponent($code);
    $chips = nq_sl_chips(nq_sl_filters($filters), (bool) $includeQuery);
    $money = fn ($m) => nq_sl_money($m, $exp, $code);
    $chipCls = 'inline-flex h-7 items-center gap-1.5 rounded-full border border-border bg-card ps-3 pe-2 text-body-sm outline-none hover:bg-nq-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-nq-focus';
@endphp
<div data-slot="{{ $attributes->get('data-slot', 'store-active-chips') }}" role="group" aria-label="{{ nq_sl_t('activeFilters') }}" x-show="chips.length" @unless (count($chips)) style="display: none" @endunless
    {{ $attributes->except('data-slot')->cn('flex flex-wrap items-center gap-2') }}>
    <template x-for="chip in chips" x-bind:key="chip.id">
        <button type="button" x-bind:aria-label="s('removeFilter', { label: chipLabel(chip) })" x-on:click="removeChip(chip)" class="{{ $chipCls }}">
            <bdi x-text="chipLabel(chip)"></bdi>
            <x-lucide-x aria-hidden="true" class="size-3.5 text-muted-foreground" />
        </button>
    </template>
    @foreach ($chips as $chip)
        @php $label = nq_sl_chip_label($chip, $index, $money); @endphp
        <button type="button" data-ssr aria-label="{{ nq_sl_t('removeFilter', ['label' => $label]) }}" class="{{ $chipCls }}">
            <bdi>{{ $label }}</bdi>
            <x-lucide-x aria-hidden="true" class="size-3.5 text-muted-foreground" />
        </button>
    @endforeach
    <x-nq::button variant="link" size="sm" x-on:click="clearAll()">{{ nq_sl_t('clearAll') }}</x-nq::button>
</div>
