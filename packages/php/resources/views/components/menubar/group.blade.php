{{-- <x-nq::menubar.group> <x-nq::menubar.label>Section</x-nq::menubar.label> items </x-nq::menubar.group> Groups items so the group is announced. --}}
<div data-slot="{{ $attributes->get('data-slot', 'menubar-group') }}" role="group" {{ $attributes->except('data-slot') }}>{{ $slot }}</div>
