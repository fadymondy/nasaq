{{-- <x-nq::select.group> <x-nq::select.label>Group</x-nq::select.label> items </x-nq::select.group> --}}
<div data-slot="{{ $attributes->get('data-slot', 'select-group') }}" role="group" {{ $attributes->except('data-slot') }}>{{ $slot }}</div>
