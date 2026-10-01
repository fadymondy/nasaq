{{-- <x-nq::table.caption>Hours per issue</x-nq::table.caption> --}}
<caption data-slot="{{ $attributes->get('data-slot', 'table-caption') }}" {{ $attributes->except('data-slot')->cn('mt-3 text-caption text-muted-foreground') }}>{{ $slot }}</caption>
