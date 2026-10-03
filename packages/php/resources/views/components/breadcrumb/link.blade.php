{{-- <x-nq::breadcrumb.link href="/projects">Projects</x-nq::breadcrumb.link> --}}
<a data-slot="{{ $attributes->get('data-slot', 'breadcrumb-link') }}" {{ $attributes->except('data-slot')->cn('truncate rounded-[3px] transition-colors duration-150 ease-nq outline-none hover:text-foreground focus-visible:outline-2 focus-visible:outline-nq-focus') }}>{{ $slot }}</a>
