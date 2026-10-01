<div data-slot="{{ $attributes->get('data-slot', 'alert-dialog-header') }}" {{ $attributes->except('data-slot')->cn('flex flex-col gap-1.5 text-start') }}>{{ $slot }}</div>
