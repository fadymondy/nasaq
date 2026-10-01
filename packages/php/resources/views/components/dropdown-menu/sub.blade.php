{{-- <x-nq::dropdown-menu.sub> <x-nq::dropdown-menu.sub-trigger>More</x-nq::dropdown-menu.sub-trigger> <x-nq::dropdown-menu.sub-content> items </x-nq::dropdown-menu.sub-content> </x-nq::dropdown-menu.sub>
     A submenu. Put it inside dropdown-menu.content. --}}
<div data-slot="dropdown-menu-sub" role="none" x-data="nqDropdownSub()" {{ $attributes->cn('contents') }}>{{ $slot }}</div>
