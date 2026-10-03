{{-- <x-nq::breadcrumb.page>Nasaq</x-nq::breadcrumb.page>  The current page: not a link, announced as the current location. --}}
<span data-slot="{{ $attributes->get('data-slot', 'breadcrumb-page') }}" aria-current="page" {{ $attributes->except('data-slot')->cn('truncate text-foreground') }}>{{ $slot }}</span>
