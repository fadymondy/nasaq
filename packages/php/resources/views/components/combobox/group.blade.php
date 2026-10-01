{{-- <x-nq::combobox.group> <x-nq::combobox.label>Group</x-nq::combobox.label> items </x-nq::combobox.group> Hides itself when none of its items match. --}}
<div data-slot="combobox-group" x-bind="group" {{ $attributes }}>{{ $slot }}</div>
