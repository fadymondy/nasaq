<div data-slot="{{ $attributes->get('data-slot', 'dialog-header') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-1.5 pe-8 text-start') }}>{{ $slot }}</div>
