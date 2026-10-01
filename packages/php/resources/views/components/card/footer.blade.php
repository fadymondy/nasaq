{{-- <x-nq::card.footer>...</x-nq::card.footer> --}}
<div data-slot="{{ $attributes->get('data-slot', 'card-footer') }}" {{ $attributes->except('data-slot')->cn('flex items-center gap-2 px-4') }}>{{ $slot }}</div>
