{{-- <x-nq::popover.title>Dimensions</x-nq::popover.title> --}}
<h2 data-slot="{{ $attributes->get('data-slot', 'popover-title') }}" :id="$id('nq-popover', 'title')" {{ $attributes->except('data-slot')->cn('text-body-sm font-semibold text-foreground') }}>{{ $slot }}</h2>
