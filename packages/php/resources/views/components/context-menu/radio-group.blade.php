{{-- <x-nq::context-menu.radio-group value="asc"> <x-nq::context-menu.radio-item value="asc">Ascending</x-nq::context-menu.radio-item> ... </x-nq::context-menu.radio-group>
     One choice among radio items. value: the selected value (x-modelable: x-model="$wire.sort"). --}}
@props(['value' => null])
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-radio-group') }}" role="group" x-data="{ value: @js($value) }" x-modelable="value" {{ $attributes->except('data-slot') }}>{{ $slot }}</div>
