{{-- <x-nq::breadcrumb.item> link or page </x-nq::breadcrumb.item> --}}
<li data-slot="breadcrumb-item" {{ $attributes->cn('inline-flex min-w-0 items-center gap-1.5') }}>{{ $slot }}</li>
