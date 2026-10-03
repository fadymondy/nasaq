{{-- <x-nq::context-menu.shortcut>⌘D</x-nq::context-menu.shortcut> A keyboard hint at the inline end (always left to right). --}}
<span data-slot="{{ $attributes->get('data-slot', 'context-menu-shortcut') }}" dir="ltr" {{ $attributes->except('data-slot')->cn('ms-auto font-mono text-[11px] text-muted-foreground') }}>{{ $slot }}</span>
