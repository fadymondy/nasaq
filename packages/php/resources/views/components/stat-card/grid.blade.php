{{-- <x-nq::stat-card.grid> <x-nq::stat-card ... /> ... </x-nq::stat-card.grid>
     Responsive grid for stat cards: as many equal columns as fit, each at least 14rem wide. --}}
<div data-slot="stat-grid" {{ $attributes->cn('grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-3') }}>{{ $slot }}</div>
