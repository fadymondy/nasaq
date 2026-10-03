{{-- <x-nq::context-menu.group> <x-nq::context-menu.label>Section</x-nq::context-menu.label> items </x-nq::context-menu.group> Groups items so the group is announced. --}}
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-group') }}" role="group" {{ $attributes->except('data-slot') }}>{{ $slot }}</div>
