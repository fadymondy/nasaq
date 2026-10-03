{{-- <x-nq::card.description>...</x-nq::card.description> --}}
<div data-slot="{{ $attributes->get('data-slot', 'card-description') }}" {{ $attributes->except('data-slot')->cn('text-body-sm text-muted-foreground') }}>{{ $slot }}</div>
