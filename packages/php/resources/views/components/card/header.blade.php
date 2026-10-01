{{-- <x-nq::card.header>...</x-nq::card.header> --}}
<div data-slot="card-header" {{ $attributes->cn('grid auto-rows-min items-start gap-1 px-4 has-data-[slot=card-action]:grid-cols-[1fr_auto]') }}>{{ $slot }}</div>
