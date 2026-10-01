{{-- <x-nq::sidebar-layout.sortable> sortable-item × n </x-nq::sidebar-layout.sortable>
     The list the sortable items live in. A flex column: the saved order is applied to its items with CSS order. --}}
<div data-slot="sidebar-sortable" {{ $attributes->cn('flex flex-col') }}>{{ $slot }}</div>
