<h2 data-slot="{{ $attributes->get('data-slot', 'drawer-title') }}" :id="$id('nq-dialog', 'title')" {{ $attributes->except('data-slot')->cn('text-label text-foreground') }}>{{ $slot }}</h2>
