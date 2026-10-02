{{-- <x-nq::context-menu.sub> <x-nq::context-menu.sub-trigger>More</x-nq::context-menu.sub-trigger> <x-nq::context-menu.sub-content> items </x-nq::context-menu.sub-content> </x-nq::context-menu.sub>
     A submenu. Put it inside context-menu.content. --}}
<div data-slot="{{ $attributes->get('data-slot', 'context-menu-sub') }}" role="none" x-data="nqContextSub()" {{ $attributes->except('data-slot')->cn('contents') }}>{{ $slot }}</div>
