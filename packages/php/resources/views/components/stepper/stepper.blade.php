{{-- <x-nq::stepper :current="1" aria-label="Setup steps"> <x-nq::stepper.item title="Account" description="Name and email" /> ... </x-nq::stepper>
     A row (or column) of steps with connectors. current: zero-based index of the current step; earlier steps are complete,
     later ones upcoming. orientation: horizontal (runs along the inline axis, so right to left in RTL) | vertical.
     Items count themselves in order; no JavaScript needed. --}}
@props(['current' => 0, 'orientation' => 'horizontal'])
<ol data-slot="stepper" data-orientation="{{ $orientation }}" {{ $attributes->cn(['m-0 flex list-none p-0', $orientation === 'horizontal' ? 'flex-row items-start' : 'flex-col']) }}>
    {{ $slot }}
</ol>
@php
    // The items above counted themselves; start the next stepper from zero.
    app()->forgetInstance('nq.stepper.index');
@endphp
