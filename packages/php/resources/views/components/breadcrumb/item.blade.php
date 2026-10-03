{{-- <x-nq::breadcrumb.item> link or page </x-nq::breadcrumb.item> --}}
<li data-slot="{{ $attributes->get('data-slot', 'breadcrumb-item') }}" {{ $attributes->except('data-slot')->cn('inline-flex min-w-0 items-center gap-1.5') }}>{{ $slot }}</li>
