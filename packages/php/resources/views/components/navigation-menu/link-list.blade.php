{{-- <x-nq::navigation-menu.link-list :columns="2"> <x-nq::navigation-menu.link-item .../> </x-nq::navigation-menu.link-list>   columns: 1 | 2 | 3 from the sm breakpoint up. --}}
@props(['columns' => 1])
<ul data-slot="{{ $attributes->get('data-slot', 'navigation-menu-link-list') }}"
    {{ $attributes->except('data-slot')->cn(['m-0 grid list-none gap-1 p-0', (int) $columns === 2 ? 'sm:grid-cols-2' : null, (int) $columns === 3 ? 'sm:grid-cols-3' : null]) }}>{{ $slot }}</ul>
