<h2 data-slot="{{ $attributes->get('data-slot', 'dialog-title') }}" :id="$id('nq-dialog', 'title')" {{ $attributes->except('data-slot')->cn('text-h3 text-foreground') }}>{{ $slot }}</h2>
