<div data-slot="{{ $attributes->get('data-slot', 'sheet-header') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-1 border-b border-border px-4 py-3.5 pe-12') }}>{{ $slot }}</div>
