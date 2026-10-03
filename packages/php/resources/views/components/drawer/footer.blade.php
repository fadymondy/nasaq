<div data-slot="{{ $attributes->get('data-slot', 'drawer-footer') }}" {{ $attributes->except('data-slot')->cn('flex items-center gap-2 border-t border-border px-4 py-3') }}>{{ $slot }}</div>
