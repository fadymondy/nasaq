{{-- <x-nq::dropdown-menu.shortcut>⌘D</x-nq::dropdown-menu.shortcut> A keyboard hint at the inline end (always left to right). --}}
<span data-slot="{{ $attributes->get('data-slot', 'dropdown-menu-shortcut') }}" dir="ltr" {{ $attributes->except('data-slot')->cn('ms-auto font-mono text-[11px] text-muted-foreground') }}>{{ $slot }}</span>
