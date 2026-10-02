{{-- <x-nq::chip-group aria-label="Categories" default-value="all"> <x-nq::chip-group.chip value="all">All</x-nq::chip-group.chip> </x-nq::chip-group>
     A single-select row of filter chips; scrolls sideways on narrow screens. aria-label is required.
     The selected value is x-modelable: wire:model="category" works. Needs the Alpine runtime (@nasaqScripts). --}}
@props(['defaultValue' => null])
<div role="group" data-slot="{{ $attributes->get('data-slot', 'chip-group') }}" x-data="nqChipGroup(@js($defaultValue))" x-modelable="value"
    {{ $attributes->except('data-slot')->cn('-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden') }}>
    {{ $slot }}
</div>
