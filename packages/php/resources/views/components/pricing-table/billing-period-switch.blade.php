{{-- <x-nq::pricing-table.billing-period-switch :savings="20" x-model="sel" />
     Monthly / Yearly, with the yearly saving on a badge. Inside <x-nq::pricing-table> it is wired for you. On its own, x-model / wire:model binds the toggle group's value: an array holding "month" or "year".
     period: the pressed one at first (default month). savings: the yearly saving to advertise, in percent (0 hides the badge). labels: overrides for monthly, yearly, save (":n%") and period. --}}
@props(['period' => 'month', 'savings' => 0, 'labels' => []])
@include('nasaq::components.pricing-table._pricing')
@php $t = nq_pricing_labels((array) $labels); @endphp
<div data-slot="billing-period-switch" class="flex items-center gap-2">
    <x-nq::toggle-group :default-value="[$period]" aria-label="{{ $t['period'] }}" {{ $attributes }}>
        <x-nq::toggle-group.toggle value="month" class="px-3">{{ $t['monthly'] }}</x-nq::toggle-group.toggle>
        <x-nq::toggle-group.toggle value="year" class="gap-2 px-3">
            {{ $t['yearly'] }}
            @if ($savings > 0)<x-nq::badge variant="accent" class="h-5 px-1.5">{{ nq_pricing_fill($t['save'], ['n' => $savings]) }}</x-nq::badge>@endif
        </x-nq::toggle-group.toggle>
    </x-nq::toggle-group>
</div>
