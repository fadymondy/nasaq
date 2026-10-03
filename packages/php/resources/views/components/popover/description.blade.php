{{-- <x-nq::popover.description>Set the size of the layer.</x-nq::popover.description> --}}
<p data-slot="{{ $attributes->get('data-slot', 'popover-description') }}" :id="$id('nq-popover', 'description')" {{ $attributes->except('data-slot')->cn('mt-1 text-body-sm text-muted-foreground') }}>{{ $slot }}</p>
