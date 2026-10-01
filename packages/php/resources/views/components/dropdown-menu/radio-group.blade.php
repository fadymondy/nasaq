{{-- <x-nq::dropdown-menu.radio-group value="asc"> <x-nq::dropdown-menu.radio-item value="asc">Ascending</x-nq::dropdown-menu.radio-item> ... </x-nq::dropdown-menu.radio-group>
     One choice among radio items. value: the selected value (x-modelable: x-model="$wire.sort"). --}}
@props(['value' => null])
<div data-slot="dropdown-menu-radio-group" role="group" x-data="{ value: @js($value) }" x-modelable="value" {{ $attributes }}>{{ $slot }}</div>
