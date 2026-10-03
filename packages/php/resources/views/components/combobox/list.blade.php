{{-- <x-nq::combobox.list> items </x-nq::combobox.list> The list wrapper; items filter themselves as the user types. --}}
<div data-slot="{{ $attributes->get('data-slot', 'combobox-list') }}" {{ $attributes->except('data-slot')->cn('outline-none') }}>{{ $slot }}</div>
