{{-- <x-nq::web-vital-gauge.grid> <x-nq::web-vital-gauge metric="LCP" :value="2900" /> … </x-nq::web-vital-gauge.grid>
     Lays several gauges out: as many columns as fit, each at least 12.5rem. selectable (with selected="LCP") holds the single-choice state of
     selectable gauges (Alpine nqMetricTiles); choosing one dispatches a bubbling "nq-select" ({ id: metric }). --}}
@props(['selectable' => false, 'selected' => null])
<div data-slot="{{ $attributes->get('data-slot', 'web-vital-gauge-grid') }}" @if ($selectable) x-data="nqMetricTiles(@js($selected))" @endif {{ $attributes->except('data-slot')->cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,12.5rem),1fr))] gap-3') }}>{{ $slot }}</div>
