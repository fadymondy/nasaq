{{-- <x-nq::menubar.sub> <x-nq::menubar.sub-trigger>More</x-nq::menubar.sub-trigger> <x-nq::menubar.sub-content> items </x-nq::menubar.sub-content> </x-nq::menubar.sub>
     A submenu. Put it inside menubar.content. --}}
<div data-slot="{{ $attributes->get('data-slot', 'menubar-sub') }}" role="none" x-data="nqMenubarSub()" {{ $attributes->except('data-slot')->cn('contents') }}>{{ $slot }}</div>
