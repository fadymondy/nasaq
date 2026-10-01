{{-- <x-nq::engine-card.grid><x-nq::engine-card :snapshot="$a" /><x-nq::engine-card :snapshot="$b" /></x-nq::engine-card.grid>
     Responsive grid for engine cards: as many equal columns as fit, each at least 20rem wide. --}}
<div data-slot="engine-card-grid" {{ $attributes->cn('grid grid-cols-[repeat(auto-fill,minmax(min(100%,20rem),1fr))] gap-4') }}>{{ $slot }}</div>
