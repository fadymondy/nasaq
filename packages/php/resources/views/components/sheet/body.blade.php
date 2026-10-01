<div data-slot="{{ $attributes->get('data-slot', 'sheet-body') }}" {{ $attributes->except('data-slot')->cn('min-h-0 flex-1 overflow-y-auto overscroll-contain') }}>{{ $slot }}</div>
