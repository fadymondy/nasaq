{{-- <x-nq::card.action>...</x-nq::card.action> --}}
<div data-slot="{{ $attributes->get('data-slot', 'card-action') }}" {{ $attributes->except('data-slot')->cn('col-start-2 row-span-2 row-start-1 self-start justify-self-end') }}>{{ $slot }}</div>
