<div data-slot="{{ $attributes->get('data-slot', 'dialog-footer') }}" {{ $attributes->except('data-slot')->cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end') }}>{{ $slot }}</div>
