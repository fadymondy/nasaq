{{-- <x-nq::card.content>...</x-nq::card.content> --}}
<div data-slot="{{ $attributes->get('data-slot', 'card-content') }}" {{ $attributes->except('data-slot')->cn('px-4') }}>{{ $slot }}</div>
