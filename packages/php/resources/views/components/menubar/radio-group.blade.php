{{-- <x-nq::menubar.radio-group value="asc"> <x-nq::menubar.radio-item value="asc">Ascending</x-nq::menubar.radio-item> ... </x-nq::menubar.radio-group>
     One choice among radio items. value: the selected value (x-modelable: x-model="$wire.sort"). --}}
@props(['value' => null])
<div data-slot="menubar-radio-group" role="group" x-data="{ value: @js($value) }" x-modelable="value" {{ $attributes }}>{{ $slot }}</div>
