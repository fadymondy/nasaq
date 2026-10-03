{{-- <x-nq::plugin-card.grid> <x-nq::plugin-card :plugin="$p" /> ... </x-nq::plugin-card.grid>
     A responsive grid for plugin cards: as many 18rem columns as fit. --}}
<div data-slot="{{ $attributes->get('data-slot', 'plugin-card-grid') }}" {{ $attributes->except('data-slot')->cn('grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-4') }}>{{ $slot }}</div>
