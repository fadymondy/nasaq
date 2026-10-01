{{-- <x-nq::breadcrumb.list> item, separator, item … </x-nq::breadcrumb.list> --}}
<ol data-slot="{{ $attributes->get('data-slot', 'breadcrumb-list') }}" {{ $attributes->except('data-slot')->cn('flex min-w-0 flex-wrap items-center gap-1.5 text-body-sm text-muted-foreground') }}>{{ $slot }}</ol>
